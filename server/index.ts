import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "./storage.js";
import {
  extractSource,
  hasLiveAI,
  getModelName,
  runCaseReconciliation,
  validateFile,
  hashBytes,
  reviewCache,
} from "./ai.js";
import { createInitialDemoCase, LIVE_ADDITION_SOURCE } from "./fixtures.js";
import type { Job, TraceCase, Source, Revision } from "../shared/types.js";

const production = process.env.NODE_ENV === "production";
const dir = process.env.TRACE_DATA_DIR || ".trace-v2";
let secret = process.env.TRACE_SESSION_SECRET;
if (!secret) {
  const p = path.join(dir, "session.key");
  if (!fs.existsSync(p))
    fs.writeFileSync(p, randomBytes(32).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
  secret = fs.readFileSync(p, "utf8");
}
const app = express();
if (production) app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        objectSrc: ["'self'"],
        frameSrc: ["'self'"],
        connectSrc: production ? ["'self'"] : ["'self'", "ws:"],
        upgradeInsecureRequests: production ? [] : null,
      },
    },
  }),
);
app.use(cookieParser(secret));
app.use(express.json({ limit: "24kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Wait one minute, then try again." },
  }),
);
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.locals.requestId = randomUUID();
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const allowed = process.env.TRACE_PUBLIC_ORIGIN;
    const valid = allowed
      ? origin === allowed
      : !!origin &&
        [
          "http://127.0.0.1:5173",
          "http://localhost:5173",
          `http://${req.get("host")}`,
        ].includes(origin);
    if (!valid || req.get("X-Trace-Request") !== "1") {
      res.status(403).json({
        error: "This request did not originate from the TRACE application.",
      });
      return;
    }
  }
  let owner = req.signedCookies.trace;
  if (typeof owner !== "string" || !/^[a-f0-9-]{36}$/.test(owner)) {
    owner = randomUUID();
    res.cookie("trace", owner, {
      signed: true,
      httpOnly: true,
      sameSite: "strict",
      secure: production,
      maxAge: 86400000,
    });
  }
  res.locals.owner = owner;
  next();
});
const capability = () => ({
  liveAI: hasLiveAI(),
  model: getModelName(),
  storage: "local",
  maxFiles: 12,
  maxFileMB: 10,
});
const visible = (c: TraceCase) => {
  const { ownerId, ...rest } = c;
  return rest;
};
function owned(id: string, owner: string): TraceCase {
  const c = storage.getCase(id);
  if (!c || c.ownerId !== owner || new Date(c.expiresAt).getTime() < Date.now())
    throw Object.assign(
      new Error(
        "This case is unavailable or has expired. Return to your case list.",
      ),
      { status: 404 },
    );
  return c;
}
function mutable(c: TraceCase) {
  if (c.activeJobId)
    throw Object.assign(
      new Error(
        "A review is already running. Wait for it to finish before changing this case.",
      ),
      { status: 409 },
    );
}
let active = 0;
function enqueue(c: TraceCase, exampleAddition = false): Job {
  mutable(c);
  if (active >= 2)
    throw Object.assign(
      new Error(
        "The review service is busy. Your evidence is saved. Retry shortly.",
      ),
      { status: 429 },
    );
  const job: Job = {
    id: randomUUID(),
    caseId: c.id,
    generation: c.generation + 1,
    status: "queued",
    progress: 0,
    stage: "Waiting to review the submitted evidence",
    createdAt: new Date().toISOString(),
  };
  c.activeJobId = job.id;
  storage.transaction(() => {
    storage.saveCase(c);
    storage.saveJob(job);
  });
  active++;
  setImmediate(() => void processJob(job, exampleAddition));
  return job;
}
async function processJob(job: Job, exampleAddition: boolean) {
  const start = Date.now();
  const stage = (status: Job["status"], text: string, progress: number) => {
    job.status = status;
    job.stage = text;
    job.progress = progress;
    storage.saveJob(job);
  };
  try {
    let c = storage.getCase(job.caseId);
    if (!c) return;
    if (c.isExample) {
      if (exampleAddition && !c.sources.some((s) => s.id === "src-8"))
        c.sources.push(structuredClone(LIVE_ADDITION_SOURCE));
      stage(
        "comparing",
        "Loading a prepared example comparison — no AI call",
        60,
      );
    } else {
      stage(
        "reading",
        "Reading original records and preserving source locations",
        15,
      );
      for (let offset = 0; offset < c.sources.length; offset += 2) {
        await Promise.all(
          c.sources
            .slice(offset, offset + 2)
            .map(async (source, batchIndex) => {
              const i = offset + batchIndex;
              if (source.status === "ready") return;
              const file = storage.getFile(source.id);
              if (!file)
                throw new Error(
                  "An original file is unavailable. Previous review preserved.",
                );
              try {
                c.sources[i] = await extractSource(
                  Buffer.from(file.bytes),
                  source.filename,
                  source.mime,
                  source.id,
                );
                if (source.extractionMethod === "user") {
                  c.sources[i].extractionMethod = "user";
                  c.sources[i].party = "User-provided statement";
                }
              } catch (e) {
                c.sources[i] = {
                  ...source,
                  status: "unreadable",
                  error:
                    e instanceof Error
                      ? e.message
                      : "Could not read this record.",
                };
              }
            }),
        );
        if (!storage.getCase(c.id)) return;
        storage.saveCase(c);
      }
      if (
        c.sources.reduce(
          (sum, s) => sum + (s.kind === "pdf" ? s.pageCount : 0),
          0,
        ) > 30
      )
        throw new Error(
          "The combined PDFs exceed 30 pages. Start a smaller case with the relevant pages.",
        );
      stage(
        "comparing",
        "AI is assessing claims, relationships and evidence gaps",
        55,
      );
    }
    const revision = await runCaseReconciliation(c);
    stage("checking", "Validating the new revision before publication", 95);
    const current = storage.getCase(c.id);
    if (
      !current ||
      current.activeJobId !== job.id ||
      current.generation + 1 !== job.generation
    )
      return;
    c.revisions.push(revision);
    c.latestRevisionId = revision.id;
    c.generation = revision.generation;
    c.activeJobId = null;
    if (revision.financials) {
      c.deposit = revision.financials.deposit ?? 0;
      c.refund = revision.financials.refund ?? 0;
    }
    job.status = "completed";
    job.progress = 100;
    job.stage = "New review ready";
    job.revisionId = revision.id;
    job.completedAt = new Date().toISOString();
    storage.transaction(() => {
      storage.saveCase(c!);
      storage.saveJob(job);
    });
    console.log(
      JSON.stringify({
        event: "review.completed",
        jobId: job.id,
        revisionId: revision.id,
        durationMs: Date.now() - start,
        mode: revision.mode,
        inputTokens: revision.audit?.inputTokens,
        outputTokens: revision.audit?.outputTokens,
      }),
    );
  } catch (e) {
    const c = storage.getCase(job.caseId);
    if (c) {
      job.status = "failed";
      job.error =
        e instanceof Error
          ? e.message
          : "The review could not finish. Your files and previous review are saved.";
      job.stage = "Review paused";
      job.completedAt = new Date().toISOString();
      c.activeJobId = null;
      storage.transaction(() => {
        storage.saveCase(c);
        storage.saveJob(job);
      });
    }
    console.log(
      JSON.stringify({
        event: "review.failed",
        jobId: job.id,
        durationMs: Date.now() - start,
      }),
    );
  } finally {
    active--;
  }
}
app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    aiConfigured: hasLiveAI(),
    model: getModelName(),
    cacheSize: reviewCache.size(),
    timestamp: new Date().toISOString(),
  }),
);
app.get("/api/capabilities", (_req, res) => res.json(capability()));
app.get("/api/cases", (_req, res) =>
  res.json(storage.listCases(res.locals.owner)),
);
app.post("/api/cases", (req, res) => {
  if (storage.listCases(res.locals.owner).length >= 12) {
    res.status(429).json({
      error: "You have 12 cases. Delete an old case before starting another.",
    });
    return;
  }
  const { title } = z
    .object({
      title: z.string().trim().min(1).max(120).default("Rental deposit review"),
    })
    .parse(req.body);
  res.json({ case: visible(storage.createEmptyCase(res.locals.owner, title)) });
});
app.get("/api/case/:id", (req, res) =>
  res.json({
    case: visible(owned(String(req.params.id), res.locals.owner)),
    capabilities: capability(),
  }),
);
app.post("/api/case/example/load", (_req, res) => {
  const c = createInitialDemoCase();
  c.id = randomUUID();
  c.ownerId = res.locals.owner;
  c.createdAt = new Date().toISOString();
  c.expiresAt = new Date(Date.now() + 86400000).toISOString();
  c.sources = c.sources.map((s) => ({
    ...s,
    extractionMethod: s.kind === "image" ? "observation" : "native",
  }));
  c.revisions[0].sourceSnapshots = structuredClone(c.sources);
  c.revisions[0].financials = {
    deposit: 60000,
    refund: 45000,
    depositCitation: {
      sourceId: "src-1",
      page: 1,
      quote: "INR 60,000",
      method: "native",
    },
    refundCitation: {
      sourceId: "src-7",
      page: 1,
      quote: "INR 45,000.00",
      method: "observation",
    },
  };
  storage.saveCase(c);
  res.json({ case: visible(c) });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 12, fields: 0 },
});
const uploads = rateLimit({
  windowMs: 60000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload limit reached. Wait one minute and retry." },
});
app.post(
  "/api/case/:id/upload-batch",
  uploads,
  (req, res, next) => {
    owned(String(req.params.id), res.locals.owner);
    next();
  },
  upload.array("files", 12),
  (req, res) => {
    const c = owned(String(req.params.id), res.locals.owner);
    mutable(c);
    if (c.isExample)
      throw Object.assign(
        new Error(
          "Start a live case to upload your own evidence. The example stays separate.",
        ),
        { status: 400 },
      );
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new Error("Choose at least one evidence file.");
    const existing = new Set(c.sources.map((s) => s.hash));
    const additions = files
      .map((f) => ({
        f,
        mime: validateFile(f.buffer, f.originalname),
        hash: hashBytes(f.buffer),
      }))
      .filter((x) => {
        if (existing.has(x.hash)) return false;
        existing.add(x.hash);
        return true;
      });
    if (!additions.length) {
      res.json({
        jobId: null,
        message:
          "These files are already in the case. No duplicate evidence was added.",
        case: visible(c),
      });
      return;
    }
    if (
      c.sources.length + additions.length > 12 ||
      c.sources.reduce((n, s) => n + s.size, 0) +
        additions.reduce((n, x) => n + x.f.size, 0) >
        80 * 1024 * 1024
    )
      throw new Error(
        "Case limit reached: 12 files and 80 MB total. Start a smaller case.",
      );
    if (
      c.sources.filter((s) => s.kind === "image").length +
        additions.filter((a) => a.mime.startsWith("image/")).length >
      6
    )
      throw new Error("A case can contain at most 6 images.");
    storage.transaction(() => {
      for (const { f, mime, hash } of additions) {
        const id = randomUUID();
        const name = path
          .basename(f.originalname)
          .replace(/[\x00-\x1f]/g, "")
          .slice(0, 150);
        const s: Source = {
          id,
          title: name,
          filename: name,
          mime,
          kind:
            mime === "application/pdf"
              ? "pdf"
              : mime.startsWith("image/")
                ? "image"
                : "text",
          status: "pending",
          size: f.size,
          pageCount: 0,
          addedAt: new Date().toISOString(),
          party: "Submitted record",
          description: "Waiting for extraction",
          pages: [],
          hash,
          synthetic: false,
          extractionVersion: "trace-2",
        };
        storage.saveFile(id, c.id, mime, f.buffer);
        c.sources.push(s);
      }
      storage.saveCase(c);
    });
    const job = enqueue(c);
    res.status(202).json({ jobId: job.id });
  },
);
app.post("/api/case/:id/statement", (req, res) => {
  const c = owned(String(req.params.id), res.locals.owner);
  mutable(c);
  if (c.isExample)
    throw new Error(
      "User statements belong in a live case, not the prepared example.",
    );
  const { text, title } = z
    .object({
      text: z.string().trim().min(5).max(12000),
      title: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .default("User-provided statement"),
    })
    .parse(req.body);
  if (c.sources.length >= 12)
    throw new Error("This case already contains 12 records.");
  const content =
    "User-provided information. Not independently verified.\n" + text;
  const hash = hashBytes(content);
  if (c.sources.some((s) => s.hash === hash)) {
    res.json({
      jobId: null,
      message: "This statement is already in the record.",
    });
    return;
  }
  const id = randomUUID();
  const s: Source = {
    id,
    title,
    filename: "user-statement.txt",
    mime: "text/plain",
    kind: "text",
    status: "ready",
    size: Buffer.byteLength(content),
    pageCount: 1,
    addedAt: new Date().toISOString(),
    party: "User-provided statement",
    description: "Attributed context, not independent proof.",
    pages: [content],
    hash,
    synthetic: false,
    extractionVersion: "trace-2",
    extractionMethod: "user",
  };
  storage.transaction(() => {
    storage.saveFile(id, c.id, s.mime, Buffer.from(content));
    c.sources.push(s);
    storage.saveCase(c);
  });
  res.status(202).json({ jobId: enqueue(c).id });
});
app.post("/api/case/:id/review", (req, res) => {
  const c = owned(String(req.params.id), res.locals.owner);
  if (!c.sources.length)
    throw new Error("Add evidence before requesting a review.");
  res.status(202).json({ jobId: enqueue(c).id });
});
app.post("/api/case/:id/add-demo-addition", (req, res) => {
  const c = owned(String(req.params.id), res.locals.owner);
  if (!c.isExample)
    throw Object.assign(
      new Error("Example evidence cannot be added to a live case."),
      { status: 403 },
    );
  if (c.sources.some((s) => s.id === "src-8")) {
    res.json({
      jobId: null,
      message: "The example addition is already present.",
    });
    return;
  }
  res.status(202).json({ jobId: enqueue(c, true).id });
});
app.get("/api/case/:id/jobs/:jobId", (req, res) => {
  const c = owned(String(req.params.id), res.locals.owner);
  const j = storage.getJob(String(req.params.jobId));
  if (!j || j.caseId !== c.id) {
    res.status(404).json({ error: "Job unavailable for this case." });
    return;
  }
  res.json(j);
});
app.get("/api/case/:id/sources/:sourceId/file", (req, res) => {
  const c = owned(String(req.params.id), res.locals.owner);
  const s = c.sources.find((s) => s.id === String(req.params.sourceId));
  if (!s) {
    res.status(404).json({ error: "This original source is unavailable." });
    return;
  }
  if (c.isExample) {
    res
      .type("text/plain")
      .send(
        "SYNTHETIC EXAMPLE RECORD — NOT AN ORIGINAL DOCUMENT\n\n" +
          s.pages.join("\n\n"),
      );
    return;
  }
  const file = storage.getFile(s.id);
  if (!file || file.case_id !== c.id) {
    res.status(404).json({ error: "The original file is unavailable." });
    return;
  }
  res.setHeader("Content-Type", file.mime);
  res.setHeader("Content-Disposition", "inline");
  res.send(Buffer.from(file.bytes));
});
app.delete("/api/case/:id", (req, res) => {
  const c = owned(String(req.params.id), res.locals.owner);
  mutable(c);
  storage.deleteCase(c.id);
  reviewCache.deleteScope(c.id);
  res.json({ success: true });
});
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "This operation is not available." }),
);
if (fs.existsSync(path.resolve("dist/index.html"))) {
  app.use(express.static(path.resolve("dist"), { index: false }));
  app.get("/", (_req, res) => res.sendFile(path.resolve("dist/index.html")));
}
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const e = err as { status?: number; message?: string; code?: string };
    const message =
      err instanceof multer.MulterError
        ? "Upload rejected: use at most 12 files, no larger than 10 MB each."
        : err instanceof z.ZodError
          ? "Some fields are invalid. Check the text and try again."
          : e.message ||
            "This operation could not finish. Your previous review remains available.";
    res
      .status(
        e.status ||
          (err instanceof multer.MulterError || err instanceof z.ZodError
            ? 400
            : 400),
      )
      .json({ error: message, requestId: res.locals.requestId });
  },
);
storage.cleanup();
storage.recover();
setInterval(() => {
  for (const id of storage.cleanup()) reviewCache.deleteScope(id);
}, 60000).unref();
const server = app.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () => console.log("TRACE ready on port " + (process.env.PORT || 3001)),
);
process.on("SIGTERM", () =>
  server.close(() => {
    storage.close();
    process.exit(0);
  }),
);
