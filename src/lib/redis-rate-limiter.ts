// Redis-backed rate limiter (INCR + EXPIRE, atomic via Lua) for auth-core.
// Used automatically when REDIS_URL is set and `ioredis` is installed;
// otherwise callers fall back to the in-memory limiter (single-instance only).
import type { RateLimiter } from "../../packages/auth-core/src/types";

const LUA_TAKE = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
  return 0
end
return 1
`;

export function createRedisRateLimiter(): RateLimiter | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  let client: { eval: (script: string, numKeys: number, ...args: (string | number)[]) => Promise<unknown> };
  try {
    // Lazy require so the app still runs when ioredis isn't installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require("ioredis");
    client = new IORedis(url, { maxRetriesPerRequest: 2, lazyConnect: false });
  } catch {
    console.warn("[rate-limit] REDIS_URL set but ioredis not installed — falling back to memory limiter");
    return null;
  }

  return {
    async take(key, limit, windowSec) {
      try {
        const allowed = await client.eval(LUA_TAKE, 1, `ratelimit:${key}`, limit, windowSec);
        return Number(allowed) === 1;
      } catch (error) {
        // Fail open on Redis outage (auth endpoints still have captcha/OTP),
        // but log loudly so monitoring picks it up.
        console.error("[rate-limit] redis error, allowing request:", error);
        return true;
      }
    },
  };
}
