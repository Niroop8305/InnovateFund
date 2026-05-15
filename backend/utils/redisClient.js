import { createClient } from "redis";

let client;
let connectingPromise;

const getClient = async () => {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (client) {
    return client;
  }

  if (!connectingPromise) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => {
      console.error("[redis] connection error:", error.message);
    });
    connectingPromise = client.connect().catch((error) => {
      console.error("[redis] connect failed:", error.message);
      client = null;
      connectingPromise = null;
      return null;
    });
  }

  await connectingPromise;
  return client;
};

export const cacheGet = async (key) => {
  const redis = await getClient();
  if (!redis) return null;
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
};

export const cacheSet = async (key, value, ttlSeconds = 60) => {
  const redis = await getClient();
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

export const cacheDel = async (keys) => {
  const redis = await getClient();
  if (!redis) return;
  const list = Array.isArray(keys) ? keys : [keys];
  if (list.length > 0) {
    await redis.del(list);
  }
};
