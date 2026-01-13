// src/lib/cache.ts
type Entry<T> = { value: T; ts: number; ttl: number };

declare global {
  // eslint-disable-next-line no-var
  var __WNRSERVERCACHE: Map<string, Entry<any>> | undefined;
}
if (!globalThis.__WNRSERVERCACHE) {
  globalThis.__WNRSERVERCACHE = new Map();
}

export function getServerCache<T>(key: string, ttlMs: number): T | null {
  const m = globalThis.__WNRSERVERCACHE!;
  const e = m.get(key) as Entry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.ts > e.ttl) {
    m.delete(key);
    return null;
  }
  return e.value;
}

export function setServerCache<T>(key: string, value: T, ttlMs: number) {
  const m = globalThis.__WNRSERVERCACHE!;
  m.set(key, { value, ts: Date.now(), ttl: ttlMs });
}
