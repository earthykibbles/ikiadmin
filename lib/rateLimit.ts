// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60000, maxRequests = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now > entry.resetAt) {
      // Create new window
      this.entries.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.resetAt) {
        this.entries.delete(key);
      }
    }
  }
}

// Create rate limiters for different endpoints
export const analyticsRateLimiter = new RateLimiter(60000, 5); // 5 requests per minute
export const usersRateLimiter = new RateLimiter(60000, 20); // 20 requests per minute
export const exploreRateLimiter = new RateLimiter(60000, 10); // 10 requests per minute

// Helper to get client IP from request
export function getClientId(request: Request): string {
  // Try to get IP from various headers (for production behind proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default key (for development)
  return 'default';
}
