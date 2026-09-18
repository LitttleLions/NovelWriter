import pool, { query } from "@/lib/db";

export const ALLOWED_PROVIDER_PREFIXES = [
  "deepseek/",
  "google/",
  "anthropic/",
  "moonshotai/",
  "openai/",
  "qwen/",
  "z-ai/",
] as const;

export const MAX_PRICE_USD_PER_MILLION_TOKENS = 20;
export const MODELS_CACHE_TTL_MS = 60 * 60 * 1000;
export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.6";
export const MAX_ADDITIONAL_MODELS = 4;

const LEGACY_OPENAI_MODEL_PATTERNS = [
  /^openai\/gpt-3\.5(?:-|$)/i,
  /^openai\/gpt-4(?:-|$)/i,
  /^openai\/gpt-4o(?:-|$)/i,
  /^openai\/chatgpt-4o(?:-|$)/i,
  /^openai\/text-/i,
  /^openai\/(?:ada|babbage|curie|davinci)(?:-|$)/i,
] as const;

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  prompt_price_per_million: number;
  completion_price_per_million: number;
  context_length: number;
  supports_vision: boolean;
}

let schemaPromise: Promise<void> | null = null;
const AI_SCHEMA_LOCK_KEY = 731942;

export function ensureAiSettingsSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const client = await pool.connect();
      try {
        // Next.js can evaluate route modules independently and React StrictMode
        // can trigger duplicate requests. The process-local promise is not
        // enough in those cases, so serialize DDL at the database level too.
        await client.query("SELECT pg_advisory_lock($1)", [AI_SCHEMA_LOCK_KEY]);
        try {
          await client.query("BEGIN");
          await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS ai_settings (
              id BOOLEAN PRIMARY KEY DEFAULT TRUE,
              default_model VARCHAR(255) NOT NULL DEFAULT '${DEFAULT_MODEL_ID}',
              allowed_models TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
              updated_at TIMESTAMP DEFAULT NOW(),
              CONSTRAINT ai_settings_singleton CHECK (id = TRUE)
            )
          `);
          await client.query(`
            ALTER TABLE ai_settings
            ADD COLUMN IF NOT EXISTS allowed_models TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
          `);
          await client.query(
            `INSERT INTO ai_settings (id, default_model, allowed_models)
             VALUES (TRUE, $1::TEXT, ARRAY[$1::TEXT]::TEXT[])
             ON CONFLICT (id) DO NOTHING`,
            [DEFAULT_MODEL_ID],
          );
          await client.query(`
            UPDATE ai_settings
            SET allowed_models = ARRAY[default_model]::TEXT[]
            WHERE id = TRUE
              AND (allowed_models IS NULL OR cardinality(allowed_models) = 0)
          `);

          // Existing single-user installations get a usable admin without
          // exposing a public role-assignment endpoint. ADMIN_EMAIL can
          // explicitly select the operator account in multi-user installations.
          const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
          if (adminEmail) {
            await client.query(
              "UPDATE users SET is_admin = TRUE WHERE LOWER(email) = $1",
              [adminEmail],
            );
          }
          await client.query(`
            UPDATE users
            SET is_admin = TRUE
            WHERE id = (SELECT MIN(id) FROM users)
              AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = TRUE)
          `);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          await client.query("SELECT pg_advisory_unlock($1)", [AI_SCHEMA_LOCK_KEY]).catch(() => {});
        }
      } finally {
        client.release();
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function priceToPerMillion(value: unknown): number {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0) ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    return Infinity;
  }
  const pricePerToken = Number(value);
  if (!Number.isFinite(pricePerToken) || pricePerToken < 0) return Infinity;
  return pricePerToken * 1_000_000;
}

function providerLabel(id: string): string {
  const provider = id.split("/")[0] || "Unbekannt";
  const labels: Record<string, string> = {
    anthropic: "Anthropic",
    deepseek: "DeepSeek",
    google: "Google",
    moonshotai: "Moonshot AI",
    openai: "OpenAI",
    qwen: "Qwen",
    "z-ai": "Z.ai",
  };
  return labels[provider] || provider;
}

export function isLegacyOpenAiModel(modelId: string): boolean {
  return LEGACY_OPENAI_MODEL_PATTERNS.some((pattern) => pattern.test(modelId));
}

function modelSupportsVision(raw: any): boolean {
  const modalities = raw?.architecture?.input_modalities;
  if (Array.isArray(modalities)) {
    return modalities.some((value) => String(value).toLowerCase() === "image");
  }
  const legacyModality = String(raw?.architecture?.modality || "").toLowerCase();
  return legacyModality.includes("image");
}

function toSlimModel(raw: any): AiModel | null {
  if (!raw || typeof raw.id !== "string") return null;
  if (!ALLOWED_PROVIDER_PREFIXES.some((prefix) => raw.id.startsWith(prefix))) return null;
  if (isLegacyOpenAiModel(raw.id)) return null;

  const promptPrice = priceToPerMillion(raw.pricing?.prompt);
  const completionPrice = priceToPerMillion(raw.pricing?.completion);
  if (
    !Number.isFinite(promptPrice) ||
    !Number.isFinite(completionPrice) ||
    promptPrice > MAX_PRICE_USD_PER_MILLION_TOKENS ||
    completionPrice > MAX_PRICE_USD_PER_MILLION_TOKENS
  ) {
    return null;
  }

  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : raw.id,
    provider: providerLabel(raw.id),
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    prompt_price_per_million: promptPrice,
    completion_price_per_million: completionPrice,
    context_length: Number.isFinite(Number(raw.context_length)) ? Number(raw.context_length) : 0,
    supports_vision: modelSupportsVision(raw),
  };
}

async function fetchLiveModels(): Promise<AiModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Please add it in the Secrets tab.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS}`
        : "http://localhost:5000",
      "X-Title": "RomanForge AI",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenRouter-Modellliste konnte nicht geladen werden (${response.status}). ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const models = Array.isArray(data?.data)
    ? data.data.map(toSlimModel).filter(Boolean) as AiModel[]
    : [];
  models.sort((a, b) =>
    (a.prompt_price_per_million + a.completion_price_per_million) -
    (b.prompt_price_per_million + b.completion_price_per_million) ||
    a.name.localeCompare(b.name),
  );
  return models;
}

