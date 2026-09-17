import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { TraceCase, Job } from "../shared/types.js";

// Single-process SQLite: originals, jobs and deletion share transaction boundaries.
/**
 * Transactional storage for the single-instance prototype.
 * Keep the page cache bounded; originals are sensitive and temporary sorts stay in memory.
 */
export class StorageEngine {
  db: DatabaseSync;
  constructor(directory = process.env.TRACE_DATA_DIR || ".trace-v2") {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path.join(directory, "trace.sqlite"));
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA secure_delete = ON;
      PRAGMA cache_size = -16000;
      PRAGMA mmap_size = 0;
      PRAGMA temp_store = MEMORY;

      CREATE TABLE IF NOT EXISTS cases(
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        expires TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner);
      CREATE INDEX IF NOT EXISTS idx_cases_expires ON cases(expires);

      CREATE TABLE IF NOT EXISTS files(
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        mime TEXT NOT NULL,
        bytes BLOB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_files_case_id ON files(case_id);

      CREATE TABLE IF NOT EXISTS jobs(
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_case_id ON jobs(case_id);
    `);
  }
  getCase(id: string): TraceCase | null {
    const row = this.db
      .prepare("SELECT owner,data FROM cases WHERE id=?")
      .get(id) as { owner: string; data: string } | undefined;
    return row ? { ...JSON.parse(row.data), ownerId: row.owner } : null;
  }
  saveCase(c: TraceCase) {
    const result = this.db
      .prepare(
        "INSERT INTO cases VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,expires=excluded.expires WHERE cases.owner=excluded.owner",
      )
      .run(c.id, c.ownerId!, c.expiresAt, JSON.stringify(c));
    if (!result.changes) throw new Error("Case ownership cannot be changed.");
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
        .prepare(
          "SELECT data FROM cases WHERE owner=? AND expires>? ORDER BY rowid DESC",
        )
        .all(owner, new Date().toISOString()) as { data: string }[]
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
  getFile(id: string, caseId?: string) {
    return this.db
      .prepare(
        "SELECT case_id,mime,bytes FROM files WHERE id=? AND (? IS NULL OR case_id=?)",
      )
      .get(id, caseId ?? null, caseId ?? null) as
      { case_id: string; mime: string; bytes: Uint8Array } | undefined;
  }
  saveJob(j: Job) {
    const result = this.db
      .prepare(
        "INSERT INTO jobs VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE jobs.case_id=excluded.case_id",
      )
      .run(j.id, j.caseId, JSON.stringify(j));
    if (!result.changes) throw new Error("Job ownership cannot be changed.");
  }
  getJob(id: string, caseId?: string): Job | null {
    const r = this.db
      .prepare("SELECT data FROM jobs WHERE id=? AND (? IS NULL OR case_id=?)")
      .get(id, caseId ?? null, caseId ?? null) as { data: string } | undefined;
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
        const j = this.getJob(c.activeJobId, c.id);
        if (j) {
          j.status = "failed";
          j.error =
            "The server restarted during review. Files and your previous review are saved. Retry the review.";
          j.stage = "Review interrupted by a server restart";
          j.completedAt = new Date().toISOString();
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
