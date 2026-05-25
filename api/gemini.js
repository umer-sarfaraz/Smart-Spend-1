// Models tried in order — each has its own daily quota pool so if the
// primary model is exhausted the next one picks up automatically.
const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
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

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      // 429 = quota exhausted, 404 = model name not available in this region/version
      // — skip and try the next model for both
      if (response.status === 429 || response.status === 404) {
        const err = await response.json().catch(() => ({}));
        lastError = err.error?.message || `${model} unavailable (${response.status})`;
        console.warn(`[gemini] ${model} unavailable (${response.status}), trying next model`);
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

      // Tag which model was actually used (helpful for debugging)
      parsed._model = model;
      return res.status(200).json(parsed);

    } catch (error) {
      lastError = error.message;
      console.warn(`[gemini] ${model} threw: ${error.message}`);
      // Network errors — don't try next model, just fail fast
      if (/fetch|network/i.test(error.message)) break;
    }
  }

  // All models failed (all quota exhausted or network error)
  return res.status(429).json({
    error: `All AI models quota reached. The free Gemini API resets daily — try again tomorrow, or add billing at aistudio.google.com. Last error: ${lastError}`
  });
}
