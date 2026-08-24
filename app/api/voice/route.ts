import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { resolveSubstitute, INITIAL_DEALS } from '@/store/useShoppingStore';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const CHAT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];

const INDIAN_MARKET_BASE_RATES: Record<string, { basePrice: number; baseUnit: string; category: string; image: string }> = {
  tomato: { basePrice: 40, baseUnit: 'kg', category: 'Produce', image: '🍅' },
  tomatoes: { basePrice: 40, baseUnit: 'kg', category: 'Produce', image: '🍅' },
  potato: { basePrice: 30, baseUnit: 'kg', category: 'Produce', image: '🥔' },
  potatoes: { basePrice: 30, baseUnit: 'kg', category: 'Produce', image: '🥔' },
  onion: { basePrice: 50, baseUnit: 'kg', category: 'Produce', image: '🧅' },
  onions: { basePrice: 50, baseUnit: 'kg', category: 'Produce', image: '🧅' },
  apple: { basePrice: 120, baseUnit: 'kg', category: 'Produce', image: '🍎' },
  apples: { basePrice: 120, baseUnit: 'kg', category: 'Produce', image: '🍎' },
  banana: { basePrice: 60, baseUnit: 'dozen', category: 'Produce', image: '🍌' },
  bananas: { basePrice: 60, baseUnit: 'dozen', category: 'Produce', image: '🍌' },
  grape: { basePrice: 200, baseUnit: 'kg', category: 'Produce', image: '🍇' },
  grapes: { basePrice: 200, baseUnit: 'kg', category: 'Produce', image: '🍇' },
  coriander: { basePrice: 100, baseUnit: 'kg', category: 'Produce', image: '🌿' },
  paneer: { basePrice: 400, baseUnit: 'kg', category: 'Dairy & Plant', image: '🧀' },
  milk: { basePrice: 66, baseUnit: 'litre', category: 'Dairy & Plant', image: '🥛' },
  atta: { basePrice: 45, baseUnit: 'kg', category: 'Pantry', image: '🌾' },
  rice: { basePrice: 90, baseUnit: 'kg', category: 'Pantry', image: '🌾' },
  sugar: { basePrice: 45, baseUnit: 'kg', category: 'Pantry', image: '🍯' },
};

function resolveMarketRate(name: string) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(INDIAN_MARKET_BASE_RATES)) {
    if (lower.includes(key)) return val;
  }
  return { basePrice: 50, baseUnit: 'kg', category: 'Produce', image: '🛒' };
}

function robustParseJSON(raw: string) {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) throw new Error('No JSON object found');

  let jsonSubstring = cleaned.slice(firstBrace, lastBrace + 1);
  jsonSubstring = jsonSubstring.replace(/,\s*([\]}])/g, '$1');
  return JSON.parse(jsonSubstring);
}

export async function POST(req: Request) {
  try {
    const { transcript, currentCart = [], purchaseHistory = [], language = 'en-IN' } = await req.json();

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const isDealIntent = /deal|deals|sale|discount|discounts|offer|offers|sasta|saving/i.test(transcript);
    const isRestockIntent = /low|empty|out of stock|khatam|reorder|restock/i.test(transcript);

    // Guaranteed fast-path for deals requests
    if (isDealIntent) {
      return NextResponse.json({
        action: 'GET_DEALS',
        items: [],
        suggestions: INITIAL_DEALS,
        ai_response_text: "Here are today's top live grocery deals and verified discounts! 🔥",
      });
    }

    const currentMonth = new Date().toLocaleString('en-IN', { month: 'long' });

    const systemPrompt = `You are a Voice Shopping Assistant for Indian groceries in INR (₹).
Output strict raw valid JSON only.

Action Types:
1. "GET_DEALS": User asks for deals or discounts.
2. "GET_RUNNING_LOW": User asks what is low or depleted.
3. "ADD" / "ADD_BUNDLE": Extract items. For each item provide: name, quantity, unit ("100 g", "250 g", "500 g", "1 kg", "1 dozen"), category, basePrice, and baseUnit.
4. "GET_SUBSTITUTE", "SEARCH", "REMOVE", "UPDATE_QUANTITY", "SET_BUDGET", "INFO", "NOT_FOUND": Handle accordingly.

JSON Template:
{
  "action": "ADD" | "ADD_BUNDLE" | "REMOVE" | "UPDATE_QUANTITY" | "SEARCH" | "GET_SEASONAL" | "GET_RUNNING_LOW" | "GET_SUBSTITUTE" | "GET_DEALS" | "SET_BUDGET" | "INFO" | "NOT_FOUND",
  "items": [],
  "update_target": null,
  "search_results": [],
  "suggestions": [],
  "budget_limit": null,
  "ai_response_text": "Spoken confirmation"
}`;

    let rawText = '';
    for (const model of CHAT_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Command: "${transcript}"` },
          ],
          model,
          temperature: 0.1,
          max_tokens: 1200,
        });
        rawText = response.choices[0]?.message?.content?.trim() || '';
        if (rawText) break;
      } catch (err: any) {
        console.warn('Groq failover:', err?.message);
      }
    }

    if (!rawText) {
      if (isDealIntent) {
        return NextResponse.json({
          action: 'GET_DEALS',
          items: [],
          suggestions: INITIAL_DEALS,
          ai_response_text: "Here are today's verified deals! 🔥",
        });
      }
      return NextResponse.json({
        action: 'INFO',
        items: [],
        suggestions: [],
        ai_response_text: 'How can I assist your grocery shopping today?',
      });
    }

    let parsed = robustParseJSON(rawText);

    if (parsed.action === 'GET_DEALS' && (!parsed.suggestions || parsed.suggestions.length === 0)) {
      parsed.suggestions = INITIAL_DEALS;
    }

    if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item: any) => {
        const marketRate = resolveMarketRate(item.name);
        return {
          ...item,
          basePrice: Number(item.basePrice || marketRate.basePrice) || 40,
          baseUnit: item.baseUnit || marketRate.baseUnit || 'kg',
          category: item.category || marketRate.category,
          image: item.image || marketRate.image,
          substituteSuggestion: resolveSubstitute(item.name) || undefined,
        };
      });
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Groq Pipeline Error:', error);
    return NextResponse.json({
      action: 'INFO',
      items: [],
      suggestions: [],
      ai_response_text: 'I could not process that command. Please try again.',
    });
  }
}