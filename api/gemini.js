// Receipt-reading endpoint. Serves BOTH the web app (same-origin `/api/gemini`)
// and the native app (absolute `https://<host>/api/gemini`).
//
// The key lives here and only here. An app bundle is not secret — anyone can
// unzip an .ipa and read every string in it — so a Gemini key shipped in the app
// is a key handed to every user. Phone -> here -> Google.
//
// CONTRACT (unchanged, both clients depend on it):
//   request  { base64Image?, mimeType?, prompt }
//   response the parsed receipt object, plus `_model`
//
// Hardened 2026-08-24. What changed and why:
//   * rate limiting + payload caps + MIME validation. This URL spends money on
//     every call; an unprotected AI proxy gets found and drained within days.
//   * NEVER logs receipt content. The previous version logged the first 100 chars
//     of raw model output on a parse failure, which puts a customer's shopping
//     list in a server log. An error log containing a receipt is a data leak.
//   * auth hook, dormant until SUPABASE_JWT_SECRET is set.
//
// Every guard FAILS OPEN when its env var is unset, so this deploys with no
// configuration change and nothing breaks.

import {
  MAX_BODY_BYTES,
  applySecurityHeaders,
  checkAppSecret,
  clientKey,
  rateLimit,
  verifyAuth,
} from './_guard.js';

const MODELS = [
  { id: 'gemini-3.5-flash', api: 'v1beta' },
  { id: 'gemini-2.5-flash', api: 'v1beta' },
  { id: 'gemini-2.5-flash-lite', api: 'v1beta' },
];

const UPSTREAM_TIMEOUT_MS = 25_000;

/** Pull a JSON object out of a model reply that may be fenced or prefixed. */
function extractJson(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!s.startsWith('{') && !s.startsWith('[')) {
    const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) s = m[1];
  }
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Abuse controls, cheapest check first ──
  const limited = rateLimit(clientKey(req), { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    res.setHeader('Retry-After', String(limited.retryAfter || 60));
    return res.status(429).json({ error: 'Too many scans in a row — try again in a minute.' });
  }
  if (!checkAppSecret(req)) return res.status(403).json({ error: 'forbidden' });

  const auth = await verifyAuth(req);
  if (!auth.ok) return res.status(401).json({ error: 'unauthorized' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Distinguishable on purpose: the app shows "not set up on this build" and
    // falls straight through to manual entry.
    return res.status(503).json({ error: 'AI service not configured on server' });
  }

  // ── Validate before spending anything ──
  const body = req.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });

  const { prompt, mimeType } = body;
  // `imageBase64` accepted as an alias so either client naming works.
  const image = body.base64Image || body.imageBase64;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Missing prompt' });
  }
  if (image !== undefined) {
    if (typeof image !== 'string' || image.length < 100) {
      return res.status(400).json({ error: 'missing_image' });
    }
    // base64 inflates ~4/3; check the decoded size against budget.
    if ((image.length * 3) / 4 > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'That photo is too large — try again from the camera.' });
    }
    if (typeof mimeType !== 'string' || !/^image\/(jpeg|jpg|png|webp|heic)$/i.test(mimeType)) {
      return res.status(415).json({ error: 'unsupported_media_type' });
    }
  }

  // Text-only requests are legitimate (the web app's pantry scanner uses them),
  // so the image is optional — but when present it must be valid, checked above.
  const parts = [];
  if (image && mimeType) parts.push({ inlineData: { mimeType, data: image } });
  parts.push({ text: prompt });

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  let lastStatus = 502;
  let lastModel = '';

  for (const model of MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const url =
        `https://generativelanguage.googleapis.com/${model.api}` +
        `/models/${model.id}:generateContent?key=${apiKey}`;

      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!r.ok) {
        lastStatus = r.status;
        lastModel = model.id;
        // 404 (model not on this endpoint), 429 (quota) and 5xx are worth another
        // model; other 4xx generally are not.
        if (r.status === 404 || r.status === 429 || r.status >= 500) continue;
        break;
      }

      const data = await r.json();
      const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = extractJson(resultText);

      if (!parsed) {
        // Log that parsing failed and which model — NEVER the content.
        console.warn(`[gemini] ${model.id} returned unparseable output`);
        lastStatus = 502;
        lastModel = model.id;
        continue;
      }

      parsed._model = model.id;
      return res.status(200).json(parsed);
    } catch (err) {
      clearTimeout(timer);
      // Failure MODE only — never the body, image, or upstream text.
      console.error('[gemini] upstream failure:', err?.name || 'error');
      lastStatus = 504;
      lastModel = model.id;
      if (err?.name === 'AbortError') continue;
    }
  }

  if (lastStatus === 429) {
    return res.status(429).json({
      error: 'Daily AI quota reached — resets at midnight (Pacific Time).',
      tried: MODELS.map((m) => m.id),
    });
  }
  return res.status(502).json({ error: `Receipt reading is unavailable right now (${lastModel || 'upstream'}).` });
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 30,
};
