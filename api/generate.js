import { GoogleGenerativeAI } from '@google/generative-ai';

// Fast candidate models in priority order
const CANDIDATE_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
];

function generateSmartFallback(prompt) {
  // Extract keywords
  const cleanPrompt = prompt.replace(/[^\w\s]/gi, '').trim();
  const words = cleanPrompt
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);

  const tags = words.map((w) => `#${w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()}`).join(' ');
  const defaultTags = `${tags} #NewLaunch #Community #DailyUpdates`.trim();

  return [
    {
      id: 0,
      caption: `We are beyond thrilled to announce: ${prompt}. Join us on this journey and experience something truly special. See you there!`,
      hashtags: `${defaultTags} #LaunchDay`,
    },
    {
      id: 1,
      caption: `Big things are happening! ${prompt}. Mark your calendars and tag someone who needs to be there with you.`,
      hashtags: `${defaultTags} #MustVisit #Spotlight`,
    },
    {
      id: 2,
      caption: `Crafted with passion, made for you: ${prompt}. Drop by and say hello — we can't wait to welcome you!`,
      hashtags: `${defaultTags} #Vibes #Exclusive`,
    },
  ];
}

// Timeout helper: rejects after ms
function timeoutPromise(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
}

async function callModelWithTimeout(model, fullPrompt, timeoutMs = 3500) {
  return Promise.race([
    model.generateContent(fullPrompt),
    timeoutPromise(timeoutMs),
  ]);
}

async function getCaptions(genAI, prompt, systemPrompt) {
  const fullPrompt = `${systemPrompt}\n\nUser's post idea: ${prompt.trim()}`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await callModelWithTimeout(model, fullPrompt, 3000);
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
      console.warn(`Model ${modelName} timed out or failed:`, err.message);
      // fast fail to next model or fallback
    }
  }

  // Fast smart fallback if Google servers are under heavy load
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

  if (!apiKey) {
    return res.status(200).json({
      captions: generateSmartFallback(prompt),
      notice: 'Using studio fallback.',
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = `You are a social media copywriter. Generate exactly 3 unique, engaging captions for social media posts. Return ONLY a valid JSON array of 3 objects with "caption" (string) and "hashtags" (string of 3-5 space-separated hashtags starting with #). No markdown, no commentary.`;

    const captions = await getCaptions(genAI, prompt, systemPrompt);
    return res.status(200).json({ captions });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(200).json({ captions: generateSmartFallback(prompt) });
  }
}
