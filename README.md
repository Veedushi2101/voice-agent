# MaisonCart — Voice-Activated Smart Shopping Assistant

> A production-grade, AI-powered Indian grocery and pantry shopping assistant with voice control, intelligent product discovery, dietary suggestions, restock intelligence, and live deal discovery.

---

## Overview

MaisonCart is a voice-first smart shopping assistant designed to make grocery shopping faster and more intuitive.

Users can speak naturally to add products, modify quantities, search within a budget, request recipe ingredients, check restock requirements, discover deals, and ask conversational questions.

The application combines the **Web Speech API**, **Groq LLM inference**, **Zustand state management**, and deterministic fallback logic to provide a resilient shopping experience.

---

## Approach & Architecture

MaisonCart is built using **Next.js App Router, React, TypeScript, Tailwind CSS, and Zustand**.

Voice input is handled through the browser's Web Speech API using `webkitSpeechRecognition`. Continuous speech buffering prevents short conversational pauses from prematurely ending recognition. The application supports multiple locales, including `en-IN`, `hi-IN`, `en-US`, and `es-ES`.

Recognized speech is sent to Groq-powered inference endpoints where natural-language commands are converted into structured JSON intents. This allows the system to identify multiple products, quantities, units, recipes, brands, and price constraints from a single command.

The application also provides proactive intelligence through purchase-cycle analysis, helping identify products that may need restocking. Dietary substitution suggestions and live deal discovery further improve the shopping experience.

For reliability, MaisonCart uses a two-level architecture. Conversational and unavailable-product requests are handled without contaminating the shopping cart. If the AI endpoint becomes unavailable or rate-limited, a deterministic local regex parser provides fallback support for essential shopping commands.

---

## Key Features

### Voice Shopping

* Natural-language grocery commands
* Continuous voice recognition
* Multilingual speech recognition
* Voice feedback using speech synthesis
* Multi-item commands

### Intelligent Shopping

* Recipe ingredient decomposition
* Smart restock suggestions
* Purchase-cycle analysis
* Dietary substitutions
* Seasonal produce recommendations
* Live deals and discounts

### Smart Search

* Product and brand recognition
* Budget-based filtering
* Commands such as:

  * `"Find green tea under ₹300"`
  * `"Show me Tata Salt"`
  * `"Find milk below ₹70"`

### Cart Management

* Voice-based add, remove, and modify operations
* Quantity modification
* Unit-aware products
* Automatic product categorization
* Produce, Dairy, Bakery, and Pantry sections

### Resilience

* Strict structured AI responses
* Non-polluting intent routing
* Local regex fallback
* API failure handling
* Rate-limit handling
* Continuous speech buffering

---

## Feature & Rubric Verification Matrix

| Requirement                     | Implementation                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Voice Input & NLP**           | Continuous Web Speech API recognition, multilingual support, Groq-powered intent parsing, and recipe decomposition |
| **Smart Suggestions**           | Purchase-cycle analysis, restock alerts, dietary substitutions, seasonal recommendations, and live deals           |
| **Cart Management**             | Voice add/remove/modify, quantity controls, unit-aware products, and automatic categories                          |
| **Voice Search & Filters**      | Voice-based product search, brand recognition, and numerical budget filtering                                      |
| **UI/UX & Feedback**            | Responsive interface, microphone states, loading indicators, speech feedback, and command guide                    |
| **Error Handling & Edge Cases** | Intent guardrails, strict JSON validation, API fallback, and regex-based recovery                                  |

---

## Tech Stack

| Technology         | Purpose                          |
| ------------------ | -------------------------------- |
| **Next.js**        | Application framework            |
| **React**          | UI development                   |
| **TypeScript**     | Type-safe development            |
| **Tailwind CSS**   | Styling and responsive UI        |
| **Zustand**        | Global state management          |
| **Web Speech API** | Speech recognition and synthesis |
| **Groq SDK**       | AI/NLP inference                 |
| **Lucide React**   | UI icons                         |
| **LocalStorage**   | Persistent shopping state        |

### AI Models

MaisonCart is designed to work with Groq-hosted models including:

* `openai/gpt-oss-120b`
* `openai/gpt-oss-20b`
* `qwen/qwen3.6-27b`

---

## Project Architecture

```text
voice-agent/
├── app/
│   ├── api/
│   │   └── voice/
│   │       └── route.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── src/
│   └── store/
│       ├── useShoppingStore.ts
│       └── useVoiceAssistant.ts
│
├── .env.local
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── eslint.config.mjs
├── next-env.d.ts
├── package.json
└── README.md
```

