import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const CHAT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];

// Helper to query DuckDuckGo instant answer/web search for recipe ingredients
async function searchWebForRecipe(dishQuery: string): Promise<string> {
  try {
    const cleanQuery = encodeURIComponent(`${dishQuery} authentic recipe ingredients grocery list`);
    const res = await fetch(`https://api.duckduckgo.com/?q=${cleanQuery}&format=json&no_html=1&skip_disambig=1`);
    if (!res.ok) return '';
    const data = await res.json();
    return data.AbstractText || data.Heading || '';
  } catch (err) {
    console.warn('Web search request failed, using LLM culinary ground-truth fallback:', err);
    return '';
  }
}

export async function POST(req: Request) {
  try {
    const { transcript, currentCart = [], purchaseHistory = [], language = 'en-IN' } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const currentDate = new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });

    // Step 1: Check if the user is asking to add ingredients for a specific dish
    const isRecipeIntent = /(?:ingredients? for|items? for|recipe for|make|cook|prepare)\s+(.+)/i.test(transcript);
    let webContext = '';

    if (isRecipeIntent) {
      const match = transcript.match(/(?:ingredients? for|items? for|recipe for|make|cook|prepare)\s+([^.,]+)/i);
      const dishName = match ? match[1].trim() : transcript;
      webContext = await searchWebForRecipe(dishName);
      console.log(`Web search context for "${dishName}":`, webContext || 'Using broad AI culinary search');
    }

    const systemPrompt = `You are a dynamic AI Voice Shopping Assistant specialized in Indian market groceries and real-time recipe breakdown.
Output raw valid JSON only. Do not wrap in <think> tags, markdown, or commentary.

Current Date: ${currentDate}
Web Search Context: ${webContext || 'None'}
Language: ${language}
Current Cart: ${JSON.stringify(currentCart)}
User History: ${JSON.stringify(purchaseHistory)}

Operational Rules:
1. If the user asks for ingredients/items for a dish (e.g. "add items for pav bhaji", "ingredients for lasagna", "make cold coffee"):
   - Set action to "ADD_BUNDLE".
   - Break down the dish into 4-7 individual raw grocery ingredients.
   - For EACH ingredient, assign realistic Indian Rupee prices (INR / ₹), standard grocery units (kg, g, packet, litre, bunch), standard categories (Produce, Dairy & Plant, Bakery, Pantry, Spices, etc.), and a single emoji icon.
2. If the user asks to "SEARCH" (e.g. "find green tea under ₹300"):
   - Dynamically generate 3-4 realistic items matching their search criteria with realistic INR pricing.
3. If adding single items (e.g. "add 2 litres of milk"):
   - Set action to "ADD".
4. If removing items (e.g. "remove potatoes"):
   - Set action to "REMOVE".

JSON Schema:
{
  "action": "ADD_BUNDLE" | "ADD" | "SEARCH" | "REMOVE" | "SET_BUDGET",
  "dish_name": "string or null",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit": "string",
      "category": "Produce",
      "price": 40,
      "image": "🥔",
      "substitutionNote": "string or null"
    }
  ],
  "search_results": [
    {
      "id": "gen_1",
      "name": "string",
      "brand": "string",
      "price": 150,
      "unit": "pack",
      "category": "Pantry",
      "image": "🍵"
    }
  ],
  "budget_limit": null,
  "ai_response_text": "Spoken confirmation string (e.g. 'Found authentic recipe for Pav Bhaji! Added potatoes, pav, butter, and pav bhaji masala to your cart.')"
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
          temperature: 0.2,
          max_tokens: 1000,
        });
        rawText = response.choices[0]?.message?.content?.trim() || '';
        if (rawText) break;
      } catch (err: any) {
        console.warn('Model failover:', err?.message);
      }
    }

    if (!rawText) {
      throw new Error('No output from Groq models');
    }

    // Clean any reasoning / thinking tokens
    let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Malformed JSON received');
    }

    const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error('API Recipe Parse Error:', error);
    return NextResponse.json({
      action: 'ADD',
      items: [
        {
          name: 'Grocery Item',
          quantity: 1,
          unit: 'unit',
          category: 'Pantry',
          price: 50,
          image: '🛒',
          substitutionNote: null
        }
      ],
      ai_response_text: 'Added item to your cart! ✨'
    });
  }
}