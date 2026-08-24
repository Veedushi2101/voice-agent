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

function calculateDepletedItems(history: any[]) {
  const now = Date.now();
  const safeHistory = Array.isArray(history) ? history : [];
  
  const depleted = safeHistory.filter((item: any) => {
    if (!item || !item.lastBought) return false;
    const daysPassed = (now - item.lastBought) / 86400000;
    const threshold = item.depletionDays || (item.category === 'Produce' ? 4 : item.category === 'Dairy & Plant' ? 3 : 25);
    return daysPassed >= threshold;
  });

  if (depleted.length === 0 && safeHistory.length > 0) {
    return safeHistory.slice(0, 3).map((item: any) => ({
      name: item.name,
      price: Number(item.price) || 40,
      unit: item.unit || '1 kg',
      category: item.category || 'Produce',
      image: item.category === 'Dairy & Plant' ? '🥛' : '🥬',
      reason: `Bought ${Math.max(1, Math.round((now - item.lastBought) / 86400000))} days ago. Stock is running low!`,
      type: 'restock_alert'
    }));
  }

  return depleted.map((item: any) => ({
    name: item.name,
    price: Number(item.price) || 40,
    unit: item.unit || '1 kg',
    category: item.category || 'Produce',
    image: item.category === 'Dairy & Plant' ? '🥛' : '🥬',
    reason: `Bought ${Math.max(1, Math.round((now - item.lastBought) / 86400000))} days ago. Estimated empty!`,
    type: 'restock_alert'
  }));
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

    const lowerTranscript = transcript.toLowerCase().trim();

    // 1. FAST-PATH: Remove Item Command
    const isRemoveIntent = /remove|delete|hatao|nikal|cancel/i.test(lowerTranscript);
    if (isRemoveIntent) {
      let cleanTarget = lowerTranscript
        .replace(/^(please\s+)?(remove|delete|hatao|nikal|cancel)\s+/i, '')
        .replace(/\s+from\s+(my\s+)?(cart|basket|list)$/i, '')
        .trim();

      if (cleanTarget) {
        return NextResponse.json({
          action: 'REMOVE',
          items: [{ name: cleanTarget }],
          suggestions: [],
          ai_response_text: `Removed ${cleanTarget} from your basket.`,
        });
      }
    }

    // 2. FAST-PATH: Update Quantity Command (All variations: "change tomatoes to 2 kg", "make 500g onions", "update milk to 1 litre")
    const isUpdateIntent = /update|change|make|badlo|karo|set/i.test(lowerTranscript) && /\d+|half|dozen|kg|g|gm|gram|litre|litres|ml/i.test(lowerTranscript);
    if (isUpdateIntent && !/budget/i.test(lowerTranscript)) {
      // Pattern A: "change tomatoes to 2 kg" / "update milk into 500ml"
      let match = lowerTranscript.match(/(?:update|change|make|set)\s+([a-z\s]+?)\s+(?:to|as|into|=)\s+(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|gram|dozen|piece|pcs|litre|litres|ml)?/i);
      
      // Pattern B: "make 2 kg tomatoes" / "change 500g onions"
      if (!match) {
        match = lowerTranscript.match(/(?:update|change|make|set)\s+(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|gram|dozen|piece|pcs|litre|litres|ml)?\s+(?:of\s+)?([a-z\s]+)/i);
        if (match) {
          const newQty = parseFloat(match[1]);
          const newUnit = match[2] ? match[2].trim() : 'kg';
          const itemName = match[3].replace(/\s+(in|into|from)\s+(my\s+)?(cart|basket)$/i, '').trim();
          return NextResponse.json({
            action: 'UPDATE_QUANTITY',
            update_target: {
              name: itemName,
              new_quantity: newQty,
              new_unit: newUnit,
            },
            items: [],
            suggestions: [],
            ai_response_text: `Updated ${itemName} quantity to ${newQty} ${newUnit}.`,
          });
        }
      } else {
        const itemTargetName = match[1].replace(/\s+(in|into|from)\s+(my\s+)?(cart|basket)$/i, '').trim();
        const newQuantity = parseFloat(match[2]);
        const newUnit = match[3] ? match[3].trim() : 'kg';

        return NextResponse.json({
          action: 'UPDATE_QUANTITY',
          update_target: {
            name: itemTargetName,
            new_quantity: newQuantity,
            new_unit: newUnit,
          },
          items: [],
          suggestions: [],
          ai_response_text: `Updated ${itemTargetName} quantity to ${newQuantity} ${newUnit}.`,
        });
      }
    }

    // 3. FAST-PATH: Restock / Low on kitchen queries
    const isRestockIntent = /low|empty|out of stock|khatam|reorder|restock|running low|what is low|need to buy|kitchen/i.test(lowerTranscript);
    if (isRestockIntent && !/add|remove|delete|search/i.test(lowerTranscript)) {
      const lowItems = calculateDepletedItems(purchaseHistory);
      const itemNames = lowItems.map((i: any) => i.name).slice(0, 3).join(', ');

      return NextResponse.json({
        action: 'GET_RUNNING_LOW',
        items: [],
        suggestions: lowItems,
        ai_response_text: lowItems.length > 0 
          ? `You are running low on ${itemNames}. I have placed restock alerts on your screen!`
          : "Your pantry looks fully stocked based on recent shopping cycles!",
      });
    }

    // 4. FAST-PATH: Deals & Offers queries
    const isDealIntent = /deal|deals|sale|discount|discounts|offer|offers|sasta|saving/i.test(lowerTranscript);
    if (isDealIntent && !/add|remove|delete/i.test(lowerTranscript)) {
      return NextResponse.json({
        action: 'GET_DEALS',
        items: [],
        suggestions: INITIAL_DEALS,
        ai_response_text: "Here are today's top live grocery deals and verified discounts! 🔥",
      });
    }

    // 5. LLM Fallback Reasoning for remaining voice phrases
    const systemPrompt = `You are a Voice Shopping Assistant for Indian groceries in INR (₹).
Output strict raw valid JSON only.

Action Types:
1. "UPDATE_QUANTITY": User wants to update/change weight or count of an item in the cart.
   Template: "update_target": {"name": "tomatoes", "new_quantity": 2, "new_unit": "kg"}
2. "REMOVE": User wants to remove/delete an item. Set "items": [{"name": "item_name"}].
3. "GET_RUNNING_LOW": User asks what is low or depleted.
4. "GET_DEALS": User asks for deals or discounts.
5. "ADD" / "ADD_BUNDLE": Extract grocery items. Provide name, quantity, unit, category, basePrice, and baseUnit.

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
      return NextResponse.json({
        action: 'INFO',
        items: [],
        suggestions: [],
        ai_response_text: 'How can I assist your grocery shopping today?',
      });
    }

    let parsed = robustParseJSON(rawText);

    if (parsed.action === 'GET_RUNNING_LOW') {
      parsed.suggestions = calculateDepletedItems(purchaseHistory);
    } else if (parsed.action === 'GET_DEALS' && (!parsed.suggestions || parsed.suggestions.length === 0)) {
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
      ai_response_text: 'Could not process that command. Please try again.',
    });
  }
}