import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
test("API isolation, CSRF, originals, duplicates, example boundary, job serialization and deletion", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-api-"));
  const port = 33000 + Math.floor(Math.random() * 1000);
  const origin = "http://127.0.0.1:" + port;
  const server = spawn(process.execPath, ["dist-server/server/index.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      TRACE_DATA_DIR: dir,
      TRACE_PUBLIC_ORIGIN: origin,
      GEMINI_API_KEY: "",
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin + "/health")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    const client = () => {
      let cookie = "";
      return async (p: string, options: RequestInit = {}) => {
        const r = await fetch(origin + p, {
          ...options,
          headers: {
            Origin: origin,
            "X-Trace-Request": "1",
            ...(cookie ? { Cookie: cookie } : {}),
            ...(options.body && !(options.body instanceof FormData)
              ? { "Content-Type": "application/json" }
              : {}),
            ...options.headers,
          },
        });
        if (r.headers.get("set-cookie"))
          cookie = r.headers.get("set-cookie")!.split(";")[0];
        return r;
      };
    };
    const a = client(),
      b = client();
    await a("/api/capabilities");
    await b("/api/capabilities");
    const c = (
      await (
        await a("/api/cases", {
          method: "POST",
          body: '{"title":"API verification"}',
        })
      ).json()
    ).case;
    assert.equal((await b("/api/case/" + c.id)).status, 404);
    assert.equal(
      (
        await fetch(origin + "/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await a("/api/case/" + c.id + "/add-demo-addition", {
          method: "POST",
          body: "{}",
        })
      ).status,
      403,
    );
    const upload = () => {
      const f = new FormData();
      f.append(
        "files",
        new Blob(["Security deposit INR 60000. Painting INR 12000."], {
          type: "text/plain",
        }),
        "notice.txt",
      );
      return a("/api/case/" + c.id + "/upload-batch", {
        method: "POST",
        body: f,
      });
    };
    const result = await upload();
    assert.equal(result.status, 202);
    const { jobId } = await result.json();
    const simultaneous = await a("/api/case/" + c.id + "/review", {
      method: "POST",
      body: "{}",
    });
    assert.ok([409, 202].includes(simultaneous.status));
    for (let i = 0; i < 30; i++) {
      const j = await (await a("/api/case/" + c.id + "/jobs/" + jobId)).json();
      if (j.status === "failed" || j.status === "completed") break;
      await new Promise((r) => setTimeout(r, 100));
    }
    await new Promise((r) => setTimeout(r, 200));
    const data = await (await a("/api/case/" + c.id)).json();
    assert.equal(data.case.sources.length, 1);
    assert.equal(data.case.revisions.length, 0);
    const source = data.case.sources[0];
    assert.equal(
      await (
        await a("/api/case/" + c.id + "/sources/" + source.id + "/file")
      ).text(),
      "Security deposit INR 60000. Painting INR 12000.",
    );
    assert.equal(
      (await b("/api/case/" + c.id + "/sources/" + source.id + "/file")).status,
      404,
    );
    assert.equal((await a("/api/case/wrong/jobs/" + jobId)).status, 404);
    const duplicate = await upload();
    assert.equal((await duplicate.json()).jobId, null);
    const html = new FormData();
    html.append(
      "files",
      new Blob(["<html>bad</html>"], { type: "text/html" }),
      "bad.html",
    );
    assert.equal(
      (
        await a("/api/case/" + c.id + "/upload-batch", {
          method: "POST",
          body: html,
        })
      ).status,
      400,
    );
    assert.equal(
      (await a("/api/case/" + c.id, { method: "DELETE" })).status,
      200,
    );
    assert.equal(
      (await a("/api/case/" + c.id + "/sources/" + source.id + "/file")).status,
      404,
    );
    assert.equal((await a("/api/case/" + c.id + "/jobs/" + jobId)).status, 404);
    assert.equal((await a("/api/health")).status, 200);
    assert.equal((await fetch(origin + "/")).status, 200);
  } finally {
    server.kill();
    await new Promise<void>((resolve) => {
      if (server.exitCode !== null) resolve();
      else server.once("exit", () => resolve());
    });
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(tmpdir()));
    assert.ok(path.basename(dir).startsWith("trace-api-"));
    rmSync(dir, { recursive: true, force: true });
  }
});
