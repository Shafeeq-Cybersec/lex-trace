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

test("concurrent cache work is deduplicated; scope deletion prevents repopulation", async () => {
  const cache = new ReviewCache<{ result: number }>();
  const key = cache.key("one", "record");
  let calls = 0;
  let release!: (value: { result: number }) => void;
  const create = async () => {
    calls++;
    return new Promise<{ result: number }>((resolve) => {
      release = resolve;
    });
  };
  const a = cache.getOrCreate("one", key, create);
  const b = cache.getOrCreate("one", key, create);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  cache.deleteScope("one");
  release({ result: 1 });
  const [first, shared] = await Promise.all([a, b]);
  assert.equal(first.reused, false);
  assert.equal(shared.reused, true);
  assert.equal(cache.size(), 0);
  first.value.result = 9;
  assert.equal(shared.value.result, 1);
  assert.equal(cache.stats().pending, 0);
  await assert.rejects(
    cache.getOrCreate("one", key, async () => {
      throw new Error("invalid review");
    }),
  );
  assert.equal(cache.size(), 0);
  assert.equal(cache.stats().pending, 0);
});
test("cache evicts by retained bytes as well as entry count", () => {
  const cache = new ReviewCache<string>(50, 1000, Date.now, 20);
  cache.set("case", "one", "1234567890");
  cache.set("case", "two", "1234567890");
  assert.equal(cache.get("one"), undefined);
  assert.equal(cache.size(), 1);
  assert.ok(cache.stats().bytes <= 20);
  cache.set("case", "huge", "x".repeat(100));
  assert.equal(cache.get("huge"), undefined);
  cache.clear();
  assert.equal(cache.stats().bytes, 0);
});
