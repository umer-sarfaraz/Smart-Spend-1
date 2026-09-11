// In-app feedback → one inbox (round 120).
//
// The app's Feedback screen posts a message, optional photos and an optional
// reply address here; this relays it as an email through Brevo so it lands in
// the same Gmail every other mail for the app lands in, sent from the app's
// own domain. No database, no dashboard to check — the inbox is the queue.
//
// CONTRACT
//   request  { message, email?, meta?: { version, locale, platform, os, build? }, images?: [{ name, mimeType, base64 }] }
//   response { ok: true } | { error }
//
// Every guard FAILS OPEN when its env var is unset, like gemini.js — except
// the one that cannot: without BREVO_API_KEY there is nothing to send with,
// so the endpoint answers 503 `not_configured` and the app falls back to the
// mail door. Nothing here logs the message body.
//
// Env: BREVO_API_KEY (required), FEEDBACK_TO (default below), FEEDBACK_FROM
// (must be a sender verified in Brevo; default below).

import {
  MAX_BODY_BYTES,
  applySecurityHeaders,
  checkAppSecret,
  clientKey,
  rateLimit,
  verifyAuth,
} from './_guard.js';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const UPSTREAM_TIMEOUT_MS = 15_000;
const DEFAULT_TO = 'm.umersarfaraz@gmail.com';
const DEFAULT_FROM = 'support@pennyroost.com';

/** Message and attachment limits. Generous for a bug report, tight for abuse. */
export const FEEDBACK_LIMITS = {
  messageChars: 4000,
  emailChars: 254,
  images: 3,
  /** Base64 characters per image — about 2.2 MB of JPEG. */
  imageBase64: 3_000_000,
  /** Sum across every image. */
  totalBase64: 6_000_000,
};

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

/** A usable reply address or ''. Deliberately loose — this is a hint for a
 *  Reply-To header, not a login. */
export function cleanEmail(raw) {
  const s = String(raw || '').trim();
  if (!s || s.length > FEEDBACK_LIMITS.emailChars) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
}

/**
 * Validate and normalise the request body. Returns { ok, value } or
 * { ok: false, error }. Pure, so it can be tested without a server.
 */
export function parseFeedback(body) {
  const message = String(body?.message ?? '').trim();
  if (!message) return { ok: false, error: 'empty_message' };
  if (message.length > FEEDBACK_LIMITS.messageChars) return { ok: false, error: 'message_too_long' };

  const email = cleanEmail(body?.email);
  const meta = body?.meta && typeof body.meta === 'object' ? body.meta : {};
  const metaLine = ['version', 'build', 'locale', 'platform', 'os', 'device']
    .map((k) => (meta[k] ? `${k} ${String(meta[k]).slice(0, 80)}` : ''))
    .filter(Boolean)
    .join(' · ');

  const rawImages = Array.isArray(body?.images) ? body.images : [];
  if (rawImages.length > FEEDBACK_LIMITS.images) return { ok: false, error: 'too_many_images' };
  let total = 0;
  const images = [];
  for (let i = 0; i < rawImages.length; i++) {
    const img = rawImages[i] || {};
    const base64 = String(img.base64 || '').replace(/^data:[^,]*,/, '');
    const mimeType = String(img.mimeType || 'image/jpeg').toLowerCase();
    if (!base64) continue;
    if (!IMAGE_MIME.has(mimeType)) return { ok: false, error: 'bad_image_type' };
    if (base64.length > FEEDBACK_LIMITS.imageBase64) return { ok: false, error: 'image_too_large' };
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64)) return { ok: false, error: 'bad_image' };
    total += base64.length;
    if (total > FEEDBACK_LIMITS.totalBase64) return { ok: false, error: 'images_too_large' };
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : mimeType === 'image/heic' ? 'heic' : 'jpg';
    images.push({ name: `feedback-${i + 1}.${ext}`, content: base64 });
  }

  return { ok: true, value: { message, email, metaLine, images } };
}

/** The email, as Brevo wants it. Pure, for the tests. */
export function buildEmail({ message, email, metaLine, images }, { to = DEFAULT_TO, from = DEFAULT_FROM } = {}) {
  const firstLine = message.split('\n')[0].trim().slice(0, 60);
  const subject = `PennyRoost feedback: ${firstLine}${firstLine.length < message.split('\n')[0].trim().length ? '…' : ''}`;
  const text = [
    message,
    '',
    '—',
    email ? `reply to: ${email}` : 'no reply address given',
    metaLine || 'no app details',
    images.length ? `${images.length} photo${images.length === 1 ? '' : 's'} attached` : '',
  ].filter((l, i, all) => l !== '' || i < all.length - 1).join('\n');
  const payload = {
    sender: { name: 'PennyRoost', email: from },
    to: [{ email: to }],
    subject,
    textContent: text,
  };
  if (email) payload.replyTo = { email };
  if (images.length) payload.attachment = images;
  return payload;
}

export default async function handler(req, res) {
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'not_configured' });

  // Feedback is rarer than scans and abuse of it is spam in one inbox: five
  // messages in ten minutes per address is plenty for a person.
  const limited = rateLimit(`feedback:${clientKey(req)}`, { limit: 5, windowMs: 10 * 60_000 });
  if (!limited.ok) {
    res.setHeader('Retry-After', String(limited.retryAfter));
    return res.status(429).json({ error: 'rate_limited' });
  }
  if (!checkAppSecret(req)) return res.status(401).json({ error: 'unauthorized' });
  const auth = await verifyAuth(req);
  if (!auth.ok) return res.status(401).json({ error: 'unauthorized' });

  const length = Number(req.headers['content-length'] || 0);
  if (length > MAX_BODY_BYTES) return res.status(413).json({ error: 'payload_too_large' });

  const parsed = parseFeedback(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const payload = buildEmail(parsed.value, {
    to: process.env.FEEDBACK_TO || DEFAULT_TO,
    from: process.env.FEEDBACK_FROM || DEFAULT_FROM,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!upstream.ok) {
      // Status only. The response body can echo the message, and a log line
      // holding someone's feedback is the same leak gemini.js refuses to make.
      console.error('feedback relay failed', upstream.status);
      return res.status(502).json({ error: 'relay_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    const timedOut = err && err.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'timeout' : 'relay_failed' });
  } finally {
    clearTimeout(timer);
  }
}
