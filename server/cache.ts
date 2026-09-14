import { createHash } from "node:crypto";
// Private case scope is part of every key. Cache only fully validated reviews.
export class ReviewCache<T> {
  private entries = new Map<
    string,
    { value: T; expires: number; scope: string }
  >();
  constructor(
    private limit = 50,
    private ttlMs = 3600000,
    private clock = Date.now,
  ) {}
  key(scope: string, input: string) {
    return scope + ":" + createHash("sha256").update(input).digest("hex");
  }
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    if (entry.expires <= this.clock()) return;
    this.entries.set(key, entry);
    return structuredClone(entry.value);
  }
  set(scope: string, key: string, value: T) {
    this.entries.delete(key);
    this.entries.set(key, {
      scope,
      value: structuredClone(value),
      expires: this.clock() + this.ttlMs,
    });
    while (this.entries.size > this.limit)
      this.entries.delete(this.entries.keys().next().value!);
  }
  deleteScope(scope: string) {
    for (const [key, entry] of this.entries)
      if (entry.scope === scope) this.entries.delete(key);
  }
  size() {
    for (const [key, e] of this.entries)
      if (e.expires <= this.clock()) this.entries.delete(key);
    return this.entries.size;
  }
  clear() {
    this.entries.clear();
  }
}
