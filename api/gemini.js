// Models tried in order — each has its own daily quota pool.
// 2.0 models use v1beta; stable 1.5 models use v1 (they are not on v1beta).
const MODELS = [
  { id: 'gemini-2.0-flash',      api: 'v1beta' },
  { id: 'gemini-2.0-flash-lite', api: 'v1beta' },
  { id: 'gemini-1.5-flash',      api: 'v1'     },
  { id: 'gemini-1.5-flash-8b',   api: 'v1'     },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured on server' });
  }

  const { base64Image, mimeType, prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  // Build parts array: image is optional — text-only requests work without it
  const parts = [];
  if (base64Image && mimeType) {
    parts.push({ inlineData: { mimeType, data: base64Image } });
  }
  parts.push({ text: prompt });

  let lastError = 'Gemini API error';

  for (const { id, api } of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/${api}/models/${id}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      // 429 = quota exhausted, 404 = model not available — skip and try next
      if (response.status === 429 || response.status === 404) {
        const err = await response.json().catch(() => ({}));
        lastError = err.error?.message || `${id} unavailable (${response.status})`;
        console.warn(`[gemini] ${id} (${api}) status ${response.status}, trying next`);
        continue;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.error?.message || 'Gemini API error' });
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error('Empty response from Gemini');

      // Gemini sometimes wraps JSON in markdown code fences — strip them
      let cleaned = resultText.trim();
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        return res.status(500).json({ error: `JSON parse failed: ${parseErr.message}`, raw: cleaned.slice(0, 500) });
      }

      parsed._model = id;
      return res.status(200).json(parsed);

    } catch (error) {
      lastError = error.message;
      console.warn(`[gemini] ${id} threw: ${error.message}`);
      if (/fetch|network/i.test(error.message)) break;
    }
  }

  // All models failed
  return res.status(429).json({
    error: `All models failed. Last: ${lastError}`,
    tried: MODELS.map(m => m.id)
  });
}
