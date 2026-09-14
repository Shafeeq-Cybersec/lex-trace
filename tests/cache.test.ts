import test from "node:test";
import assert from "node:assert/strict";
import { ReviewCache } from "../server/cache.js";
test("LRU refreshes hits, evicts oldest, respects TTL and isolates private case scopes", () => {
  let now = 0;
  const cache = new ReviewCache<{ value: number }>(2, 100, () => now);
  const a = cache.key("case-a", "record"),
    b = cache.key("case-b", "record"),
    c = cache.key("case-c", "record");
  assert.notEqual(a, b);
  assert.equal(cache.get(a), undefined);
  cache.set("case-a", a, { value: 1 });
  cache.set("case-b", b, { value: 2 });
  const result = cache.get(a)!;
  result.value = 99;
  assert.equal(cache.get(a)!.value, 1);
  cache.set("case-c", c, { value: 3 });
  assert.equal(cache.get(b), undefined);
  assert.equal(cache.size(), 2);
  cache.deleteScope("case-a");
  assert.equal(cache.get(a), undefined);
  now = 101;
  assert.equal(cache.get(c), undefined);
  assert.equal(cache.size(), 0);
});
test("fifty-entry capacity is enforced", () => {
  const cache = new ReviewCache<number>();
  for (let i = 0; i < 51; i++) cache.set("scope", String(i), i);
  assert.equal(cache.size(), 50);
  assert.equal(cache.get("0"), undefined);
  assert.equal(cache.get("50"), 50);
});
