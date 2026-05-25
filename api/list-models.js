// Temporary debug endpoint — lists available Gemini models for this API key
// DELETE this file after identifying correct model names
export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'No API key' });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`,
      { method: 'GET' }
    );
    const data = await r.json();
    // Return just names + supported methods to keep response small
    const models = (data.models || []).map(m => ({
      name: m.name,
      methods: m.supportedGenerationMethods
    }));
    return res.status(200).json({ count: models.length, models });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
