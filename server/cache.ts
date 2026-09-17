import { createHash } from "node:crypto";

// Case scopes prevent sharing private evidence, even when document bytes match.
// Values are cloned at the boundary so callers cannot mutate cached revisions.
export class ReviewCache<T> {
  private entries = new Map<
    string,
    { value: T; expires: number; scope: string; bytes: number }
  >();
  private pending = new Map<string, { scope: string; promise: Promise<T> }>();
  private bytes = 0;
  private counters = { hits: 0, misses: 0, coalesced: 0, evictions: 0 };
  constructor(
    private limit = 50,
    private ttlMs = 3_600_000,
    private clock = Date.now,
    private maxBytes = 16 * 1024 * 1024,
  ) {
    if (limit < 1 || ttlMs <= 0 || maxBytes < 1)
      throw new Error("Cache limits must be positive.");
  }
  key(scope: string, input: string) {
    return scope + ":" + createHash("sha256").update(input).digest("hex");
  }
  private remove(key: string) {
    const entry = this.entries.get(key);
    if (entry) this.bytes -= entry.bytes;
    this.entries.delete(key);
  }
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.expires <= this.clock()) {
      this.remove(key);
      return;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return structuredClone(entry.value);
  }
  set(scope: string, key: string, value: T) {
    const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
    this.remove(key);
    this.size();
    // A single large audit must not displace every useful cached assessment.
    if (bytes > this.maxBytes) return;
    this.entries.set(key, {
      scope,
      value: structuredClone(value),
      expires: this.clock() + this.ttlMs,
      bytes,
    });
    this.bytes += bytes;
    while (this.entries.size > this.limit || this.bytes > this.maxBytes) {
      this.remove(this.entries.keys().next().value!);
      this.counters.evictions++;
    }
  }
  async getOrCreate(
    scope: string,
    key: string,
    create: () => Promise<T>,
  ): Promise<{ value: T; reused: boolean }> {
    const cached = this.get(key);
    if (cached !== undefined) {
      this.counters.hits++;
      return { value: cached, reused: true };
    }
    const existing = this.pending.get(key);
    if (existing) {
      this.counters.coalesced++;
      return { value: structuredClone(await existing.promise), reused: true };
    }
    this.counters.misses++;
    // Schedule after registration; even a synchronous failure releases the entry.
    const work = { scope, promise: Promise.resolve().then(create) };
    this.pending.set(key, work);
    try {
      const value = await work.promise;
      // Deletion invalidates in-flight work as well as completed cache entries.
      if (this.pending.get(key) === work) this.set(scope, key, value);
      return { value: structuredClone(value), reused: false };
    } finally {
      if (this.pending.get(key) === work) this.pending.delete(key);
    }
  }
  deleteScope(scope: string) {
    for (const [key, entry] of this.entries)
      if (entry.scope === scope) this.remove(key);
    for (const [key, work] of this.pending)
      if (work.scope === scope) this.pending.delete(key);
  }
  size() {
    for (const [key, entry] of this.entries)
      if (entry.expires <= this.clock()) this.remove(key);
    return this.entries.size;
  }
  stats() {
    return {
      ...this.counters,
      entries: this.size(),
      bytes: this.bytes,
      pending: this.pending.size,
    };
  }
  clear() {
    this.entries.clear();
    this.pending.clear();
    this.bytes = 0;
  }
}
