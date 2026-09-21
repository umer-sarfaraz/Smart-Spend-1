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
import { receiptSchema, candidateText, validReceipt, receiptGeneration } from './_receipt.js';

// The two backups behind gemini-3.5-flash were gemini-2.5-flash and
// gemini-2.5-flash-lite. Round 143's diagnostics showed both answering 404 in
// under half a second on every fallback attempt (2026-09-20): Google moved the
// 2.5 family to preview and this key no longer reaches them on v1beta. So a
// timeout on the main model had been a total failure for as long as that was
// true, and nobody could see it, because the losing attempts were never
// reported. The main model is unchanged; only the backups behind it are alive.
const MODELS = [
  { id: 'gemini-3.5-flash', api: 'v1beta' },
  { id: 'gemini-3.5-flash-lite', api: 'v1beta' },
  { id: 'gemini-3.1-flash-lite', api: 'v1beta' },
];

const UPSTREAM_TIMEOUT_MS = 18_000;

/**
 * Has this server instance ENTERED this handler before?
 *
 * Not "answered a receipt": the flag is spent at entry, above the rate limit
 * and the auth guards, so a refused call consumes it and the first real scan
 * on that instance reports false. Read it as instance reuse and nothing more.
 *
 * Module scope, so it survives between invocations that reuse a warm instance
 * and resets when the platform makes a new one. It is a fact about INSTANCE
 * REUSE and nothing more. It is deliberately not called a cold start and must
 * never be reported as a measured startup delay: no timer here can see how long
 * the platform took before this file was even evaluated.
 */
