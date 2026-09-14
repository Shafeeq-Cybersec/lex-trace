import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { StorageEngine } from "../server/storage.js";
test("atomic transactions, private case lists, restart recovery and full deletion", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-test-"));
  const db = new StorageEngine(dir);
  try {
    const c = db.createEmptyCase("owner-one");
    assert.equal(db.listCases("owner-two").length, 0);
    db.saveFile(
      "source-one",
      c.id,
      "text/plain",
      Buffer.from("private evidence"),
    );
    const j = {
      id: "job-one",
      caseId: c.id,
      generation: 1,
      status: "queued" as const,
      progress: 0,
      stage: "Queued",
      createdAt: new Date().toISOString(),
    };
    c.activeJobId = j.id;
    db.transaction(() => {
      db.saveCase(c);
      db.saveJob(j);
    });
    db.recover();
    assert.equal(db.getCase(c.id)?.activeJobId, null);
    assert.equal(db.getJob(j.id)?.status, "failed");
    assert.throws(() =>
      db.transaction(() => {
        db.deleteCase(c.id);
        throw new Error("abort");
      }),
    );
    assert.ok(db.getCase(c.id));
    db.deleteCase(c.id);
    assert.equal(db.getCase(c.id), null);
    assert.equal(db.getFile("source-one"), undefined);
    assert.equal(db.getJob(j.id), null);
  } finally {
    db.close();
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(tmpdir()));
    assert.ok(path.basename(dir).startsWith("trace-test-"));
    rmSync(dir, { recursive: true, force: true });
  }
});
