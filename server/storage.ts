import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { TraceCase, Job } from "../shared/types.js";

// Single-process SQLite: originals, jobs and deletion share transaction boundaries.
export class StorageEngine {
  db: DatabaseSync;
  constructor(directory = process.env.TRACE_DATA_DIR || ".trace-v2") {
    mkdirSync(directory, { recursive: true });
    this.db = new DatabaseSync(path.join(directory, "trace.sqlite"));
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON;
      CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY, owner TEXT NOT NULL, expires TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE, mime TEXT NOT NULL, bytes BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE, data TEXT NOT NULL);`);
  }
  getCase(id: string): TraceCase | null {
    const row = this.db.prepare("SELECT data FROM cases WHERE id=?").get(id) as
      { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }
  saveCase(c: TraceCase) {
    this.db
      .prepare(
        "INSERT INTO cases VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,expires=excluded.expires",
      )
      .run(c.id, c.ownerId!, c.expiresAt, JSON.stringify(c));
  }
  createEmptyCase(ownerId: string, title = "Rental deposit review"): TraceCase {
    const c: TraceCase = {
      id: randomUUID(),
      ownerId,
      title,
      property: "",
      tenant: "",
      landlord: "",
      deposit: 0,
      refund: 0,
      currency: "INR",
      isExample: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      generation: 0,
      sources: [],
      revisions: [],
      latestRevisionId: null,
      annotations: [],
      activeJobId: null,
    };
    this.saveCase(c);
    return c;
  }
  listCases(owner: string) {
    return (
      this.db
        .prepare("SELECT data FROM cases WHERE owner=? ORDER BY rowid DESC")
        .all(owner) as { data: string }[]
    )
      .map((r) => JSON.parse(r.data) as TraceCase)
      .map((c) => ({
        id: c.id,
        title: c.title,
        property: c.property,
        isExample: c.isExample,
        updatedAt: c.revisions.at(-1)?.createdAt || c.createdAt,
      }));
  }
  saveFile(id: string, caseId: string, mime: string, bytes: Buffer) {
    this.db
      .prepare("INSERT INTO files VALUES(?,?,?,?)")
      .run(id, caseId, mime, bytes);
  }
  getFile(id: string) {
    return this.db
      .prepare("SELECT case_id,mime,bytes FROM files WHERE id=?")
      .get(id) as
      { case_id: string; mime: string; bytes: Uint8Array } | undefined;
  }
  saveJob(j: Job) {
    this.db
      .prepare(
        "INSERT INTO jobs VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(j.id, j.caseId, JSON.stringify(j));
  }
  getJob(id: string): Job | null {
    const r = this.db.prepare("SELECT data FROM jobs WHERE id=?").get(id) as
      { data: string } | undefined;
    return r ? JSON.parse(r.data) : null;
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  deleteCase(id: string) {
    this.db.prepare("DELETE FROM cases WHERE id=?").run(id);
  }
  cleanup() {
    const now = new Date().toISOString();
    const expired = this.db
      .prepare("SELECT id FROM cases WHERE expires < ?")
      .all(now) as { id: string }[];
    this.db.prepare("DELETE FROM cases WHERE expires < ?").run(now);
    return expired.map((r) => r.id);
  }
  recover() {
    for (const r of this.db.prepare("SELECT data FROM cases").all() as {
      data: string;
    }[]) {
      const c: TraceCase = JSON.parse(r.data);
      if (c.activeJobId) {
        const j = this.getJob(c.activeJobId);
        if (j) {
          j.status = "failed";
          j.error =
            "The server restarted during review. Files and your previous review are saved. Retry the review.";
          this.saveJob(j);
        }
        c.activeJobId = null;
        this.saveCase(c);
      }
    }
  }
  close() {
    this.db.close();
  }
}
export const storage = new StorageEngine();
