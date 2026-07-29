import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn(),
  getCombos: vi.fn(),
  getCustomModels: vi.fn(),
  getModelAliases: vi.fn(),
  getSettings: vi.fn(),
  getDisabledModels: vi.fn(),
  extractApiKey: vi.fn(),
  isValidApiKey: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  getProviderConnections: mocks.getProviderConnections,
  getCombos: mocks.getCombos,
  getCustomModels: mocks.getCustomModels,
  getModelAliases: mocks.getModelAliases,
  getSettings: mocks.getSettings,
}));

vi.mock("@/lib/disabledModelsDb", () => ({
  getDisabledModels: mocks.getDisabledModels,
}));

vi.mock("@/sse/services/auth", () => ({
  extractApiKey: mocks.extractApiKey,
  isValidApiKey: mocks.isValidApiKey,
}));

const originalFetch = global.fetch;
let fetchCallCount = 0;

describe("account-aware model discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderConnections.mockResolvedValue([
      {
        id: "ar-account-a",
        provider: "agentrouter",
        apiKey: "key-a",
        isActive: true,
        providerSpecificData: {},
      },
      {
        id: "ar-account-b",
        provider: "agentrouter",
        apiKey: "key-b",
        isActive: true,
        providerSpecificData: {},
      },
    ]);
    mocks.getCombos.mockResolvedValue([]);
    mocks.getCustomModels.mockResolvedValue([]);
    mocks.getModelAliases.mockResolvedValue({});
    mocks.getDisabledModels.mockResolvedValue({});
    mocks.getSettings.mockResolvedValue({ requireApiKey: false });
    mocks.extractApiKey.mockReturnValue(null);
    mocks.isValidApiKey.mockResolvedValue(false);
    fetchCallCount = 0;

    global.fetch = async (_url, options) => {
      fetchCallCount += 1;
      const auth = options?.headers?.Authorization;
      const data = auth === "Bearer key-a"
        ? [
            { id: "claude-opus-4-8", display_name: "Claude Opus 4.8" },
            { id: "shared-model", name: "Shared" },
          ]
        : [
            { id: "gpt-5.5", name: "GPT-5.5" },
            { id: "shared-model", name: "Shared" },
          ];
      return new Response(JSON.stringify({ object: "list", data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("unions live catalogs from every active account and de-duplicates IDs", async () => {
    const { buildModelsList } = await import("../../src/app/api/v1/models/route.js");
    const models = await buildModelsList(["llm"]);
    const ids = models.map((model) => model.id);

    expect(ids).toContain("agentrouter/claude-opus-4-8");
    expect(ids).toContain("agentrouter/gpt-5.5");
    expect(ids.filter((id) => id === "agentrouter/shared-model")).toHaveLength(1);
    expect(fetchCallCount).toBe(2);
  });

  it("formats the same catalog for OpenAI and Anthropic model discovery", async () => {
    const { formatModelsResponse } = await import("../../src/app/api/v1/models/route.js");
    const models = [{ id: "agentrouter/gpt-5.5", object: "model", owned_by: "agentrouter", name: "GPT-5.5" }];

    const openai = formatModelsResponse(new Request("http://localhost/v1/models"), models);
    expect(openai).toMatchObject({
      object: "list",
      data: [{ id: "agentrouter/gpt-5.5", object: "model", owned_by: "agentrouter", created: 0 }],
    });

    const anthropic = formatModelsResponse(new Request("http://localhost/v1/models", {
      headers: { "anthropic-version": "2023-06-01" },
    }), models);
    expect(anthropic).toMatchObject({
      has_more: false,
      first_id: "agentrouter/gpt-5.5",
      last_id: "agentrouter/gpt-5.5",
      data: [{ id: "agentrouter/gpt-5.5", type: "model", display_name: "GPT-5.5" }],
    });
  });

  it("rejects an invalid local router key when enforcement is enabled", async () => {
    mocks.getSettings.mockResolvedValue({ requireApiKey: true });
    mocks.extractApiKey.mockReturnValue("bad-local-key");
    mocks.isValidApiKey.mockResolvedValue(false);
    const { authorizeModelsRequest } = await import("../../src/app/api/v1/models/route.js");

    const response = await authorizeModelsRequest(new Request("http://localhost/v1/models"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { type: "authentication_error", code: "invalid_api_key" },
    });

    const anthropicResponse = await authorizeModelsRequest(new Request("http://localhost/v1/models", {
      headers: { "anthropic-version": "2023-06-01" },
    }));
    expect(anthropicResponse.status).toBe(401);
    await expect(anthropicResponse.json()).resolves.toMatchObject({
      type: "error",
      error: { type: "authentication_error", message: "Invalid API key" },
    });
  });
});
