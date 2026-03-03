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

export async function generateText(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 8000
): Promise<string> {
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

  return response.choices[0]?.message?.content || "";
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
