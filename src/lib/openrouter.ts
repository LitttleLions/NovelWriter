import OpenAI from "openai";

export const AVAILABLE_MODELS = [
  // ── Anthropic – Top-Tier für literarisches Schreiben ──
  {
    id: "anthropic/claude-opus-4.7",
    name: "Claude Opus 4.7",
    provider: "Anthropic",
    description: "Premium literarische Qualität, beste Prosa, höchste Kohärenz – für Schlüsselkapitel",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    description: "Aktuelle Empfehlung – exzellenter Stil, starke Figurenzeichnung, faire Preise",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    description: "Schnell und günstig – gut für Entwürfe, Outlines und Iterationen",
  },

  // ── OpenAI – Modernes Drafting ──
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    description: "OpenAI-Flagship, sehr gut im Plot-Aufbau und Dialog – breit einsetzbar",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description: "Günstige GPT-5 Variante – gute Drafting-Qualität bei niedrigen Kosten",
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    description: "Bewährter Allrounder mit großem Kontextfenster",
  },

  // ── Google Gemini – Lange Kontexte für ganze Romane ──
  {
    id: "google/gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    description: "Riesiger Kontext (1M+ Tokens), ideal um den ganzen Roman im Blick zu behalten",
  },
  {
    id: "google/gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    description: "Schnell, günstig, langer Kontext – sehr gutes Preis-Leistungs-Verhältnis",
  },

  // ── DeepSeek – Beste Preis-Leistung ──
  {
    id: "deepseek/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    description: "Neue V4-Generation, MoE mit 1M Kontext – extrem günstig und schnell",
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "DeepSeek",
    description: "Sehr günstig, überraschend gute Belletristik – ideal für Massengenerierung",
  },

  // ── Moonshot Kimi – Beliebt für Roleplay & Fiction ──
  {
    id: "moonshotai/kimi-k2.6",
    name: "Kimi K2.6",
    provider: "MoonshotAI",
    description: "Top für narrative Konsistenz und Roleplay, langes Kontextfenster",
  },

  // ── xAI Grok – Kreative Stimme ──
  {
    id: "x-ai/grok-4.1",
    name: "Grok 4.1",
    provider: "xAI",
    description: "Eigenständige kreative Stimme, gut für unkonventionelle Genres",
  },

  // ── MiniMax – Long-form Specialist ──
  {
    id: "minimax/minimax-m2.7",
    name: "MiniMax M2.7",
    provider: "MiniMax",
    description: "Sehr langes Kontextfenster, stark in chinesisch & europäisch",
  },
  {
    id: "minimax/minimax-m2",
    name: "MiniMax M2",
    provider: "MiniMax",
    description: "Vorgänger von M2.7 – langes Kontextfenster, gut für Long-form",
  },

  // ── Mistral – Europäisches Modell, gut für deutsche Texte ──
  {
    id: "mistralai/mistral-large-3",
    name: "Mistral Large 3",
    provider: "MistralAI",
    description: "Europäisches Modell mit starker Performance in Deutsch und Französisch",
  },

  // ── Qwen – Multilingual ──
  {
    id: "qwen/qwen3.6-flash",
    name: "Qwen 3.6 Flash",
    provider: "Qwen",
    description: "Neue Qwen-Generation, 1M Kontext, multimodal – schnell und günstig",
  },
  {
    id: "qwen/qwen3-72b-instruct",
    name: "Qwen 3 72B",
    provider: "Qwen",
    description: "Starke multilinguale Leistung, gut für nicht-englische Romane",
  },

  // ── OpenRouter eigene Modelle ──
  {
    id: "openrouter/owl-alpha",
    name: "Owl Alpha (Free)",
    provider: "OpenRouter",
    description: "Aktuell kostenlos – langes Kontextfenster, gut für Tool-Use & Agenten",
  },

  // ── Legacy-Modelle (ältere Versionen, weiterhin verfügbar) ──
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5 (Legacy)",
    provider: "Anthropic",
    description: "Vorgänger von Sonnet 4.6 – weiterhin solide für Belletristik",
  },
  {
    id: "anthropic/claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet (Legacy)",
    provider: "Anthropic",
    description: "Bewährter Klassiker – ausgewogen für Schreiben und Dialog",
  },
  {
    id: "anthropic/claude-3-5-haiku",
    name: "Claude 3.5 Haiku (Legacy)",
    provider: "Anthropic",
    description: "Schnell und günstig",
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus (Legacy)",
    provider: "Anthropic",
    description: "Älteres Premium-Modell mit literarischer Sprache",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (Legacy)",
    provider: "OpenAI",
    description: "Vorgänger-Flagship, multimodal",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini (Legacy)",
    provider: "OpenAI",
    description: "Schnell und kostengünstig",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash (Legacy)",
    provider: "Google",
    description: "Schnell und effizient",
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini 1.5 Pro (Legacy)",
    provider: "Google",
    description: "Großer Kontext, bewährter Allrounder",
  },
  {
    id: "deepseek/deepseek-v3",
    name: "DeepSeek V3 (Legacy)",
    provider: "DeepSeek",
    description: "Vorgänger von V3.2",
  },
  {
    id: "moonshotai/moonshot-v1-8k",
    name: "Moonshot Kimi K2.5 (Legacy)",
    provider: "MoonshotAI",
    description: "Älteres Kimi-Modell mit langem Kontext",
  },
  {
    id: "minimax/minimax-01",
    name: "MiniMax-01 (Legacy)",
    provider: "MiniMax",
    description: "Älteres MiniMax-Modell",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B (Legacy)",
    provider: "Qwen",
    description: "Vorgänger von Qwen 3 72B",
  },
];

