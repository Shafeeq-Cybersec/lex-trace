import { createHash, randomUUID } from "node:crypto";
import type {
  Finding,
  ReviewChange,
  Revision,
  Source,
  TraceCase,
} from "../shared/types.js";
import { INITIAL_FINDINGS, REVISED_FINDINGS } from "./fixtures.js";

const material = (f: Finding) =>
  JSON.stringify({
    title: f.title,
    amount: f.amount,
    currency: f.currency,
    status: f.status,
    statusLabel: f.statusLabel,
    summary: f.summary,
    claim: f.claim,
    claimant: f.claimant,
    conclusion: f.conclusion,
    evidence: f.evidence,
    claimCitation: f.claimCitation,
    gaps: f.gaps,
    limitations: f.limitations,
    timeline: f.timeline,
  });
export function computeRevisionDiff(
  previous: Finding[],
  next: Finding[],
  newSourceIds: string[],
): ReviewChange[] {
  const old = new Map(previous.map((f) => [f.id, f]));
  const current = new Map(next.map((f) => [f.id, f]));
  const unchanged = previous
    .filter(
      (f) => current.has(f.id) && material(f) === material(current.get(f.id)!),
    )
    .map((f) => `${f.title}: assessment unchanged.`);
  const result: ReviewChange[] = [];
  for (const f of next) {
    const prev = old.get(f.id);
    if (prev && material(prev) === material(f)) continue;
    const linked = [
      f.claimCitation.sourceId,
      ...f.evidence.map((e) => e.citation.sourceId),
    ];
    const causes = [
      ...new Set(linked.filter((id) => newSourceIds.includes(id))),
    ];
    result.push({
      findingId: f.id,
      kind: prev ? "changed" : "added",
      title: f.title,
      before: prev?.summary || "",
      after: f.summary,
      reason: causes.length
        ? "Updated after reviewing the newly submitted records linked below."
        : "Assessment changed after reviewing the current record. Compare its cited evidence; this change is not proof of new events.",
      sourceIds: causes,
      unchanged,
    });
  }
  for (const f of previous)
    if (!current.has(f.id))
      result.push({
        findingId: f.id,
        kind: "withdrawn",
        title: f.title,
        before: f.summary,
        after:
          "Not identified in this review. This does not establish that the party withdrew the deduction.",
        reason: "The current assessment no longer includes this issue.",
        sourceIds: [],
        unchanged,
      });
  return result;
}
export function makeRevision(
  c: TraceCase,
  findings: Finding[],
  mode: Revision["mode"],
  model: string,
): Revision {
  const prev = c.revisions.at(-1);
  const newIds = c.sources
    .filter((s) => !prev?.sourceIds.includes(s.id))
    .map((s) => s.id);
  return {
    id: randomUUID(),
    number: (prev?.number || 0) + 1,
    createdAt: new Date().toISOString(),
    generation: c.generation + 1,
    sourceIds: c.sources.map((s) => s.id),
    sourceSnapshots: structuredClone(c.sources),
    findings: structuredClone(findings),
    changes: computeRevisionDiff(prev?.findings || [], findings, newIds),
    coverage: {
      total: c.sources.length,
      reviewed: c.sources.filter((s) => s.status === "ready").length,
      unreadable: c.sources.filter((s) => s.status === "unreadable").length,
    },
    mode,
    model,
    inputHash: createHash("sha256")
      .update(
        JSON.stringify(
          c.sources.map((s) => [s.id, s.hash, s.extractionVersion]),
        ),
      )
      .digest("hex"),
  };
}
// Example mode is explicit and cannot process user evidence.
export function reconcileCase(c: TraceCase, newSource?: Source) {
  if (!c.isExample)
    throw new Error(
      "User cases require live AI assessment. Example rules cannot process real evidence.",
    );
  const copy = structuredClone(c);
  if (newSource && !copy.sources.some((s) => s.id === newSource.id))
    copy.sources.push(newSource);
  const revision = makeRevision(
    copy,
    copy.sources.some((s) => s.id === "src-8")
      ? REVISED_FINDINGS
      : INITIAL_FINDINGS,
    "example",
    "Prepared example — no AI call",
  );
  revision.financials = {
    deposit: c.deposit,
    refund: c.refund,
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
  return {
    revision,
    detectedProperty: c.property,
    detectedTenant: c.tenant,
    detectedLandlord: c.landlord,
    detectedDeposit: c.deposit,
    detectedRefund: c.refund,
    ambiguities: [],
  };
}
