import OpenAI from "openai";

export const AVAILABLE_MODELS = [
  {
    id: "anthropic/claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Previous-gen balanced model",
  },
  {
    id: "anthropic/claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    description: "Fast and affordable",
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Expressive, literary language, strong dialogue",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Multimodal flagship, great for drafting",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fast and cost-effective",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Fast and efficient",
  },
  {
    id: "google/gemini-2.0-flash-lite-preview-02-05",
    name: "Gemini 2.0 Flash Lite",
    provider: "Google",
    description: "Extremely fast, low latency",
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    description: "Strong for complex worlds, long context",
  },
  {
    id: "deepseek/deepseek-v3",
    name: "DeepSeek V3.2",
    provider: "DeepSeek",
    description: "Latest DeepSeek flagship model",
  },
  {
    id: "minimax/minimax-01",
    name: "MiniMax M2-Her",
    provider: "MiniMax",
    description: "Strong performance across tasks",
  },
  {
    id: "moonshotai/moonshot-v1-8k",
    name: "Moonshot Kimi K2.5",
    provider: "MoonshotAI",
    description: "Excellent long-context and logic",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Qwen",
    description: "Strong multilingual performance",
  },
  {
    id: "qwen/qwen-2.5-7b-instruct",
    name: "Qwen 2.5 7B",
    provider: "Qwen",
    description: "Fast and capable small model",
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
  });

  return {
    content: response.choices[0]?.message?.content || "",
    prompt_tokens: response.usage?.prompt_tokens || 0,
    completion_tokens: response.usage?.completion_tokens || 0,
    total_tokens: response.usage?.total_tokens || 0,
  };
}

const MODEL_PRICES: Record<string, { prompt: number; completion: number }> = {
  "anthropic/claude-3-5-sonnet": { prompt: 0.003, completion: 0.015 },
  "anthropic/claude-3-5-haiku": { prompt: 0.0008, completion: 0.004 },
  "anthropic/claude-3-opus": { prompt: 0.015, completion: 0.075 },
  "openai/gpt-4o": { prompt: 0.0025, completion: 0.01 },
  "openai/gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "google/gemini-2.0-flash-001": { prompt: 0.0001, completion: 0.0004 },
  "google/gemini-2.0-flash-lite-preview-02-05": { prompt: 0.000075, completion: 0.0003 },
  "google/gemini-pro-1.5": { prompt: 0.00125, completion: 0.005 },
  "deepseek/deepseek-v3": { prompt: 0.00027, completion: 0.0011 },
  "minimax/minimax-01": { prompt: 0.0003, completion: 0.0011 },
  "moonshotai/moonshot-v1-8k": { prompt: 0.0012, completion: 0.0012 },
  "qwen/qwen-2.5-72b-instruct": { prompt: 0.0004, completion: 0.0004 },
  "qwen/qwen-2.5-7b-instruct": { prompt: 0.0001, completion: 0.0002 },
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
    stream: true,
  });

  return stream;
}
