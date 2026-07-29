import { CLAUDE_CLI_SPOOF_HEADERS } from "../shared.js";

const agentRouterProvider = {
  id: "agentrouter",
  priority: 22,
  alias: "agentrouter",
  aliases: ["ar"],
  display: {
    name: "AgentRouter",
    icon: "route",
    color: "#7C3AED",
    textIcon: "AR",
    website: "https://agentrouter.org",
    notice: {
      text: "One AgentRouter key can expose Claude, GPT, GLM, and other trial models. The live catalog is discovered after a key is connected.",
      apiKeyUrl: "https://agentrouter.org/console/token",
    },
  },
  category: "freeTier",
  authType: "apikey",
  // OpenAI Chat is the safe fallback for formats without an exact upstream
  // transport (notably Codex Responses, which 9Router translates to Chat).
  transport: {
    baseUrl: "https://agentrouter.org/v1/chat/completions",
    format: "openai",
    auth: { combined: true, header: "Authorization", scheme: "bearer" },
  },
  // Keep the client's native wire format when AgentRouter exposes a matching
  // endpoint. Responses API callers intentionally fall back through OpenAI
  // Chat translation because AgentRouter does not document a Responses endpoint.
  transports: [
    {
      format: "openai",
      baseUrl: "https://agentrouter.org/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://agentrouter.org/v1/messages",
      headers: { ...CLAUDE_CLI_SPOOF_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  // Static entries are an offline fallback. /v1/models replaces this list
  // with the union of the live catalogs visible to every active account.
  models: [
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { id: "gpt-5.5", name: "GPT-5.5" },
    { id: "glm-5.2", name: "GLM 5.2" },
  ],
  modelsFetcher: {
    url: "https://agentrouter.org/v1/models",
    type: "openai",
  },
  passthroughModels: true,
};

export default agentRouterProvider;
