# Unified Router Setup

This fork keeps Jet Router's local dashboard and adds AgentRouter as a first-class
provider. One local API key can authorize OpenAI-compatible, Anthropic-compatible,
and Responses API clients while upstream credentials remain stored only in the
router.

## 1. Run the fork

```powershell
npm install
npm exec next -- dev --webpack --port 20128
```

Open `http://localhost:20128`. The public API base is
`http://localhost:20128/v1`.

## 2. Connect providers and accounts

1. Open **Providers** in the dashboard.
2. Connect **AgentRouter** and paste an AgentRouter token.
3. Add every other AgentRouter account as another connection under the same
   provider. Repeat this for any other providers you want in the pool.
4. Choose `fill-first` or `round-robin` as the provider account strategy.
5. Create a local key on the endpoint/API-key screen and enable required API-key
   authentication before exposing the router outside localhost.

Model IDs are provider-qualified, for example
`agentrouter/claude-opus-4-8`. `GET /v1/models` is built from active provider
connections. For AgentRouter, it unions the live catalogs returned for every
active account, so different account entitlements remain selectable.

Automatic routing skips accounts that do not expose the selected model and
fails over when an account is locked, rate-limited, expired, or rejected. To
pin a single request to a known connection, send `x-connection-id:
<connection-id>`; if that account fails, the remaining account pool is still
eligible for fallback.

## 3. OpenAI-compatible clients

Use:

```text
Base URL: http://localhost:20128/v1
API key:  <local key created in Jet Router>
Model:    agentrouter/<model-id>
```

The supported discovery and inference routes are:

```text
GET  /v1/models
POST /v1/chat/completions
POST /v1/responses
```

The Responses endpoint is translated when an upstream provider only supports
Chat Completions or Anthropic Messages.

## 4. Anthropic-compatible clients and Claude Code

Use this shape in Claude Code's `~/.claude/settings.json`:

```json
{
  "hasCompletedOnboarding": true,
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:20128/v1",
    "ANTHROPIC_AUTH_TOKEN": "<local key created in Jet Router>",
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1"
  }
}
```

The gateway accepts `POST /v1/messages`. A model-list request carrying the
`anthropic-version` header gets Anthropic's model-list response shape; ordinary
requests get the OpenAI list shape.

## 5. Codex CLI

Use `~/.codex/config.toml`:

```toml
model = "agentrouter/<model-id>"
model_provider = "jet-router"

[model_providers.jet-router]
name = "Jet Router"
base_url = "http://localhost:20128/v1"
wire_api = "responses"
```

And `~/.codex/auth.json`:

```json
{
  "auth_mode": "apikey",
  "OPENAI_API_KEY": "<local key created in Jet Router>"
}
```

The dashboard's **CLI Tools** page can generate and apply these files.

## 6. Pi and other harnesses

Configure Pi as either `openai-completions` or `anthropic-messages`, with the
same base URL and local key. The router publishes the full model catalog, but a
client that does not call `/v1/models` may still require models to be entered in
that client's own configuration.

## Security notes

- Never give a harness an upstream provider token; give it only a local router
  key.
- Google OAuth application credentials are not embedded in this fork. Set the
  four optional `JET_ROUTER_*_CLIENT_ID`/`CLIENT_SECRET` variables shown in
  `.env.example` only if you enable Antigravity or Gemini OAuth login.
- Do not expose port 20128 publicly without required local-key authentication,
  TLS, and network access controls.
- A catalog failure falls back to the static provider list, so temporary
  discovery outages do not make all models disappear.
- Disabling an account immediately removes it from routing and from future live
  catalog refreshes.
