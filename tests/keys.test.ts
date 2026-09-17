import test from "node:test";
import assert from "node:assert/strict";
import { getApiKeys, hasLiveAI, createJSONGenerator } from "../server/ai.js";
import type { GenerateContentResponse } from "@google/genai";

const response = { text: "{}" } as GenerateContentResponse;
test("legacy key configuration is accepted without quota-bypass rotation", () => {
  const saved = {
    key: process.env.GEMINI_API_KEY,
    keys: process.env.GEMINI_API_KEYS,
  };
  try {
    process.env.GEMINI_API_KEYS = "alpha, beta";
    process.env.GEMINI_API_KEY = "beta; gamma";
    assert.deepEqual(getApiKeys(), ["alpha", "beta", "gamma"]);
    assert.equal(hasLiveAI(), true);
    delete process.env.GEMINI_API_KEYS;
    delete process.env.GEMINI_API_KEY;
    assert.equal(hasLiveAI(), false);
  } finally {
    if (saved.key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = saved.key;
    if (saved.keys === undefined) delete process.env.GEMINI_API_KEYS;
    else process.env.GEMINI_API_KEYS = saved.keys;
  }
});
test("provider allows only one transient retry within one total deadline", async () => {
  let now = 0;
  const timeouts: number[] = [];
  const gateway = createJSONGenerator(
    async (request) => {
      timeouts.push(request.config!.httpOptions!.timeout!);
      if (timeouts.length === 1)
        throw Object.assign(new Error("private provider body"), {
          status: 503,
        });
      return response;
    },
    {
      timeoutMs: 75000,
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    },
  );
  assert.equal(await gateway.generate("evidence", {}), response);
  assert.deepEqual(timeouts, [75000, 74200]);
  assert.equal(gateway.stats().requests, 2);
  assert.equal(gateway.stats().retries, 1);

  const failing = createJSONGenerator(
    async () => {
      throw Object.assign(new Error("private payload"), { status: 503 });
    },
    { sleep: async () => {} },
  );
  await assert.rejects(failing.generate("evidence", {}), /request budget/);
  assert.equal(failing.stats().requests, 2);
});
test("429 imposes a shared cooldown with zero immediate retries or key rotation", async () => {
  let now = 0;
  let calls = 0;
  const gateway = createJSONGenerator(
    async () => {
      calls++;
      throw Object.assign(
        new Error(
          JSON.stringify({
            error: {
              message: "PRIVATE",
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.RetryInfo",
                  retryDelay: "120s",
                },
              ],
            },
          }),
        ),
        { status: 429 },
      );
    },
    { now: () => now },
  );
  await assert.rejects(gateway.generate("one", {}), /cooldown/);
  await assert.rejects(gateway.generate("two", {}), /cooldown/);
  assert.equal(calls, 1);
  assert.equal(gateway.stats().cooldownRemainingMs, 120000);
  now = 120001;
  await assert.rejects(gateway.generate("three", {}), /cooldown/);
  assert.equal(calls, 2);
});
test("auth and network failures do not retry or expose provider content", async () => {
  for (const status of [400, 401, 403, 404, undefined]) {
    const gateway = createJSONGenerator(async () => {
      throw Object.assign(new Error("PRIVATE_EVIDENCE_AND_SECRET"), { status });
    });
    await assert.rejects(
      gateway.generate("one", {}),
      (error: Error) => !error.message.includes("PRIVATE"),
    );
    assert.equal(gateway.stats().requests, 1);
    assert.equal(gateway.stats().active, 0);
  }
});
test("provider calls are bounded to two while queued calls eventually run", async () => {
  const releases: Array<() => void> = [];
  let running = 0,
    peak = 0;
  const gateway = createJSONGenerator(async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise<void>((resolve) => releases.push(resolve));
    running--;
    return response;
  });
  const jobs = Array.from({ length: 4 }, () =>
    gateway.generate("evidence", {}),
  );
  assert.equal(gateway.stats().active, 2);
  assert.equal(gateway.stats().queued, 2);
  releases.shift()!();
  await new Promise((resolve) => setImmediate(resolve));
  releases.shift()!();
  await new Promise((resolve) => setImmediate(resolve));
  releases.shift()!();
  releases.shift()!();
  await Promise.all(jobs);
  assert.equal(peak, 2);
  assert.equal(gateway.stats().active, 0);
  assert.equal(gateway.stats().queued, 0);
});
