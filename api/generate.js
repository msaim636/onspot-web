import { GoogleGenerativeAI } from '@google/generative-ai';

// Candidate models in priority order
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

function generateSmartFallback(prompt) {
  const words = prompt
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);

  const baseTags = words.map((w) => `#${w.charAt(0).toUpperCase() + w.slice(1)}`).join(' ');
  const defaultTags = `${baseTags} #OnSpot #Trending #LiveNow`.trim();

  return [
    {
      id: 0,
      caption: `Exciting announcement: ${prompt}. We're pushing boundaries and setting new standards. Stay tuned for what's coming next!`,
      hashtags: `${defaultTags} #Innovation #Launch`,
    },
    {
      id: 1,
      caption: `Big news! ${prompt}. Don't miss out on this journey — drop your thoughts below!`,
      hashtags: `${defaultTags} #Community #Updates`,
    },
    {
      id: 2,
      caption: `Fresh perspective: ${prompt}. Simple, intentional, and made for you.`,
      hashtags: `${defaultTags} #DailyInspiration #Spotlight`,
    },
  ];
}

async function callWithRetry(genAI, prompt, systemPrompt) {
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const fullPrompt = `${systemPrompt}\n\nUser's post idea: ${prompt.trim()}`;

      // Try calling
      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();

      let cleaned = responseText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      let captions;
      try {
        captions = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
          captions = JSON.parse(match[0]);
        } else {
          // If plain text was returned, split into lines
          const lines = cleaned.split('\n\n').filter((l) => l.trim().length > 10);
          if (lines.length >= 2) {
            captions = lines.slice(0, 3).map((line, idx) => ({
              id: idx,
              caption: line.trim(),
              hashtags: '#Trending #OnSpot #Updates',
            }));
          } else {
            throw new Error('Unparseable AI response');
          }
        }
      }

      if (Array.isArray(captions) && captions.length > 0) {
        return captions.map((item, idx) => ({
          id: item.id ?? idx,
          caption: item.caption || item.text || '',
          hashtags: item.hashtags || '',
        }));
      }
    } catch (err) {
      console.warn(`Model ${modelName} attempt failed:`, err.message);
      // continue to next model
    }
  }

  // If all models were unavailable (e.g. 503 spike), return resilient smart fallback
  return generateSmartFallback(prompt);
}

export default async function handler(req, res) {
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
  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A non-empty "prompt" field is required' });
  }

  // If no Gemini key configured on Vercel yet, gracefully return smart fallback with notice
  if (!apiKey) {
    const fallback = generateSmartFallback(prompt);
    return res.status(200).json({
      captions: fallback,
      notice: 'GEMINI_API_KEY not configured in Vercel settings; generated using studio fallback.',
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = `You are a social media copywriter. Generate exactly 3 unique, engaging captions for social media posts. Return ONLY a valid JSON array of 3 objects with "caption" (string) and "hashtags" (string of 3-5 space-separated hashtags starting with #). No markdown, no commentary.`;

    const captions = await callWithRetry(genAI, prompt, systemPrompt);
    return res.status(200).json({ captions });
  } catch (err) {
    console.error('Gemini handler error:', err);
    // Even on total unexpected failure, always return valid captions so the user's flow never halts
    const captions = generateSmartFallback(prompt);
    return res.status(200).json({ captions, fallback: true });
  }
}
