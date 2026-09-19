import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, connectMock, fetchMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  connectMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: { connect: connectMock },
  query: queryMock,
}));

import {
  classifyModelFreshness,
  clearModelsCache,
  getAiSettings,
  getAvailableModels,
  getSelectableModels,
  resolveModel,
  setAiSettings,
  validateProjectModel,
} from "@/lib/ai-settings";

const standardModel = "anthropic/claude-sonnet-4.6";
const alternateModel = "google/gemini-2.5-pro";
const thirdModel = "openai/gpt-4.1";

function rawModel(id: string) {
  return {
    id,
    name: id,
    created: new Date().toISOString(),
    pricing: { prompt: "0.000001", completion: "0.000002" },
    context_length: 100_000,
  };
}

function mockLiveModels(ids: string[]) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: ids.map(rawModel) }),
  });
}

function mockRawLiveModels(models: unknown[]) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: models }),
  });
}

function mockSettings(defaultModel = standardModel, allowedModels = [standardModel, alternateModel]) {
  queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes("SELECT id, default_model, allowed_models")) {
      return {
        rows: [{ id: true, default_model: defaultModel, allowed_models: allowedModels }],
      };
    }
    return { rows: [] };
  });
}

describe("AI model permission policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearModelsCache();
    vi.stubGlobal("fetch", fetchMock);
    const clientQuery = vi.fn().mockResolvedValue({ rows: [] });
    connectMock.mockResolvedValue({ query: clientQuery, release: vi.fn() });
    mockSettings();
  });

  it("accepts one default and no more than five additional live models", async () => {
    const additionalModels = [
      alternateModel,
      thirdModel,
      "deepseek/deepseek-chat",
      "qwen/qwen-max",
      "moonshotai/kimi-k2",
    ];
    mockLiveModels([standardModel, ...additionalModels]);

    const settings = await setAiSettings(` ${standardModel} `, additionalModels);

    expect(settings.default_model).toBe(standardModel);
    expect(settings.allowed_models).toEqual([standardModel, ...additionalModels]);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO ai_settings"),
      [standardModel, [standardModel, ...additionalModels]],
    );
  });

  it("rejects a sixth additional model and models outside the live allowlist", async () => {
    const additionalModels = [
      alternateModel,
      thirdModel,
      "deepseek/deepseek-chat",
      "qwen/qwen-max",
      "openai/gpt-4o",
      "moonshotai/kimi-k2",
    ];
    mockLiveModels([standardModel, ...additionalModels]);

    await expect(setAiSettings(standardModel, additionalModels)).rejects.toThrow(
      "höchstens 5 zusätzliche Modelle",
    );

    clearModelsCache();
    mockLiveModels([standardModel, alternateModel]);
    await expect(setAiSettings(standardModel, ["not-allowlisted/model"])).rejects.toThrow(
      "nicht verfügbar",
    );
  });

  it("keeps the default model and caps a legacy allowlist at six total models", async () => {
    const legacyAllowlist = [
      "provider/legacy-one",
      "provider/legacy-two",
      "provider/legacy-three",
      "provider/legacy-four",
      "provider/legacy-five",
      "provider/legacy-six",
      "provider/legacy-seven",
    ];
    mockSettings(standardModel, [standardModel, ...legacyAllowlist]);

    const settings = await getAiSettings();

    expect(settings.allowed_models).toHaveLength(6);
    expect(settings.allowed_models[0]).toBe(standardModel);
    expect(settings.allowed_models).toEqual([standardModel, ...legacyAllowlist.slice(0, 5)]);
  });

  it("includes GLM and Kimi models while excluding legacy OpenAI families", async () => {
    const glmModel = "z-ai/glm-4.5";
    const kimiModel = "moonshotai/kimi-k2";
    const currentOpenAiModel = "openai/gpt-4.1";
    const legacyModels = [
      "openai/gpt-3.5-turbo",
      "openai/gpt-4",
      "openai/gpt-4-turbo",
      "openai/gpt-4o",
      "openai/text-davinci-003",
    ];

    mockLiveModels([glmModel, kimiModel, currentOpenAiModel, ...legacyModels]);

    await expect(getAvailableModels()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: glmModel, provider: "Z.ai" }),
        expect.objectContaining({ id: kimiModel, provider: "Moonshot AI" }),
        expect.objectContaining({ id: currentOpenAiModel }),
      ]),
    );
    const models = await getAvailableModels();
    expect(models.map((model) => model.id)).not.toEqual(expect.arrayContaining(legacyModels));
  });

  it("keeps the existing price policy for newly supported providers", async () => {
    const affordableKimi = rawModel("moonshotai/kimi-k2");
    const expensiveGlm = {
      ...rawModel("z-ai/glm-4.5"),
      pricing: { prompt: "0.000021", completion: "0.000002" },
    };
    const missingPriceModel = {
      ...rawModel("z-ai/glm-4.5-air"),
      pricing: { prompt: null, completion: "0.000002" },
    };
    mockRawLiveModels([affordableKimi, expensiveGlm, missingPriceModel]);

    const models = await getAvailableModels();

    expect(models.map((model) => model.id)).toEqual(["moonshotai/kimi-k2"]);
  });

  it("classifies current, older, historical, deprecated, and unknown catalog entries", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    expect(classifyModelFreshness("2025-09-19T12:00:00.000Z", null, now)).toBe("current");
    expect(classifyModelFreshness("2025-09-18T12:00:00.000Z", null, now)).toBe("older");
    expect(classifyModelFreshness("2024-09-18T12:00:00.000Z", null, now)).toBe("historical");
    expect(classifyModelFreshness("2026-01-01T12:00:00.000Z", "2026-09-18T12:00:00.000Z", now)).toBe("deprecated");
    expect(classifyModelFreshness(undefined, undefined, now)).toBe("unknown");
  });

  it("returns older and unknown models only as explicitly filtered catalog entries", async () => {
    const current = rawModel("qwen/current");
    const older = { ...rawModel("qwen/older"), created: "2025-01-01T00:00:00.000Z" };
    const historical = { ...rawModel("qwen/historical"), created: "2024-01-01T00:00:00.000Z" };
    const deprecated = {
      ...rawModel("qwen/deprecated"),
      expiration_date: "2026-01-01T00:00:00.000Z",
    };
    const unknown = { ...rawModel("qwen/unknown"), created: undefined };
    mockRawLiveModels([older, unknown, historical, deprecated, current]);

    const models = await getAvailableModels();

    expect(models.map((model) => model.id)).toEqual(["qwen/current", "qwen/older", "qwen/unknown"]);
    expect(models.map((model) => model.freshness)).toEqual(["current", "older", "unknown"]);
  });

  it("does not allow older or unknown models for new global approvals", async () => {
    const current = rawModel(standardModel);
    const older = { ...rawModel(alternateModel), created: "2025-01-01T00:00:00.000Z" };
    const unknown = { ...rawModel(thirdModel), created: undefined };
    mockRawLiveModels([current, older, unknown]);

    await expect(setAiSettings(alternateModel, [])).rejects.toThrow("nicht verfügbar");
    await expect(setAiSettings(standardModel, [thirdModel])).rejects.toThrow("nicht verfügbar");
  });

  it("keeps saved historical selections while excluding them from new selectable models", async () => {
    const historicalModel = "qwen/historical";
    mockSettings(historicalModel, [historicalModel, standardModel]);
    mockLiveModels([standardModel]);

    await expect(getAiSettings()).resolves.toMatchObject({
      default_model: historicalModel,
      allowed_models: [historicalModel, standardModel],
    });
    await expect(getSelectableModels()).resolves.toEqual([
      expect.objectContaining({ id: standardModel, freshness: "current" }),
    ]);
  });

  it("preserves approved project choices and rejects arbitrary IDs", async () => {
    mockLiveModels([standardModel, alternateModel, thirdModel]);

    await expect(validateProjectModel(` ${alternateModel} `)).resolves.toBe(alternateModel);
    await expect(validateProjectModel("openrouter/unapproved-model")).rejects.toThrow(
      "nicht für dieses Projekt freigegeben",
    );
  });

  it("resolves removed historical choices to the current standard", async () => {
    mockLiveModels([standardModel, alternateModel]);

    await expect(resolveModel("provider/removed-model")).resolves.toBe(standardModel);
    await expect(resolveModel(alternateModel)).resolves.toBe(alternateModel);
  });

  it("falls back when the configured default is no longer live", async () => {
    mockSettings("provider/removed-default", [alternateModel]);
    mockLiveModels([alternateModel]);

    await expect(resolveModel()).resolves.toBe(alternateModel);
    await expect(getAiSettings()).resolves.toMatchObject({
      default_model: "provider/removed-default",
      allowed_models: ["provider/removed-default", alternateModel],
    });
  });
});