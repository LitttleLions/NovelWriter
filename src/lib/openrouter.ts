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
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    description: "Powerful open-weights model",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    description: "Reasoning-focused model",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Qwen",
    description: "Strong multilingual performance",
  },
  {
    id: "qwen/qwen-turbo",
    name: "Qwen Turbo",
    provider: "Qwen",
    description: "Fast and efficient",
  },
];

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
