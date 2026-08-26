// Request guards for the app's serverless endpoints.
//
// Threat being defended against, concretely: the receipt endpoint is a public URL
// that spends money on every call. Anyone who finds it can loop over it and run up
// the Gemini bill, or use it as a free AI proxy. That is not hypothetical — open
// AI proxy endpoints get found and abused within days of going live.
//
// These are best-effort defences that work today. The real fix is requiring a
// signed auth token, which lands with Supabase in Week 2 — see verifyAuth below.

/** Largest request we will even read. Receipts are photos, not videos. */
export const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Per-IP sliding-window rate limit.
 *
 * In-memory, so it resets on cold start and is per-instance rather than global.
 * That is a real limitation and it is deliberate: a shared store (Redis/Upstash)
 * is the correct answer but adds a paid dependency, and an imperfect limiter stops
 * the actual observed attack — one host hammering in a loop — while costing
 * nothing. Revisit when there is revenue to protect.
 */
const hits = new Map();

export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.start > windowMs) {
    hits.set(key, { start: now, count: 1 });
    // Opportunistic sweep so the map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
    }
    return { ok: true, remaining: limit - 1 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, retryAfter: Math.ceil((entry.start + windowMs - now) / 1000) };
  }
  return { ok: true, remaining: limit - entry.count };
}

/** Best-available client identifier behind Vercel's proxy. */
export function clientKey(req) {
  const fwd = req.headers['x-forwarded-for'];
  const ip = Array.isArray(fwd) ? fwd[0] : (fwd || '').split(',')[0].trim();
  return ip || req.headers['x-real-ip'] || 'unknown';
}

/**
 * Shared-secret check.
 *
 * Honest about what this is worth: the value ships inside the app bundle, so a
 * determined person can extract it. It is a speed bump against opportunistic
 * scanning, not authentication. Treated as one signal, never as authorisation.
 * When APP_SHARED_SECRET is unset the check is skipped rather than failing closed,
 * so a misconfigured deploy degrades to "no speed bump" rather than "app broken".
 */
export function checkAppSecret(req) {
  const expected = process.env.APP_SHARED_SECRET;
  if (!expected) return true;
  return req.headers['x-app-key'] === expected;
}

/**
 * Real authorisation — a Supabase-issued JWT.
 *
 * Returns { ok, userId }. Until SUPABASE_JWT_SECRET is configured (Week 2) this
 * returns ok with no user, so the endpoint keeps working for the solo/local build.
 * Once auth ships, unauthenticated calls should be rejected outright.
 */
export async function verifyAuth(req) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return { ok: true, userId: null, enforced: false };

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return { ok: false, reason: 'missing_token', enforced: true };

  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return { ok: false, reason: 'malformed', enforced: true };

    const { createHmac, timingSafeEqual } = await import('node:crypto');
    const expected = createHmac('sha256', secret)
      .update(`${h}.${p}`)
      .digest('base64url');

    const a = Buffer.from(s);
    const b = Buffer.from(expected);
    // Constant-time compare: a fast-fail comparison leaks signature bytes.
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'bad_signature', enforced: true };
    }

    const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (claims.exp && Date.now() / 1000 > claims.exp) {
      return { ok: false, reason: 'expired', enforced: true };
    }
    return { ok: true, userId: claims.sub || null, enforced: true };
  } catch {
    return { ok: false, reason: 'invalid', enforced: true };
  }
}

/** Security headers worth setting on every response. */
export function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  // The API is for the app, not for browsers on other origins.
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '');
}
