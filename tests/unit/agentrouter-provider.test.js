import { describe, expect, it } from "vitest";

import { DefaultExecutor } from "../../open-sse/executors/default.js";
import { PROVIDERS, PROVIDER_MODELS } from "../../open-sse/providers/index.js";
import REGISTRY from "../../open-sse/providers/registry/index.js";
import { resolveTransport } from "../../open-sse/services/provider.js";

describe("AgentRouter provider", () => {
  const entry = REGISTRY.find((provider) => provider.id === "agentrouter");

  it("is a first-class free-tier provider with passthrough discovery", () => {
    expect(entry).toBeDefined();
    expect(entry.category).toBe("freeTier");
    expect(entry.aliases).toContain("ar");
    expect(entry.passthroughModels).toBe(true);
    expect(entry.modelsFetcher).toEqual({
      url: "https://agentrouter.org/v1/models",
      type: "openai",
    });
  });

  it("keeps OpenAI and Anthropic requests on their native transports", () => {
    expect(resolveTransport("agentrouter", "openai")).toMatchObject({
      baseUrl: "https://agentrouter.org/v1/chat/completions",
      format: "openai",
    });
    expect(resolveTransport("agentrouter", "claude")).toMatchObject({
      baseUrl: "https://agentrouter.org/v1/messages",
      format: "claude",
    });
    expect(resolveTransport("agentrouter", "openai-responses")).toBeNull();
    expect(PROVIDERS.agentrouter).toMatchObject({
      baseUrl: "https://agentrouter.org/v1/chat/completions",
      format: "openai",
    });
  });

  it("uses bearer auth on both native transports", () => {
    const executor = new DefaultExecutor("agentrouter");
    for (const format of ["openai", "claude"]) {
      const runtimeTransport = resolveTransport("agentrouter", format);
      const credentials = { apiKey: "upstream-secret", runtimeTransport };
      expect(executor.buildUrl("test-model", false, 0, credentials)).toBe(runtimeTransport.baseUrl);
      expect(executor.buildHeaders(credentials, false).Authorization).toBe("Bearer upstream-secret");
    }
  });

  it("retains an offline catalog when live discovery is unavailable", () => {
    const ids = PROVIDER_MODELS.agentrouter.map((model) => model.id);
    expect(ids).toContain("claude-opus-4-8");
    expect(ids).toContain("gpt-5.5");
    expect(PROVIDERS.agentrouter.format).toBe("openai");
  });
});
