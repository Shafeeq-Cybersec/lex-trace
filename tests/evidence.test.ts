import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  validateCitation,
  validateFile,
  extractSource,
  hashBytes,
} from "../server/ai.js";
import {
  computeRevisionDiff,
  reconcileCase,
  makeRevision,
} from "../server/reconciler.js";
import { INITIAL_FINDINGS, DEMO_CASE } from "../server/fixtures.js";

test("real PDF extraction preserves text and page locations", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf
    .addPage()
    .drawText("Security deposit INR 60000. Painting INR 12000.", { font });
  pdf.addPage().drawText("Cleaning INR 3000. Refund INR 45000.", { font });
  const bytes = Buffer.from(await pdf.save());
  const source = await extractSource(
    bytes,
    "evidence.pdf",
    "application/pdf",
    "pdf-test",
  );
  assert.equal(source.pageCount, 2);
  assert.match(source.pages[0], /60000/);
  assert.match(source.pages[1], /45000/);
  assert.equal(source.hash, hashBytes(bytes));
  assert.equal(source.extractionMethod, "native");
  assert.throws(() =>
    validateCitation(
      {
        sourceId: source.id,
        page: 1,
        quote: "Cleaning INR 3000",
        method: "native",
      },
      [source],
    ),
  );
  assert.doesNotThrow(() =>
    validateCitation(
      {
        sourceId: source.id,
        page: 2,
        quote: "Cleaning INR 3000",
        method: "native",
      },
      [source],
    ),
  );
});
test("file checks reject spoofed, empty, unsupported, HTML and oversized uploads", () => {
  for (const [bytes, name] of [
    [Buffer.from("not a PDF"), "fake.pdf"],
    [Buffer.alloc(0), "empty.txt"],
    [Buffer.from("<script>alert(1)</script>"), "record.txt"],
    [Buffer.from("anything"), "file.exe"],
    [Buffer.alloc(10 * 1024 * 1024 + 1), "large.txt"],
  ] as const)
    assert.throws(() => validateFile(bytes, name));
  assert.equal(
    validateFile(Buffer.from("Rent INR 10000"), "notice.txt"),
    "text/plain",
  );
});
test("quotes cannot cross sources, use nonexistent pages or relabel user claims", async () => {
  const s = await extractSource(
    Buffer.from("Tenant: I did not spill paint."),
    "message.txt",
    "text/plain",
    "one",
  );
  assert.throws(() =>
    validateCitation(
      { sourceId: "two", page: 1, quote: "paint", method: "native" },
      [s],
    ),
  );
  assert.throws(() =>
    validateCitation(
      { sourceId: "one", page: 2, quote: "paint", method: "native" },
      [s],
    ),
  );
  assert.throws(() =>
    validateCitation(
      { sourceId: "one", page: 1, quote: "I spilled paint", method: "native" },
      [s],
    ),
  );
  s.extractionMethod = "user";
  assert.throws(() =>
    validateCitation(
      { sourceId: "one", page: 1, quote: s.pages[0], method: "native" },
      [s],
    ),
  );
});
test("diff detects amount, summary, limitations and removed evidence independently", () => {
  for (const change of [
    (f: (typeof INITIAL_FINDINGS)[number]) => f.amount++,
    (f: (typeof INITIAL_FINDINGS)[number]) => (f.summary = "New assessment"),
    (f: (typeof INITIAL_FINDINGS)[number]) =>
      f.limitations.push("New limitation"),
    (f: (typeof INITIAL_FINDINGS)[number]) => f.evidence.pop(),
  ]) {
    const next = structuredClone(INITIAL_FINDINGS);
    change(next[0]);
    assert.equal(
      computeRevisionDiff(INITIAL_FINDINGS, next, [])[0].kind,
      "changed",
    );
  }
  assert.equal(
    computeRevisionDiff(INITIAL_FINDINGS, structuredClone(INITIAL_FINDINGS), [])
      .length,
    0,
  );
  assert.equal(
    computeRevisionDiff(INITIAL_FINDINGS, [], [])[0].kind,
    "withdrawn",
  );
});
test("revision snapshots are immutable copies and user cases cannot use example rules", () => {
  const c = structuredClone(DEMO_CASE);
  const r = makeRevision(c, c.revisions[0].findings, "example", "example");
  c.sources[0].pages[0] = "changed";
  assert.notEqual(r.sourceSnapshots[0].pages[0], "changed");
  assert.throws(() => reconcileCase({ ...c, isExample: false }));
});