let modelsCache: { expiresAt: number; models: AiModel[] } | null = null;
let modelsFetchPromise: Promise<AiModel[]> | null = null;

export async function getAvailableModels(forceRefresh = false): Promise<AiModel[]> {
  if (!forceRefresh && modelsCache && modelsCache.expiresAt > Date.now()) {
    return modelsCache.models;
  }
  if (!modelsFetchPromise) {
    modelsFetchPromise = fetchLiveModels()
      .then((models) => {
        modelsCache = { models, expiresAt: Date.now() + MODELS_CACHE_TTL_MS };
        return models;
      })
      .finally(() => {
        modelsFetchPromise = null;
      });
  }
  return modelsFetchPromise;
}

export interface AiSettings {
  id: boolean;
  default_model: string;
  allowed_models: string[];
  updated_at?: string;
}

function normalizeModelIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((modelId): modelId is string => typeof modelId === "string" && modelId.trim().length > 0)
        .map((modelId) => modelId.trim()),
    ),
  ];
}

export async function getAiSettings(): Promise<AiSettings> {
  await ensureAiSettingsSchema();
  const result = await query(
    "SELECT id, default_model, allowed_models, updated_at FROM ai_settings WHERE id = TRUE",
  );
  const row = result.rows[0];
  if (!row) {
    return { id: true, default_model: DEFAULT_MODEL_ID, allowed_models: [DEFAULT_MODEL_ID] };
  }
  const defaultModel = String(row.default_model || DEFAULT_MODEL_ID);
  const configuredModels = normalizeModelIds(row.allowed_models);
  return {
    ...row,
    default_model: defaultModel,
    allowed_models: configuredModels.includes(defaultModel)
      ? configuredModels
      : [defaultModel, ...configuredModels],
  };
}

