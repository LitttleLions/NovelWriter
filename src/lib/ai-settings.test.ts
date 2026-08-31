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
  clearModelsCache,
  getAiSettings,
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

  it("accepts one default and no more than four additional live models", async () => {
    const additionalModels = [
      alternateModel,
      thirdModel,
      "deepseek/deepseek-chat",
      "qwen/qwen-max",
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

  it("rejects a fifth additional model and models outside the live allowlist", async () => {
    const additionalModels = [
      alternateModel,
      thirdModel,
      "deepseek/deepseek-chat",
      "qwen/qwen-max",
      "openai/gpt-4o",
    ];
    mockLiveModels([standardModel, ...additionalModels]);

    await expect(setAiSettings(standardModel, additionalModels)).rejects.toThrow(
      "höchstens 4 zusätzliche Modelle",
    );

    clearModelsCache();
    mockLiveModels([standardModel, alternateModel]);
    await expect(setAiSettings(standardModel, ["not-allowlisted/model"])).rejects.toThrow(
      "nicht verfügbar",
    );
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