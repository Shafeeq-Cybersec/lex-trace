import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { StorageEngine } from "../server/storage.js";

function removeTestDirectory(directory: string) {
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
  assert.ok(path.basename(resolved).startsWith("trace-security-"));
  rmSync(resolved, { recursive: true, force: true });
}

async function withServer(run: (base: string) => Promise<void>) {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-security-"));
  const port = 44000 + Math.floor(Math.random() * 2000);
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["dist-server/server/index.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      NODE_ENV: "production",
      TRACE_DATA_DIR: dir,
      TRACE_SESSION_SECRET: "security-test-secret-is-not-a-production-secret",
      TRACE_PUBLIC_ORIGIN: "https://trace.example.test/",
      TRACE_RELEASE: "security-test",
      RENDER_GIT_COMMIT: "",
      GEMINI_API_KEY: "",
      GEMINI_API_KEYS: "",
      GOOGLE_API_KEY: "",
    },
    stdio: "ignore",
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        ready = (await fetch(base + "/health")).ok;
      } catch {
        /* Server is starting. */
      }
      if (ready) break;
      if (server.exitCode !== null)
        throw new Error("Security test server did not start.");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, "Security test server became ready");
    await run(base);
  } finally {
    server.kill();
    await new Promise<void>((resolve) => {
      if (server.exitCode !== null) resolve();
      else server.once("exit", () => resolve());
    });
    removeTestDirectory(dir);
  }
}