function modelsByIds(models: AiModel[], ids: string[]): AiModel[] {
  return ids.map((id) => models.find((model) => model.id === id)).filter(Boolean) as AiModel[];
}

export async function getSelectableModels(forceRefresh = false): Promise<AiModel[]> {
  const [models, settings] = await Promise.all([
    getAvailableModels(forceRefresh),
    getAiSettings(),
  ]);
  return modelsByIds(models, settings.allowed_models);
}

export async function validateProjectModel(modelId?: unknown): Promise<string> {
  const [settings, selectableModels] = await Promise.all([
    getAiSettings(),
    getSelectableModels(),
  ]);
  const requested = typeof modelId === "string" ? modelId.trim() : "";
  if (!requested) {
    if (selectableModels.some((model) => model.id === settings.default_model)) {
      return settings.default_model;
    }
    return resolveModel();
  }
  if (!selectableModels.some((model) => model.id === requested)) {
    throw new Error("Das gewählte Modell ist nicht für dieses Projekt freigegeben oder nicht mehr verfügbar.");
  }
  return requested;
}

export async function setAiSettings(defaultModel: string, additionalModels: string[]): Promise<AiSettings> {
  const models = await getAvailableModels(true);
  const nextDefault = defaultModel.trim();
  const extras = normalizeModelIds(additionalModels).filter((modelId) => modelId !== nextDefault);
  if (extras.length > MAX_ADDITIONAL_MODELS) {
    throw new Error(`Es können höchstens ${MAX_ADDITIONAL_MODELS} zusätzliche Modelle freigegeben werden.`);
  }

  const ids = [nextDefault, ...extras];
  const selectedModels = modelsByIds(models, ids);
  if (!nextDefault || selectedModels.length !== ids.length) {
    throw new Error("Mindestens ein gewähltes Modell ist nicht verfügbar oder überschreitet die erlaubte Preisgrenze.");
  }

  await ensureAiSettingsSchema();
  await query(
    `INSERT INTO ai_settings (id, default_model, allowed_models, updated_at)
     VALUES (TRUE, $1, $2::TEXT[], NOW())
     ON CONFLICT (id) DO UPDATE
     SET default_model = EXCLUDED.default_model,
         allowed_models = EXCLUDED.allowed_models,
         updated_at = NOW()`,
    [nextDefault, ids],
  );
  return {
    id: true,
    default_model: nextDefault,
    allowed_models: ids,
    updated_at: new Date().toISOString(),
  };
}

// Kept as a compatibility wrapper for callers that only change the default.
export async function setDefaultModel(modelId: string): Promise<AiModel> {
  const settings = await getAiSettings();
  const updated = await setAiSettings(
    modelId,
    settings.allowed_models.filter((id) => id !== modelId),
  );
  const models = await getAvailableModels();
  return models.find((model) => model.id === updated.default_model)!;
}

export async function resolveModel(preferredModel?: string): Promise<string> {
  const [models, settings] = await Promise.all([
    getAvailableModels(),
    getAiSettings(),
  ]);
  if (models.length === 0) {
    throw new Error("Keine zulässigen KI-Modelle verfügbar. Prüfe die OpenRouter-Modellliste und den API-Key.");
  }

  const liveIds = new Set(models.map((model) => model.id));
  const selectableIds = settings.allowed_models.filter((modelId) => liveIds.has(modelId));
  if (preferredModel && selectableIds.includes(preferredModel)) return preferredModel;
  if (settings.default_model && selectableIds.includes(settings.default_model)) {
    return settings.default_model;
  }

  const operatorModel = process.env.OPENROUTER_MODEL?.trim();
  if (operatorModel && liveIds.has(operatorModel)) return operatorModel;

  return models.find((model) => selectableIds.includes(model.id))?.id || models[0].id;
}

export function clearModelsCache() {
  modelsCache = null;
}

export function getCachedModelPrice(modelId: string) {
  const model = modelsCache?.models.find((candidate) => candidate.id === modelId);
  return model
    ? { prompt: model.prompt_price_per_million, completion: model.completion_price_per_million }
    : null;
}