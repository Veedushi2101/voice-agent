import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const CHAT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];

const HEALTHY_SUBSTITUTES_MAP: Record<string, { name: string; price: number; unit: string; category: string; image: string; reason: string }> = {
  sugar: { name: 'Organic Jaggery Powder', price: 65, unit: 'kg', category: 'Pantry', image: '🍯', reason: 'Unrefined, mineral-rich natural sweetener' },
  'white sugar': { name: 'Organic Jaggery Powder', price: 65, unit: 'kg', category: 'Pantry', image: '🍯', reason: 'Low-glycemic unrefined sweetener' },
  milk: { name: 'Unsweetened Almond Milk', price: 140, unit: 'litre', category: 'Dairy & Plant', image: '🥛', reason: 'Lactose-free, gut-friendly plant milk' },
  'dairy milk': { name: 'Unsweetened Oat Milk', price: 155, unit: 'litre', category: 'Dairy & Plant', image: '🥛', reason: 'Creamy plant-based dairy alternative' },
  butter: { name: 'Cold-Pressed Olive Oil', price: 290, unit: 'bottle', category: 'Pantry', image: '🫒', reason: 'Heart-healthy monounsaturated fats' },
  bread: { name: 'Artisan Sourdough Loaf', price: 85, unit: 'loaf', category: 'Bakery', image: '🍞', reason: 'Naturally fermented and gut-friendly' },
  'white bread': { name: '100% Whole Wheat Bread', price: 55, unit: 'loaf', category: 'Bakery', image: '🍞', reason: 'Higher fiber with zero refined flour' },
  rice: { name: 'Organic Brown Rice', price: 110, unit: 'kg', category: 'Pantry', image: '🌾', reason: 'High-fiber complex carbohydrate' },
  oil: { name: 'Cold-Pressed Mustard / Coconut Oil', price: 180, unit: 'litre', category: 'Pantry', image: '🥥', reason: 'Unrefined, nutrient-dense cooking oil' },
  maida: { name: 'Organic Multigrain Atta', price: 75, unit: 'kg', category: 'Pantry', image: '🌾', reason: 'Zero refined flour, rich in dietary fiber' },
  cola: { name: 'Sparkling Kombucha', price: 95, unit: 'bottle', category: 'Snacks & Sips', image: '🍵', reason: 'Probiotic-rich refreshing beverage' },
};

export async function POST(req: Request) {
  try {
    const { transcript, currentCart = [], purchaseHistory = [], language = 'en-IN' } = await req.json();

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const currentMonth = new Date().toLocaleString('en-IN', { month: 'long' });

    const systemPrompt = `You are an AI Voice Shopping Assistant designed for grocery & household items in INR (₹).
Output strict raw valid JSON only. Do not use <think> tags or markdown backticks.

Context:
- Current Month: ${currentMonth}
- Current Cart: ${JSON.stringify(currentCart)}
- User History: ${JSON.stringify(purchaseHistory)}
- Language: ${language}

Action Classifications (CRITICAL):
1. "INFO": User asks a question, conversational remark, or inquiry about discounts/shipping/features (e.g. "Will I get more discount?", "How does delivery work?", "What are the payment options?"). DO NOT ADD ANY ITEMS TO CART. Leave items array EMPTY []. Provide a helpful answer in ai_response_text.
2. "NOT_FOUND": User is asking for an item that is non-existent, invalid, or out of stock. Leave items array EMPTY []. Set ai_response_text to explain that the item is unavailable and optionally suggest a valid alternative.
3. "ADD": User explicitly issues a command to buy/add specific grocery products.
4. "ADD_BUNDLE": User explicitly requests recipe ingredients (e.g. "Add items for Pav Bhaji").
5. "GET_DEALS": User asks to see discounts or sales.
6. "GET_SEASONAL": User asks for seasonal produce.
7. "GET_RUNNING_LOW": User asks what needs restock.
8. "GET_SUBSTITUTE": User asks for alternatives.
9. "UPDATE_QUANTITY", "REMOVE", "SEARCH", "SET_BUDGET": Handle accordingly.

JSON Template:
{
  "action": "ADD" | "ADD_BUNDLE" | "REMOVE" | "UPDATE_QUANTITY" | "SEARCH" | "GET_SEASONAL" | "GET_RUNNING_LOW" | "GET_SUBSTITUTE" | "GET_DEALS" | "SET_BUDGET" | "INFO" | "NOT_FOUND",
  "items": [],
  "update_target": null,
  "search_results": [],
  "suggestions": [],
  "budget_limit": null,
  "ai_response_text": "Spoken clear feedback string"
}`;

    let rawText = '';
    for (const model of CHAT_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Parse user input: "${transcript}"` },
          ],
          model,
          temperature: 0.1,
          max_tokens: 1000,
        });
        rawText = response.choices[0]?.message?.content?.trim() || '';
        if (rawText) break;
      } catch (err: any) {
        console.warn('Groq model failover:', err?.message);
      }
    }

    if (!rawText) {
      // Deterministic fallback for conversational and deal queries
      if (/discount|offer|coupon|more discount|saving|how much|free/i.test(transcript)) {
        return NextResponse.json({
          action: 'INFO',
          items: [],
          suggestions: [],
          ai_response_text: "You get free delivery on orders above ₹499! Check out our Live Sales & Deals for extra discounts."
        });
      }

      return NextResponse.json({
        action: 'INFO',
        items: [],
        suggestions: [],
        ai_response_text: "I didn't quite catch that. Could you please specify the grocery item you'd like to add or search for?"
      });
    }

    let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    let parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));

    // Safeguard: Never allow INFO or NOT_FOUND actions to return items
    if (parsed.action === 'INFO' || parsed.action === 'NOT_FOUND') {
      parsed.items = [];
    }

    // Attach substitutes when adding items
    if ((parsed.action === 'ADD' || parsed.action === 'ADD_BUNDLE') && Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item: any) => {
        if (!item.substituteSuggestion && item.name) {
          const lower = item.name.toLowerCase();
          for (const [key, sub] of Object.entries(HEALTHY_SUBSTITUTES_MAP)) {
            if (lower.includes(key)) {
              return { ...item, substituteSuggestion: sub };
            }
          }
        }
        return item;
      });
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Groq Execution Pipeline Error:', error);
    return NextResponse.json({
      action: 'INFO',
      items: [],
      suggestions: [],
      ai_response_text: "I couldn't process that command. Please try again with a specific grocery item."
    });
  }
}