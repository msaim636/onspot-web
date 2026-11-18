import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A non-empty "prompt" field is required' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    } catch {
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    const systemPrompt = `You are a social media expert. Generate exactly 3 unique, engaging captions for social media posts. Each caption should have a different tone (professional, casual, creative). Include 3-5 relevant hashtags with each caption. Return ONLY valid JSON — no markdown fences, no explanation — a JSON array with objects having "caption" (string) and "hashtags" (string of space-separated hashtags starting with #).`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser's post idea: ${prompt.trim()}` }] },
      ],
    });

    const responseText = result.response.text();

    // Strip markdown code fences if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let captions;
    try {
      captions = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON array from the response
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        captions = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    if (!Array.isArray(captions)) {
      captions = [captions];
    }

    // Normalize
    captions = captions.map((item, idx) => ({
      id: idx,
      caption: item.caption || item.text || '',
      hashtags: item.hashtags || '',
    }));

    return res.status(200).json({ captions });
  } catch (err) {
    console.error('Gemini API error:', err);
    return res.status(500).json({
      error: 'Failed to generate captions',
      details: err.message,
    });
  }
}