export async function getModelInfo(modelId: string) {
  const client = getOpenRouterClient();
  const response = await fetch(`https://openrouter.ai/api/v1/models`);
  const data = await response.json();
  const model = data.data?.find((m: any) => m.id === modelId);
  return model ? {
    price_per_1k_tokens: (parseFloat(model.pricing.prompt) + parseFloat(model.pricing.completion)) * 500, // Rough average
    context_length: model.context_length
  } : null;
}

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Please add it in the Secrets tab.");
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS}`
        : "http://localhost:5000",
      "X-Title": "RomanForge AI",
    },
  });
}

export interface GenerateResult {
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export async function generateText(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 8000
): Promise<GenerateResult> {
  const client = getOpenRouterClient();

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
    frequency_penalty: 0.3,
    presence_penalty: 0.2,
  });

  return {
    content: response.choices[0]?.message?.content || "",
    prompt_tokens: response.usage?.prompt_tokens || 0,
    completion_tokens: response.usage?.completion_tokens || 0,
    total_tokens: response.usage?.total_tokens || 0,
  };
}

// Erkennt Degeneration: Token-Wiederholungsschleifen, Sprachmix, Mojibake.
// Gibt entweder { ok: true } oder { ok: false, reason: string } zurück.
// Unicode-aware: nutzt \p{L} statt \w, damit deutsche Umlaute (ä,ö,ü,ß) korrekt
// als Wortbestandteile erkannt werden.
export function detectDegeneration(text: string): { ok: true } | { ok: false; reason: string } {
  if (!text || text.trim().length < 50) {
    return { ok: false, reason: "Text ist leer oder zu kurz (< 50 Zeichen)." };
  }

  // 1. Token-Loop: dasselbe Wort 10+ mal hintereinander (mit beliebigen Trennzeichen)
  const tokenLoop = text.match(/(\p{L}{2,30})(?:[\s,.;:!?\-–—]+\1){9,}/iu);
  if (tokenLoop) {
    const word = tokenLoop[1];
    return { ok: false, reason: `Wiederholungsschleife erkannt – das Wort "${word}" wurde mindestens 10× hintereinander generiert. Das Modell ist in einer Degeneration-Schleife gefangen.` };
  }

  // 2. Phrasen-Loop: gleiche Wortgruppe (2-5 Wörter) mehr als 7× hintereinander.
  // Erkennt auch leichte Punktuations-Drift zwischen den Wiederholungen.
  const phraseLoop = text.match(/(\p{L}+(?:[\s,.;:!?\-–—]+\p{L}+){1,4})(?:[\s,.;:!?\-–—]+\1){6,}/iu);
  if (phraseLoop) {
    return { ok: false, reason: `Phrasen-Wiederholungsschleife erkannt – die gleiche Wortgruppe wurde mehr als 7× hintereinander generiert.` };
  }

  // 3. Single-token-Spam: ein einzelnes Wort macht > 25% des Texts aus
  const words = text.toLowerCase().match(/\p{L}{3,}/gu) || [];
  if (words.length > 100) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
    let maxWord = "";
    let maxCount = 0;
    for (const [w, c] of counts) {
      if (c > maxCount) { maxCount = c; maxWord = w; }
    }
    const ratio = maxCount / words.length;
    if (ratio > 0.25 && maxCount > 30) {
      return { ok: false, reason: `Übermäßige Wiederholung des Wortes "${maxWord}" (${maxCount}× = ${(ratio * 100).toFixed(0)}% aller Wörter). Modell-Output ist degeneriert.` };
    }
  }

  // 4. Mojibake / nicht-druckbare Zeichen Cluster (häufig bei kaputten Tokens)
  const garbageCluster = text.match(/[\uFFFD\u0000-\u0008\u000B-\u001F]{3,}/);
  if (garbageCluster) {
    return { ok: false, reason: `Nicht-druckbare Zeichen (Müll-Bytes) im Text – Modell-Output ist beschädigt.` };
  }

  return { ok: true };
}

const MODEL_PRICES: Record<string, { prompt: number; completion: number }> = {
  // Preise pro 1.000 Tokens in USD (Stand Mai 2026, Schätzwerte – exakte Preise via getModelInfo)
  "anthropic/claude-opus-4.7": { prompt: 0.015, completion: 0.075 },
  "anthropic/claude-sonnet-4.6": { prompt: 0.003, completion: 0.015 },
  "anthropic/claude-haiku-4.5": { prompt: 0.0008, completion: 0.004 },
  "openai/gpt-5": { prompt: 0.005, completion: 0.02 },
  "openai/gpt-5-mini": { prompt: 0.0005, completion: 0.002 },
  "openai/gpt-4.1": { prompt: 0.0025, completion: 0.01 },
  "google/gemini-3-pro": { prompt: 0.00125, completion: 0.005 },
  "google/gemini-3-flash": { prompt: 0.0001, completion: 0.0004 },
  "deepseek/deepseek-v4-flash": { prompt: 0.00014, completion: 0.00028 },
  "deepseek/deepseek-v3.2": { prompt: 0.00027, completion: 0.0011 },
  "moonshotai/kimi-k2.6": { prompt: 0.0006, completion: 0.0025 },
  "x-ai/grok-4.1": { prompt: 0.002, completion: 0.01 },
  "minimax/minimax-m2.7": { prompt: 0.0003, completion: 0.0011 },
  "mistralai/mistral-large-3": { prompt: 0.002, completion: 0.006 },
  "qwen/qwen3.6-flash": { prompt: 0.00025, completion: 0.0015 },
  "qwen/qwen3-72b-instruct": { prompt: 0.0004, completion: 0.0008 },
  "openrouter/owl-alpha": { prompt: 0, completion: 0 },

  // ── Legacy-IDs: nur für Kostenberechnung bestehender Projekte (nicht mehr in AVAILABLE_MODELS) ──
  "anthropic/claude-sonnet-4-5": { prompt: 0.003, completion: 0.015 },
  "anthropic/claude-3-5-sonnet": { prompt: 0.003, completion: 0.015 },
  "anthropic/claude-3-5-haiku": { prompt: 0.0008, completion: 0.004 },
  "anthropic/claude-3-opus": { prompt: 0.015, completion: 0.075 },
  "openai/gpt-4o": { prompt: 0.0025, completion: 0.01 },
  "openai/gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "google/gemini-2.0-flash-001": { prompt: 0.0001, completion: 0.0004 },
  "google/gemini-pro-1.5": { prompt: 0.00125, completion: 0.005 },
  "deepseek/deepseek-v3": { prompt: 0.00027, completion: 0.0011 },
  "moonshotai/moonshot-v1-8k": { prompt: 0.0012, completion: 0.0012 },
  "minimax/minimax-01": { prompt: 0.0003, completion: 0.0011 },
  "qwen/qwen-2.5-72b-instruct": { prompt: 0.0004, completion: 0.0004 },
};

export function estimateCost(modelId: string, promptTokens: number, completionTokens: number): number {
  const prices = MODEL_PRICES[modelId];
  if (!prices) return 0;
  return (promptTokens / 1000) * prices.prompt + (completionTokens / 1000) * prices.completion;
}

export function describeAiError(error: any): { message: string; status: number } {
  const raw: string =
    error?.error?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    String(error || "Unbekannter Fehler");

  const status: number =
    error?.status ||
    error?.response?.status ||
    error?.error?.code ||
    500;

  const lower = raw.toLowerCase();

  if (raw.includes("OPENROUTER_API_KEY is not set")) {
    return {
      message: "Kein OpenRouter-API-Key hinterlegt. Bitte trage einen gültigen Key in den Secrets ein (OPENROUTER_API_KEY).",
      status: 503,
    };
  }
  if (status === 401 || lower.includes("user not found") || lower.includes("invalid api key") || lower.includes("no auth credentials")) {
    return {
      message: "OpenRouter lehnt den API-Key ab (ungültig, abgelaufen oder Account gelöscht). Erstelle unter openrouter.ai/keys einen neuen Key und ersetze das Secret OPENROUTER_API_KEY.",
      status: 502,
    };
  }
  if (status === 402 || lower.includes("insufficient") || lower.includes("credit") || lower.includes("balance")) {
    return {
      message: "OpenRouter-Guthaben aufgebraucht. Lade auf openrouter.ai/credits Credits auf und versuche es erneut.",
      status: 502,
    };
  }
  if (status === 429 || lower.includes("rate limit") || lower.includes("too many")) {
    return {
      message: "OpenRouter-Rate-Limit erreicht. Bitte warte einen Moment und versuche es erneut.",
      status: 502,
    };
  }
  if (status === 404 || lower.includes("model not found") || lower.includes("no allowed providers") || lower.includes("model is not available")) {
    return {
      message: "Das ausgewählte KI-Modell ist bei OpenRouter nicht (mehr) verfügbar. Wähle ein anderes Modell in den Projekteinstellungen.",
      status: 502,
    };
  }
  if (status === 408 || lower.includes("timeout") || lower.includes("timed out")) {
    return {
      message: "Die KI hat zu lange gebraucht (Timeout). Versuche es erneut oder wähle ein schnelleres Modell.",
      status: 504,
    };
  }
  if (status >= 500 || lower.includes("upstream") || lower.includes("provider") || lower.includes("internal server")) {
    return {
      message: "OpenRouter oder der KI-Anbieter meldet ein Server-Problem. Bitte in ein paar Minuten erneut versuchen.",
      status: 502,
    };
  }
  if (lower.includes("context length") || lower.includes("maximum context") || lower.includes("too long")) {
    return {
      message: "Die Eingabe ist zu lang für das Modell. Kürze Outline/Charaktere oder wähle ein Modell mit größerem Kontextfenster.",
      status: 413,
    };
  }
  if (lower.includes("content policy") || lower.includes("safety") || lower.includes("blocked")) {
    return {
      message: "Der KI-Anbieter hat den Inhalt abgelehnt (Inhaltsrichtlinie). Formuliere die Vorgaben weniger explizit oder wechsle das Modell.",
      status: 502,
    };
  }

  return {
    message: `KI-Fehler: ${raw}`,
    status: 500,
  };
}

export async function streamText(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 8000
) {
  const client = getOpenRouterClient();

  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
    frequency_penalty: 0.3,
    presence_penalty: 0.2,
    stream: true,
  });

  return stream;
}