async function session(base: string) {
  const initial = await fetch(base + "/api/capabilities");
  const setCookie = initial.headers.get("set-cookie")!;
  const cookie = setCookie.split(";")[0];
  const request = (route: string, options: RequestInit = {}) =>
    fetch(base + route, {
      ...options,
      headers: {
        Origin: "https://trace.example.test",
        "X-Trace-Request": "1",
        Cookie: cookie,
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
  return { request, setCookie, cookie };
}

test("production requests enforce configured origin, private cookies and redacted errors", async () => {
  await withServer(async (base) => {
    const a = await session(base);
    const b = await session(base);
    for (const attribute of [
      "HttpOnly",
      "Secure",
      "SameSite=Strict",
      "Path=/",
    ]) {
      assert.ok(a.setCookie.includes(attribute), attribute);
    }
    const created = await a.request("/api/cases", {
      method: "POST",
      body: '{"title":"Private case"}',
    });
    assert.equal(created.status, 200);
    const { case: c } = await created.json();
    assert.equal(c.ownerId, undefined);
    assert.equal((await b.request(`/api/case/${c.id}`)).status, 404);
    const tampered =
      a.cookie.slice(0, -1) + (a.cookie.endsWith("x") ? "y" : "x");
    assert.equal(
      (await a.request(`/api/case/${c.id}`, { headers: { Cookie: tampered } }))
        .status,
      404,
    );

    const headerVariations: Record<string, string>[] = [
      { Origin: "https://attacker.example" },
      { Origin: "https://trace.example.test.attacker.example" },
      { Origin: "null" },
      { Origin: "https://trace.example.test", "X-Trace-Request": "0" },
      { Origin: "https://attacker.example", Host: "attacker.example" },
    ];
    for (const headers of headerVariations) {
      assert.equal(
        (await a.request("/api/cases", { method: "POST", body: "{}", headers }))
          .status,
        403,
      );
    }
    assert.equal(
      (
        await fetch(base + "/api/cases", {
          method: "POST",
          headers: { Cookie: a.cookie, "X-Trace-Request": "1" },
        })
      ).status,
      403,
    );

    const malformed = await a.request("/api/cases", {
      method: "POST",
      body: '{"PRIVATE_DOCUMENT_VALUE": invalid',
    });
    assert.equal(malformed.status, 400);
    assert.match(malformed.headers.get("cache-control")!, /no-store/);
    assert.equal(malformed.headers.get("x-content-type-options"), "nosniff");
    const failure = await malformed.json();
    assert.match(failure.error, /not valid JSON/);
    assert.ok(!JSON.stringify(failure).includes("PRIVATE_DOCUMENT_VALUE"));
    assert.equal(failure.requestId, malformed.headers.get("x-request-id"));
    const oversized = await a.request("/api/cases", {
      method: "POST",
      body: JSON.stringify({ title: "x".repeat(30000) }),
    });
    assert.equal(oversized.status, 413);
    assert.ok(!(await oversized.text()).includes("x".repeat(100)));
    const health = await (await a.request("/api/health")).json();
    assert.equal(health.release, "security-test");
    assert.equal(health.aiConfigured, false);
  });
});

test("source responses are inert, owner scoped and removed with their case", async () => {
  await withServer(async (base) => {
    const a = await session(base);
    const b = await session(base);
    const c = (
      await (
        await a.request("/api/cases", { method: "POST", body: "{}" })
      ).json()
    ).case;
    const text =
      "<script>window.PRIVATE_VALUE='test';</script> My disputed cleaning deduction is INR 500.";
    const added = await a.request(`/api/case/${c.id}/statement`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    assert.equal(added.status, 202);
    const { jobId } = await added.json();
    for (let attempt = 0; attempt < 30; attempt++) {
      const job = await (
        await a.request(`/api/case/${c.id}/jobs/${jobId}`)
      ).json();
      if (job.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const data = (await (await a.request(`/api/case/${c.id}`)).json()).case;
    assert.equal(data.activeJobId, null);
    const source = data.sources[0];
    const route = `/api/case/${c.id}/sources/${source.id}/file`;
    const original = await a.request(route);
    assert.equal(original.status, 200);
    assert.match(original.headers.get("content-type")!, /^text\/plain/);
    assert.match(original.headers.get("content-security-policy")!, /sandbox/);
    assert.equal(original.headers.get("x-content-type-options"), "nosniff");
    assert.match(original.headers.get("cache-control")!, /no-store/);
    assert.ok((await original.text()).includes(text));
    assert.equal((await b.request(route)).status, 404);
    assert.equal(
      (await b.request(`/api/case/${c.id}/jobs/${jobId}`)).status,
      404,
    );
    assert.equal(
      (await a.request(`/api/case/${c.id}`, { method: "DELETE" })).status,
      200,
    );
    assert.equal((await a.request(route)).status, 404);
    assert.equal(
      (await a.request(`/api/case/${c.id}/jobs/${jobId}`)).status,
      404,
    );
  });
});

test("example cases obey the same storage quota as live cases", async () => {
  await withServer(async (base) => {
    const a = await session(base);
    for (let i = 0; i < 12; i++) {
      assert.equal(
        (
          await a.request("/api/case/example/load", {
            method: "POST",
            body: "{}",
          })
        ).status,
        200,
      );
    }
    const extra = await a.request("/api/case/example/load", {
      method: "POST",
      body: "{}",
    });
    assert.equal(extra.status, 429);
    assert.match((await extra.json()).error, /12 cases/);
    assert.equal((await (await a.request("/api/cases")).json()).length, 12);
  });
});

test("storage rejects identity reassignment and hides expired cases before cleanup", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-security-"));
  const db = new StorageEngine(dir);
  try {
    const a = db.createEmptyCase("owner-a");
    const b = db.createEmptyCase("owner-b");
    assert.throws(
      () => db.saveCase({ ...a, ownerId: b.ownerId }),
      /ownership cannot be changed/,
    );
    assert.equal(db.getCase(a.id)?.ownerId, "owner-a");
    db.saveFile("private-source", a.id, "text/plain", Buffer.from("private"));
    assert.equal(db.getFile("private-source", b.id), undefined);
    const job = {
      id: "private-job",
      caseId: a.id,
      generation: 1,
      status: "queued" as const,
      stage: "Queued",
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    db.saveJob(job);
    assert.throws(
      () => db.saveJob({ ...job, caseId: b.id }),
      /ownership cannot be changed/,
    );
    assert.equal(db.getJob(job.id, b.id), null);
    assert.equal(db.getJob(job.id, a.id)?.caseId, a.id);
    a.expiresAt = new Date(Date.now() - 1000).toISOString();
    db.saveCase(a);
    assert.equal(db.listCases("owner-a").length, 0);
    assert.deepEqual(db.cleanup(), [a.id]);
    assert.equal(db.getFile("private-source", a.id), undefined);
    assert.equal(db.getJob(job.id, a.id), null);
    assert.ok(db.getCase(b.id));
  } finally {
    db.close();
    removeTestDirectory(dir);
  }
});
