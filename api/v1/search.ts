import { Index } from '@upstash/vector';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

// Lazy-initialized clients (edge-safe)
let vectorIndex: Index | null = null;
let ratelimit: Ratelimit | null = null;

function getVectorIndex(): Index {
  if (!vectorIndex) {
    vectorIndex = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
  }
  return vectorIndex;
}

function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: false,
      prefix: 'agirails:search:rl',
    });
  }
  return ratelimit;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const INJECTION_PATTERNS = [
  /ignore.*previous.*instructions/i,
  /you are now/i,
  /new instructions/i,
  /forget.*everything/i,
  /system.*prompt/i,
  /act as/i,
  /pretend.*to.*be/i,
];

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
  });
}

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Rate limiting by IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'anonymous';

  try {
    const { success, reset } = await getRatelimit().limit(ip);
    if (!success) {
      // `reset` from Upstash SDK is a Unix timestamp in milliseconds.
      // Retry-After must be delta-seconds per RFC 9110.
      const retryAfterSecs = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return json({ error: 'Rate limit exceeded. Please slow down.' }, 429, {
        'Retry-After': String(retryAfterSecs),
        'X-RateLimit-Reset': String(Math.ceil(reset / 1000)), // Unix seconds
      });
    }
  } catch {
    // If rate limit store is unavailable, degrade gracefully
  }

  // Parse query params
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const limitParam = parseInt(url.searchParams.get('limit') ?? '5', 10);
  const type = url.searchParams.get('type') ?? 'all';

  // Validate
  if (!q.trim()) {
    return json({ error: 'Query parameter "q" is required' }, 400);
  }

  if (q.length > 500) {
    return json({ error: 'Query too long (max 500 characters)' }, 400);
  }

  if (INJECTION_PATTERNS.some(p => p.test(q))) {
    return json({ error: 'Invalid request' }, 400);
  }

  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 5 : limitParam), 20);

  // Map type filter to metadata values
  const typeFilterMap: Record<string, string> = {
    docs: 'documentation',
    aips: 'documentation',
    code: 'code',
  };
  const metadataType = typeFilterMap[type];

  try {
    const queryResult = await getVectorIndex().query({
      data: q,
      topK: limit,
      includeData: true,
      includeMetadata: true,
      ...(metadataType ? { filter: `type = '${metadataType}'` } : {}),
    });

    const results = (queryResult ?? []).map((r: any) => ({
      content: r.data ?? r.metadata?.content ?? '',
      metadata: {
        source: r.metadata?.source ?? '',
        type: r.metadata?.type ?? 'documentation',
        title: r.metadata?.title ?? '',
        ...(r.metadata?.section ? { section: r.metadata.section } : {}),
      },
      score: r.score ?? 0,
    }));

    return new Response(JSON.stringify({ results, query: q, total: results.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    console.error('[/api/v1/search] vector query error:', err);
    return json({ error: 'Search temporarily unavailable. Please try again.' }, 503);
  }
}
