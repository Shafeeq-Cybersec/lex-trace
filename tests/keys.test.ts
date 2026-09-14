import test from "node:test";
import assert from "node:assert/strict";
import {
  getApiKeys,
  maskKey,
  getOrderedApiKeys,
  markKeyRateLimited,
  hasLiveAI,
} from "../server/ai.js";

test("multi-key pool parses single, comma-separated, and distinct keys correctly", () => {
  const origKey = process.env.GEMINI_API_KEY;
  const origKeys = process.env.GEMINI_API_KEYS;
  try {
    process.env.GEMINI_API_KEY = "key_alpha, key_beta; key_gamma\nkey_delta";
    delete process.env.GEMINI_API_KEYS;
    const keys = getApiKeys();
    assert.deepEqual(keys, ["key_alpha", "key_beta", "key_gamma", "key_delta"]);
    assert.equal(hasLiveAI(), true);

    // Both GEMINI_API_KEYS and GEMINI_API_KEY with deduplication
    process.env.GEMINI_API_KEYS = "key_one, key_two";
    process.env.GEMINI_API_KEY = "key_two, key_three";
    assert.deepEqual(getApiKeys(), ["key_one", "key_two", "key_three"]);
  } finally {
    process.env.GEMINI_API_KEY = origKey;
    process.env.GEMINI_API_KEYS = origKeys;
  }
});

test("maskKey protects sensitive API key material", () => {
  assert.equal(
    maskKey("sample_long_secret_key_5678"),
    "...5678",
  );
  assert.equal(maskKey("short"), "...");
});

test("markKeyRateLimited rotates active key and orders cooling keys appropriately", () => {
  const origKey = process.env.GEMINI_API_KEY;
  const origKeys = process.env.GEMINI_API_KEYS;
  try {
    process.env.GEMINI_API_KEY = "pool_key_1, pool_key_2, pool_key_3";
    delete process.env.GEMINI_API_KEYS;

    const initialOrder = getOrderedApiKeys();
    assert.equal(initialOrder[0], "pool_key_1");

    // Rate-limit the first key with 10s cooldown
    markKeyRateLimited("pool_key_1", 10000);

    const afterFirstLimit = getOrderedApiKeys();
    // pool_key_2 should now be at the front, with pool_key_1 pushed behind available keys
    assert.equal(afterFirstLimit[0], "pool_key_2");
    assert.equal(afterFirstLimit[1], "pool_key_3");
    assert.equal(afterFirstLimit[2], "pool_key_1");

    // Rate-limit the second key with 5s cooldown
    markKeyRateLimited("pool_key_2", 5000);
    const afterSecondLimit = getOrderedApiKeys();
    assert.equal(afterSecondLimit[0], "pool_key_3");
  } finally {
    process.env.GEMINI_API_KEY = origKey;
    process.env.GEMINI_API_KEYS = origKeys;
  }
});
