// lib/ratelimit.ts - İyileştirilmiş versiyon
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Farklı endpoint'ler için farklı limitler
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"), // Login/signup: 3/dakika
  analytics: true,
});

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"), // Genel API: 10/dakika
  analytics: true,
});

export const strictRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "60 s"), // Kritik işlemler: 1/dakika
  analytics: true,
});

// Helper function - IP adresi alma
export function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

// Helper function - Rate limit kontrolü
export async function checkRateLimit(
  rateLimit: Ratelimit, 
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  const result = await rateLimit.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining
  };
}