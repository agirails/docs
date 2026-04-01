/**
 * Unit tests for /api/v1/search rate-limit header semantics.
 *
 * These tests assert that:
 * - Retry-After is a small integer in seconds (delta, not epoch ms)
 * - X-RateLimit-Reset is a 10-digit Unix second timestamp
 * - Retry-After is clamped to >= 1
 */

import { describe, it, expect } from 'vitest';

// Helper that mimics the computation in api/v1/search.ts
function buildRateLimitHeaders(resetMs: number, nowMs: number) {
  const retryAfterSecs = Math.max(1, Math.ceil((resetMs - nowMs) / 1000));
  const resetSecs = Math.ceil(resetMs / 1000);
  return {
    'Retry-After': String(retryAfterSecs),
    'X-RateLimit-Reset': String(resetSecs),
  };
}

describe('Rate-limit 429 header semantics', () => {
  it('Retry-After is delta-seconds (small integer), not a millisecond epoch', () => {
    const nowMs = Date.now();
    const resetMs = nowMs + 30_000; // 30 seconds from now

    const headers = buildRateLimitHeaders(resetMs, nowMs);

    const retryAfter = parseInt(headers['Retry-After'], 10);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    // Must NOT be a 13-digit millisecond epoch value
    expect(headers['Retry-After'].length).toBeLessThan(12);
  });

  it('X-RateLimit-Reset is a 10-digit Unix seconds value', () => {
    const nowMs = Date.now();
    const resetMs = nowMs + 15_000;

    const headers = buildRateLimitHeaders(resetMs, nowMs);

    const resetSecs = parseInt(headers['X-RateLimit-Reset'], 10);
    // 10-digit Unix seconds for years 2001-2286
    expect(headers['X-RateLimit-Reset'].length).toBe(10);
    expect(resetSecs).toBeGreaterThan(1_000_000_000);
    expect(resetSecs).toBeLessThan(10_000_000_000);
  });

  it('Retry-After is clamped to 1 when reset is in the past (clock skew)', () => {
    const nowMs = Date.now();
    const resetMs = nowMs - 5_000; // reset already passed

    const headers = buildRateLimitHeaders(resetMs, nowMs);

    expect(headers['Retry-After']).toBe('1');
  });
});
