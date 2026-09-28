interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private maxStoreSize = 10000;

  /**
   * Check rate limit for a given key.
   * @param key Unique identifier (IP, user token, sessionId, etc.)
   * @param limit Max requests allowed in the window
   * @param windowMs Window duration in milliseconds
   */
  check(key: string, limit: number, windowMs: number): {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();

    // Occasional cleanup if map grows too large
    if (this.store.size > this.maxStoreSize) {
      this.cleanup(now);
    }

    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        resetTime,
      };
    }

    if (record.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count += 1;
    return {
      success: true,
      limit,
      remaining: limit - record.count,
      resetTime: record.resetTime,
    };
  }

  private cleanup(now: number) {
    for (const [k, v] of this.store.entries()) {
      if (now > v.resetTime) {
        this.store.delete(k);
      }
    }
  }
}

export const rateLimiter = new MemoryRateLimiter();

/**
 * Helper to extract client IP from Next.js request.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
