// src/lib/clientCache.ts
type Entry<T> = { value: T; ts: number; ttl: number };

declare global {
  // eslint-disable-next-line no-var
  var __WNRCLIENTCACHE: Map<string, Entry<any>> | undefined;
}
if (!globalThis.__WNRCLIENTCACHE) {
  globalThis.__WNRCLIENTCACHE = new Map();
}

export function getClientCache<T>(key: string): T | null {
  const m = globalThis.__WNRCLIENTCACHE!;
  const e = m.get(key) as Entry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.ts > e.ttl) {
    m.delete(key);
    return null;
  }
  return e.value;
}

export function setClientCache<T>(key: string, value: T, ttlMs: number) {
  const m = globalThis.__WNRCLIENTCACHE!;
  m.set(key, { value, ts: Date.now(), ttl: ttlMs });
}

export function invalidateClientCache(prefix?: string) {
  const m = globalThis.__WNRCLIENTCACHE!;
  if (!prefix) {
    m.clear();
    return;
  }
  for (const k of m.keys()) {
    if (k.startsWith(prefix)) m.delete(k);
  }
}
