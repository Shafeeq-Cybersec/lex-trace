import test from "node:test";
import assert from "node:assert";
import {
  DEMO_CASE,
  LIVE_ADDITION_SOURCE,
  INITIAL_FINDINGS,
  REVISED_FINDINGS,
} from "../server/fixtures.js";
import { reconcileCase, computeRevisionDiff } from "../server/reconciler.js";

test("Initial demo case contains 7 sources and 2 disputed deductions", () => {
  assert.strictEqual(DEMO_CASE.sources.length, 7);
  assert.strictEqual(DEMO_CASE.revisions[0].findings.length, 2);

  const repainting = DEMO_CASE.revisions[0].findings.find(
    (f) => f.id === "fnd-repainting",
  );
  assert.ok(repainting);
  assert.strictEqual(repainting?.amount, 12000);
  assert.strictEqual(repainting?.status, "conflict");

  const cleaning = DEMO_CASE.revisions[0].findings.find(
    (f) => f.id === "fnd-cleaning",
  );
  assert.ok(cleaning);
  assert.strictEqual(cleaning?.amount, 3000);
  assert.strictEqual(cleaning?.status, "incomplete");
});

test("Adding tenant packing message creates Revision 2 with qualified repainting finding", () => {
  const { revision: rev2 } = reconcileCase(DEMO_CASE, LIVE_ADDITION_SOURCE);

  assert.strictEqual(rev2.number, 2);
  assert.strictEqual(rev2.coverage.total, 8);
  assert.strictEqual(rev2.coverage.reviewed, 8);

  // Bedroom repainting is updated to qualified
  const repainting = rev2.findings.find((f) => f.id === "fnd-repainting");
  assert.ok(repainting);
  assert.strictEqual(repainting?.status, "qualified");
  assert.ok(repainting?.summary.includes("later reported incident"));
  assert.ok(
    repainting?.conclusion.includes(
      "disagreement about the check-in condition remains valid",
    ),
  );

  // Cleaning deduction remains stable and identical
  const cleaning = rev2.findings.find((f) => f.id === "fnd-cleaning");
  assert.ok(cleaning);
  assert.strictEqual(cleaning?.amount, 3000);
  assert.strictEqual(cleaning?.status, "incomplete");

  // Changes diff explicitly highlights repainting adjustment and unchanged cleaning
  assert.ok(rev2.changes.length > 0);
  const change = rev2.changes.find((c) => c.findingId === "fnd-repainting");
  assert.ok(change);
  assert.strictEqual(change?.kind, "changed");
  assert.ok(change?.unchanged?.some((u) => u.includes("Deep Cleaning Fee")));
});

test("Revision diff calculation detects additions and changes accurately", () => {
  const diff = computeRevisionDiff(INITIAL_FINDINGS, REVISED_FINDINGS, [
    "src-8",
  ]);
  assert.strictEqual(diff.length, 1);
  assert.strictEqual(diff[0].findingId, "fnd-repainting");
  assert.strictEqual(diff[0].kind, "changed");
});