let instanceHasServed = false;

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
  res.setHeader('X-PennyRoost-Scanner', '147');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Diagnostics, measurement only. Nothing below reads these to decide. ──
  //
  // Taken at handler ENTRY, before the guards, because the old `_scan.durationMs`
  // started after validation and so reported the model loop while looking like
  // it reported the server. The difference between the two is where a 2.9MB
  // upload's parse cost shows up.
  const handlerStarted = Date.now();
  const firstRequestOnInstance = !instanceHasServed;
  instanceHasServed = true;
  const attempts = [];
  let loopStartedAt = null;
  let receiptMode = null;

  /** Attached to every answer, success or failure. A scan that failed at the
   *  third model is exactly the one whose attempt timings matter. */
  const withDiag = (payload) => ({
    ...payload,
    _scan: {
      mode: receiptMode,
      serverMs: Date.now() - handlerStarted,
      modelLoopMs: loopStartedAt === null ? null : Date.now() - loopStartedAt,
      firstRequestOnInstance,
      attempts,
      // Kept under its old name for clients that predate this round.
      durationMs: loopStartedAt === null ? null : Date.now() - loopStartedAt,
    },
  });

  // ── Abuse controls, cheapest check first ──
  const limited = rateLimit(clientKey(req), { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    res.setHeader('Retry-After', String(limited.retryAfter || 60));
    return res.status(429).json(withDiag({ error: 'Too many scans in a row — try again in a minute.' }));
  }
  if (!checkAppSecret(req)) return res.status(403).json(withDiag({ error: 'forbidden' }));

  const auth = await verifyAuth(req);
  if (!auth.ok) return res.status(401).json(withDiag({ error: 'unauthorized' }));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Distinguishable on purpose: the app shows "not set up on this build" and
    // falls straight through to manual entry.
    return res.status(503).json(withDiag({ error: 'AI service not configured on server' }));
  }

  // ── Validate before spending anything ──
  const body = req.body;
  if (!body || typeof body !== 'object') return res.status(400).json(withDiag({ error: 'bad_request' }));

  const { prompt, mimeType } = body;
  receiptMode = body.receiptMode === 'text' || body.receiptMode === 'image' ? body.receiptMode : null;
  // `imageBase64` accepted as an alias so either client naming works.
  const image = body.base64Image || body.imageBase64;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json(withDiag({ error: 'Missing prompt' }));
  }
  if (prompt.length > 24000) return res.status(413).json(withDiag({ error: 'payload too large' }));
  if (image !== undefined) {
    if (typeof image !== 'string' || image.length < 100) {
      return res.status(400).json(withDiag({ error: 'missing_image' }));
    }
    // base64 inflates ~4/3; check the decoded size against budget.
    if ((image.length * 3) / 4 > MAX_BODY_BYTES) {
      return res.status(413).json(withDiag({ error: 'That photo is too large — try again from the camera.' }));
    }
    if (typeof mimeType !== 'string' || !/^image\/(jpeg|jpg|png|webp|heic)$/i.test(mimeType)) {
      return res.status(415).json(withDiag({ error: 'unsupported_media_type' }));
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
      ...(receiptMode ? { responseSchema: receiptSchema } : {}),
    },
  };

  let lastStatus = 502;
  let lastModel = '';
  const started = Date.now();
  loopStartedAt = started;
  const deadline = started + (receiptMode === 'text' ? 14_000 : 26_000);

  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(UPSTREAM_TIMEOUT_MS, remaining));
    const attemptStarted = Date.now();
    // Model id and a short outcome code only. Never a status body, which on a
    // 400 from upstream can quote the prompt back.
    const note = (outcome) => attempts.push({ model: model.id, ms: Date.now() - attemptStarted, outcome });
    try {
      const url =
        `https://generativelanguage.googleapis.com/${model.api}` +
        `/models/${model.id}:generateContent?key=${apiKey}`;

      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, generationConfig: receiptGeneration(payload.generationConfig, model.id, receiptMode) }),
        signal: controller.signal,
      });

      if (!r.ok) {
        note(`http_${r.status}`);
        lastStatus = r.status;
        lastModel = model.id;
        // 404 (model not on this endpoint), 429 (quota) and 5xx are worth another
        // model; other 4xx generally are not.
        if (r.status === 404 || r.status === 429 || r.status >= 500) continue;
        break;
      }

      const data = await r.json();
      const resultText = candidateText(data);
      const parsed = extractJson(resultText);

      if (!parsed || (receiptMode && !validReceipt(parsed))) {
        note(parsed ? 'invalid' : 'unparseable');
        // Log that parsing failed and which model — NEVER the content.
        console.warn(`[gemini] ${model.id} returned unparseable output`);
        lastStatus = 502;
        lastModel = model.id;
        continue;
      }

      note('ok');
      parsed._model = model.id;
      if (receiptMode) {
        parsed._scan = {
          mode: receiptMode,
          // Unchanged name and meaning, so a client from before this round
          // reads exactly what it always did.
          durationMs: Date.now() - started,
          serverMs: Date.now() - handlerStarted,
          modelLoopMs: Date.now() - started,
          firstRequestOnInstance,
          attempts,
        };
        // Counts, not content. `thoughtsTokens` is the figure that bills as
        // output, and it has never been visible to anyone reading this app.
        const usage = data?.usageMetadata;
        if (usage) {
          parsed._usage = {
            promptTokens: Number(usage.promptTokenCount) || 0,
            candidatesTokens: Number(usage.candidatesTokenCount) || 0,
            thoughtsTokens: Number(usage.thoughtsTokenCount) || 0,
          };
        }
      }
      return res.status(200).json(parsed);
    } catch (err) {
      clearTimeout(timer);
      note(err?.name === 'AbortError' ? 'timeout' : 'error');
      // Failure MODE only — never the body, image, or upstream text.
      console.error('[gemini] upstream failure:', err?.name || 'error');
      lastStatus = 504;
      lastModel = model.id;
      if (err?.name === 'AbortError') continue;
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastStatus === 429) {
    return res.status(429).json(withDiag({
      error: 'Daily AI quota reached — resets at midnight (Pacific Time).',
      tried: MODELS.map((m) => m.id),
    }));
  }
  return res.status(502).json(withDiag({ error: `Receipt reading is unavailable right now (${lastModel || 'upstream'}).` }));
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 30,
};
