// Thin optional Redis wrapper.
//
// The live game (timers, turn order, sockets) always lives in the
// in-memory store in store.ts -- that is the source of truth for a single
// running process, and Socket.IO's own semantics already assume one
// authoritative process per room's active connections.
//
// Redis is used here as a write-through persistence layer so that:
//   - room/session state survives a process restart
//   - a room code -> process mapping could be added later for horizontal
//     scaling (e.g. via Socket.IO's Redis adapter, not implemented here)
//
// If REDIS_URL is not set, every method becomes a safe no-op so local
// development works with zero external dependencies, exactly as the spec
// allows ("For development, an in-memory store is acceptable").

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

let client: Redis | null = null;

if (REDIS_URL) {
  client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });
  client.on("error", (err) => {
    // Never crash the game server because Redis hiccuped -- persistence is
    // a nice-to-have, not a requirement for gameplay to keep working.
    console.error("[redis] connection error:", err.message);
  });
  client.connect().catch((err) => {
    console.error("[redis] failed to connect, continuing without persistence:", err.message);
    client = null;
  });
}

export const redisEnabled = () => client !== null;

export async function redisSetJSON(key: string, value: unknown, ttlSeconds?: number) {
  if (!client) return;
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await client.set(key, payload, "EX", ttlSeconds);
    } else {
      await client.set(key, payload);
    }
  } catch (err) {
    console.error(`[redis] set failed for ${key}:`, err);
  }
}

export async function redisGetJSON<T>(key: string): Promise<T | null> {
  if (!client) return null;
  try {
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.error(`[redis] get failed for ${key}:`, err);
    return null;
  }
}

export async function redisDelete(key: string) {
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    console.error(`[redis] delete failed for ${key}:`, err);
  }
}
