// Read-only deployment verification. No case records or model calls are made.
import assert from "node:assert/strict";
import fs from "node:fs";

const origin = process.env.TRACE_TEST_ORIGIN || "http://127.0.0.1:3001";
const expectedRelease = process.env.TRACE_EXPECTED_RELEASE;
const started = Date.now();
const home = await fetch(origin, { signal: AbortSignal.timeout(90000) });
const html = await home.text();
assert.equal(home.status, 200, "Application must respond successfully");
assert.match(html, /TRACE/, "Application shell must identify TRACE");
assert.match(home.headers.get("cache-control") || "", /(?:no-cache|max-age=0)/i, "HTML must revalidate after releases");
assert.equal(home.headers.get("x-content-type-options"), "nosniff");
assert.ok(home.headers.get("content-security-policy"), "CSP must be present");
const healthResponse = await fetch(origin + "/api/health");
assert.equal(healthResponse.status, 200);
assert.match(healthResponse.headers.get("cache-control") || "", /no-store/);
const health = await healthResponse.json();
if (expectedRelease) assert.equal(health.release, expectedRelease, "Deployment has not reached the expected commit");
const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/g)].map((m) => m[1]))];
assert.ok(assets.length >= 2, "Compiled JS and CSS must be linked");
const assetsReport = await Promise.all(assets.map(async (asset) => {
  const result = await fetch(origin + asset);
  assert.equal(result.status, 200, "Asset must resolve: " + asset);
  assert.match(result.headers.get("cache-control") || "", /immutable/, "Fingerprinted assets should be cacheable");
  const body = await result.arrayBuffer();
  return { path: asset, decodedBytes: body.byteLength, encoding: result.headers.get("content-encoding") || "none" };
}));
const report = { testedAt: new Date().toISOString(), origin, release: health.release || "not reported", aiConfigured: health.aiConfigured, model: health.model, elapsedMs: Date.now() - started, assets: assetsReport, checks: ["HTML revalidation", "CSP and MIME protection", "private health response", "fingerprinted asset caching", ...(expectedRelease ? ["expected deployment commit"] : [])] };
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/release-verification.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
