type CacheEntry = { value: string; expiresAt: number };

const memory = new Map<string, CacheEntry>();

function redisUrl() {
  return process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const entry = memory.get(key);
  if (entry) {
    if (entry.expiresAt > Date.now()) {
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        memory.delete(key);
      }
    } else {
      memory.delete(key);
    }
  }

  const url = redisUrl();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url.startsWith("https://") && token) {
    try {
      const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { result?: string | null };
      if (!payload.result) return null;
      return JSON.parse(payload.result) as T;
    } catch {
      return null;
    }
  }

  return null;
}

export async function setCachedJson(key: string, value: unknown, ttlMs: number) {
  const serialized = JSON.stringify(value);
  memory.set(key, { value: serialized, expiresAt: Date.now() + ttlMs });

  const url = redisUrl();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url.startsWith("https://") && token) {
    const seconds = Math.max(1, Math.ceil(ttlMs / 1000));
    try {
      await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(serialized)}?EX=${seconds}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      // Memory cache still applies.
    }
  }
}
