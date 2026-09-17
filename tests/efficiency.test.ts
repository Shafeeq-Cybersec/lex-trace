import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { GenerateContentResponse } from "@google/genai";
import {
  extractSource,
  runCaseReconciliation,
  getReusableRevision,
  reviewCache,
  validateCitation,
  type JSONGenerator,
} from "../server/ai.js";
import { DEMO_CASE } from "../server/fixtures.js";
const response = (value: unknown) =>
  ({
    text: JSON.stringify(value),
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 30 },
  }) as GenerateContentResponse;
async function inputCase() {
  return {
    ...structuredClone(DEMO_CASE),
    id: randomUUID(),
    isExample: false,
    generation: 0,
    latestRevisionId: null,
    sources: [
      await extractSource(
        Buffer.from(
          "Landlord: Cleaning deduction INR 3000. Invoice has not been supplied.",
        ),
        "deductions.txt",
        "text/plain",
        "record",
      ),
    ],
    revisions: [],
    annotations: [],
  };
}
const quote = {
  sourceId: "record",
  page: 1,
  quote: "Landlord: Cleaning deduction INR 3000.",
  method: "native",
};
const output = {
  overview: "A cleaning deduction is stated, but no invoice was submitted.",
  deposit: null,
  refund: null,
  depositCitation: null,
  refundCitation: null,
  findings: [
    {
      id: "cleaning",
      title: "Cleaning",
      amount: 3000,
      status: "incomplete",
      statusLabel: "Invoice needed",
      summary:
        "The landlord states a cleaning deduction. An invoice is not supplied in this record.",
      claim: "Cleaning deduction INR 3000.",
      claimant: "Landlord",
      claimCitation: quote,
      evidence: [],
      conclusion: "The stated amount can be traced to the submitted notice.",
      limitations: [
        "A stated charge does not establish that cleaning occurred.",
      ],
      gaps: [
        {
          title: "Cleaning invoice",
          reason: "An invoice could identify the work and amount billed.",
        },
      ],
    },
  ],
};
test("two-stage review coalesces duplicate concurrent requests and reuses unchanged evidence with zero extra calls", async () => {
  reviewCache.clear();
  const c = await inputCase();
  let calls = 0;
  const generate: JSONGenerator = async () => {
    calls++;
    await new Promise((resolve) => setImmediate(resolve));
    return response(calls === 1 ? output : { valid: true, reasons: [] });
  };
  const [first, concurrent] = await Promise.all([
    runCaseReconciliation(c, generate),
    runCaseReconciliation(c, generate),
  ]);
  assert.equal(calls, 2);
  assert.deepEqual(first.findings, concurrent.findings);
  assert.equal(concurrent.audit!.inputTokens, 0);
  const next = {
    ...c,
    revisions: [first],
    latestRevisionId: first.id,
    generation: 1,
  };
  assert.ok(getReusableRevision(next));
  const again = await runCaseReconciliation(next, async () => {
    throw new Error("An unchanged review must not call AI.");
  });
  assert.equal(again.audit!.inputTokens, 0);
  assert.deepEqual(again.changes, []);
  again.findings[0].summary = "mutated by caller";
  assert.notEqual(
    getReusableRevision(next)!.findings[0].summary,
    "mutated by caller",
  );
  next.sources[0].pages[0] += " New record information.";
  assert.equal(getReusableRevision(next), undefined);
  let changedCalls = 0;
  await runCaseReconciliation(next, async () =>
    response(++changedCalls === 1 ? output : { valid: true, reasons: [] }),
  );
  assert.equal(changedCalls, 2);
});
test("invalid structured or semantic output is never cached or published", async () => {
  for (const invalid of ["schema", "citation", "semantic", "verifier"]) {
    reviewCache.clear();
    const c = await inputCase();
    let calls = 0;
    const proposed = structuredClone(output);
    if (invalid === "citation")
      proposed.findings[0].claimCitation.quote = "An invented quotation.";
    const generate: JSONGenerator = async () => {
      calls++;
      if (calls === 1) return response(invalid === "schema" ? {} : proposed);
      return response(
        invalid === "verifier"
          ? {}
          : { valid: false, reasons: ["Unsupported speaker inference."] },
      );
    };
    await assert.rejects(runCaseReconciliation(c, generate));
    assert.equal(reviewCache.size(), 0);
    assert.equal(c.revisions.length, 0);
    assert.equal(calls, invalid === "schema" || invalid === "citation" ? 1 : 2);
  }
});
test("citation validation rejects whitespace and noninteger page anchors", async () => {
  const c = await inputCase();
  for (const changed of [
    { quote: "   " },
    { page: 1.5 },
    { page: NaN },
    { page: Infinity },
    { page: 0 },
  ])
    assert.throws(() =>
      validateCitation({ ...quote, ...changed, method: "native" }, c.sources),
    );
});
test("native short-text and blank PDF pages require no model call", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText("Rent paid.", { font });
  pdf.addPage();
  const source = await extractSource(
    Buffer.from(await pdf.save()),
    "short.pdf",
    "application/pdf",
    "short",
    async () => {
      throw new Error("Native PDF must not use OCR.");
    },
  );
  assert.equal(source.extractionMethod, "native");
  assert.equal(source.pageCount, 2);
  assert.match(source.pages[0], /Rent paid/);
  assert.equal(source.pages[1], "");
});
test("mixed PDF sends only image pages for OCR and preserves native text and page numbering", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf
    .addPage()
    .drawText("Native original text must be preserved exactly.", { font });
  const png = await pdf.embedPng(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6FwkAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  pdf.addPage().drawImage(png, { width: 100, height: 100 });
  pdf.addPage();
  let calls = 0;
  const source = await extractSource(
    Buffer.from(await pdf.save()),
    "mixed.pdf",
    "application/pdf",
    "mixed",
    async (_prompt, _schema, inline) => {
      calls++;
      const subset = await PDFDocument.load(
        Buffer.from(inline!.data, "base64"),
      );
      assert.equal(subset.getPageCount(), 1);
      return response({ pages: ["AI transcribed test page."] });
    },
  );
  assert.equal(calls, 1);
  assert.equal(source.pageCount, 3);
  assert.match(source.pages[0], /Native original/);
  assert.equal(source.pages[1], "AI transcribed test page.");
  assert.equal(source.pages[2], "");
  assert.equal(source.extractionMethod, "transcription");
});
