// Models tried in order. Keep this list to currently supported Gemini API text/image models.
const MODELS = [
  { id: 'gemini-3.5-flash',      api: 'v1beta', jsonMode: true },
  { id: 'gemini-2.5-flash',      api: 'v1beta', jsonMode: true },
  { id: 'gemini-2.5-flash-lite', api: 'v1beta', jsonMode: true },
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

  for (const { id, api, jsonMode } of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/${api}/models/${id}:generateContent?key=${apiKey}`;
      const generationConfig = jsonMode ? { responseMimeType: 'application/json' } : {};

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig })
      });

      // 429 = quota exhausted, 404 = model not on this endpoint — skip, try next
      if (response.status === 429 || response.status === 404) {
        const err = await response.json().catch(() => ({}));
        lastError = err.error?.message || `${id} unavailable (${response.status})`;
        console.warn(`[gemini] ${id} (${api}) status ${response.status}, trying next`);
        continue;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        // 400 with "responseMimeType" in the error = JSON mode not supported → skip
        const errMsg = err.error?.message || '';
        if (response.status === 400 && /responseMimeType|mimeType/i.test(errMsg)) {
          lastError = errMsg;
          console.warn(`[gemini] ${id} JSON mode unsupported, trying next`);
          continue;
        }
        return res.status(response.status).json({ error: errMsg || 'Gemini API error' });
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error('Empty response from Gemini');

      // Strip markdown code fences Gemini sometimes wraps JSON in
      let cleaned = resultText.trim();
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

      // If it still starts with non-JSON text, try to find the JSON object
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (match) cleaned = match[1];
      }

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        // Parse failed on this model — try next
        lastError = `${id} returned unparseable JSON`;
        console.warn(`[gemini] ${id} parse error: ${parseErr.message}. Raw: ${cleaned.slice(0, 100)}`);
        continue;
      }

      parsed._model = id;
      return res.status(200).json(parsed);

    } catch (error) {
      lastError = error.message;
      console.warn(`[gemini] ${id} threw: ${error.message}`);
      if (/fetch|network/i.test(error.message)) break;
    }
  }

  // All models exhausted
  return res.status(429).json({
    error: `Daily AI quota reached — resets at midnight (Pacific Time). Last: ${lastError}`,
    tried: MODELS.map(m => m.id)
  });
}