> Update the directory structure above if the repository uses different folder names.

---

## Getting Started

### Prerequisites

Make sure you have:

* Node.js 18.x or higher
* npm
* A Groq Cloud API key
* Google Chrome, Microsoft Edge, or Safari for voice features

A Groq API key can be created from [Groq Console](https://console.groq.com?utm_source=chatgpt.com).

---

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/your-username/maison-cart.git
cd maison-cart
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```

Do not commit `.env.local` or expose your API key publicly.

#### 4. Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

For microphone access, use **localhost or HTTPS** and grant microphone permission when prompted.

---

## Voice Test Suite

Use the following commands to verify the major functionality.

| Category                  | Example Command                                   | Expected Behavior                                                 |
| ------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| **Multi-Item Add**        | `"Add 2 kg potatoes and 3 packets of toned milk"` | Adds both products with quantities and correct categories         |
| **Recipe Bundle**         | `"Add ingredients for Pav Bhaji"`                 | Adds relevant recipe ingredients with estimated pricing           |
| **Quantity Modification** | `"Change potatoes to 4 kg"`                       | Updates the potato quantity and unit                              |
| **Price Filter**          | `"Find green tea under ₹300"`                     | Displays matching products below the specified price              |
| **Dietary Substitute**    | `"Add 1 kg of white sugar"`                       | Adds sugar and displays a jaggery substitution suggestion         |
| **Restock Alert**         | `"What am I running low on?"`                     | Analyzes purchase history and suggests products for replenishment |
| **Deals**                 | `"Show today's deals and discounts"`              | Displays available discounted grocery products                    |
| **Seasonal Produce**      | `"What is in season right now?"`                  | Recommends seasonal produce                                       |
| **Conversational Query**  | `"Will I get more discount?"`                     | Provides an informational response without modifying the cart     |

---

## Resilience & Fault Tolerance

### Non-Polluting Intent Router

MaisonCart distinguishes between purchasing commands and conversational requests.

For example:

```text
"Add 2 kg rice"
→ CART_ADD
```

while:

```text
"Will I get more discount?"
→ INFO
```

Informational queries do not create unwanted products in the shopping cart.

---

### Continuous Audio Buffer

The voice interface maintains recognition across short conversational pauses, reducing premature termination during natural speech.

This makes commands such as:

```text
"Add 2 kg potatoes ... and 3 packets of milk"
```

more reliable.

---

### Local Regex Fallback

If the AI service experiences:

* Network failure
* API timeout
* Rate limiting
* Temporary service interruption

MaisonCart can fall back to deterministic local parsing for supported shopping commands.

This ensures essential cart operations can continue even when the AI service is unavailable.

---

## Example Commands

### Add Products

```text
"Add 2 kg potatoes"
```

```text
"Add 1 litre Amul milk and 2 packets of bread"
```

### Modify Products

```text
"Change potatoes to 4 kg"
```

```text
"Remove milk from my cart"
```

### Search

```text
"Find green tea under ₹300"
```

```text
"Search for Tata Salt"
```

### Recipe

```text
"Add ingredients for Pav Bhaji"
```

### Intelligence

```text
"What am I running low on?"
```

```text
"What vegetables are in season?"
```

```text
"Show today's deals"
```

---

## Security

* Store API keys only in environment variables.
* Never commit `.env.local` to Git.
* Do not expose `GROQ_API_KEY` to client-side code.
* Validate AI-generated responses before updating application state.
* Handle malformed or unexpected AI responses safely.

Add the following to `.gitignore` if it is not already present:

```gitignore
.env
.env.local
.env.*.local
node_modules/
.next/
```

---

## Performance & Reliability

MaisonCart focuses on:

* Fast voice-to-intent processing
* Minimal cart interaction latency
* Persistent shopping state
* Graceful AI failures
* Deterministic fallback processing
* Responsive UI across desktop and mobile
* Clear visual and audio feedback

---

## Future Improvements

Potential future enhancements include:

* User-specific shopping profiles
* Household-based shared carts
* More regional Indian languages
* Personalized grocery recommendations
* Price comparison across multiple quick-commerce platforms
* Barcode scanning
* Order tracking
* Personalized nutrition intelligence
* Offline-first voice commands
* Progressive Web App support

---

## License

This project is intended for demonstration, evaluation, and development purposes.

---

## Author

**Veedushi Jain**

MaisonCart — Voice-Activated Smart Shopping Assistant
