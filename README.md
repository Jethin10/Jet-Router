# Jet Router

One self-hosted API endpoint for every AI provider and account you connect.

Jet Router exposes OpenAI-, Anthropic-, and Gemini-compatible APIs, then routes each request to the provider, model, and account selected by the model ID. It is designed for Claude Code, Codex, Cursor, OpenCode, Cline, and any client that accepts a custom base URL.

[![CI](https://github.com/Jethin10/Jet-Router/actions/workflows/ci.yml/badge.svg)](https://github.com/Jethin10/Jet-Router/actions/workflows/ci.yml)
[![Docker](https://github.com/Jethin10/Jet-Router/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Jethin10/Jet-Router/actions/workflows/docker-publish.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What it provides

- One local API key and one endpoint for all configured providers.
- OpenAI Chat Completions and Responses API compatibility.
- Anthropic Messages API compatibility.
- Gemini-compatible model and generation routes.
- A unified `/v1/models` catalog for selecting models from client tools.
- Multiple accounts per provider with fill-first or round-robin selection.
- Automatic account fallback for quota, authentication, and upstream failures.
- OAuth and API-key provider connections.
- Streaming, tool calls, reasoning, images, audio, embeddings, search, and video routes where supported upstream.
- Local quota, usage, request diagnostics, and model availability views.
- Optional token-saving, proxy-pool, tunnel, and MITM integrations.

## API surface

| Compatibility | Endpoint |
| --- | --- |
| Model catalog | `GET /v1/models` |
| OpenAI Chat Completions | `POST /v1/chat/completions` |
| OpenAI Responses | `POST /v1/responses` |
| Anthropic Messages | `POST /v1/messages` |
| Anthropic token counting | `POST /v1/messages/count_tokens` |
| Gemini | `/v1beta/models/*` |
| Embeddings | `POST /v1/embeddings` |
| Images | `POST /v1/images/generations` |
| Speech | `POST /v1/audio/speech` |
| Transcription | `POST /v1/audio/transcriptions` |
| Search | `POST /v1/search` |
| Health check | `GET /api/health` |

The default dashboard and API origin is `http://localhost:20128`.

## Production quick start

Requirements:

- Docker Engine 25 or newer
- Docker Compose v2
- Git

```bash
git clone https://github.com/Jethin10/Jet-Router.git
cd Jet-Router
cp .env.example .env
```

Generate independent secrets and place them in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set at least:

```dotenv
JWT_SECRET=<first-generated-secret>
API_KEY_SECRET=<second-generated-secret>
INITIAL_PASSWORD=<a-strong-unique-password>
AUTH_COOKIE_SECURE=false
```

Then build and start:

```bash
docker compose up -d --build
docker compose ps
curl --fail http://localhost:20128/api/health
```

Open `http://localhost:20128/dashboard`, sign in, connect providers, and create a local endpoint key from the Endpoint page.

For an HTTPS deployment behind a reverse proxy, set `AUTH_COOKIE_SECURE=true` and keep port `20128` private to the proxy.

## Connect a client

First list the models visible to your Jet Router key:

```bash
curl http://localhost:20128/v1/models \
  -H "Authorization: Bearer <jet-router-key>"
```

Model IDs include a provider or routing prefix. Choose the exact ID returned by `/v1/models`.

### OpenAI-compatible clients

```dotenv
OPENAI_BASE_URL=http://localhost:20128/v1
OPENAI_API_KEY=<jet-router-key>
OPENAI_MODEL=<model-id-from-v1-models>
```

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer <jet-router-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<model-id-from-v1-models>",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### Anthropic-compatible clients

```dotenv
ANTHROPIC_BASE_URL=http://localhost:20128
ANTHROPIC_AUTH_TOKEN=<jet-router-key>
ANTHROPIC_MODEL=<model-id-from-v1-models>
```

```bash
curl http://localhost:20128/v1/messages \
  -H "x-api-key: <jet-router-key>" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<model-id-from-v1-models>",
    "max_tokens": 512,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Codex

Add a provider to `~/.codex/config.toml`:

```toml
model = "<model-id-from-v1-models>"
model_provider = "jet-router"

[model_providers.jet-router]
name = "Jet Router"
base_url = "http://localhost:20128/v1"
env_key = "JET_ROUTER_API_KEY"
wire_api = "responses"
```

Then export the local key:

```bash
export JET_ROUTER_API_KEY="<jet-router-key>"
```

The dashboard can generate configurations for supported CLI tools under **CLI Tools**.

## Multiple accounts and routing

Add each provider account as a separate connection. Jet Router can:

- Prefer accounts by priority.
- Rotate accounts with round-robin selection.
- Keep a short sticky window to preserve provider-side cache locality.
- Lock only the failing account/model combination during cooldown.
- Retry another healthy account automatically.
- Route through named combos for fallback, capacity, round-robin, or fusion behavior.

Clients choose the model; Jet Router chooses a healthy matching account.

## Configuration

The checked-in [`.env.example`](.env.example) is the deployment contract. Important variables include:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs dashboard sessions. Required in production. |
| `API_KEY_SECRET` | Signs generated endpoint keys. Required in production. |
| `INITIAL_PASSWORD` | Initial dashboard password. Use a strong unique value. |
| `DATA_DIR` | Persistent database and runtime state directory. |
| `PORT` | HTTP port. Defaults to `20128`. |
| `HOSTNAME` | Bind address. Use `0.0.0.0` in a container. |
| `AUTH_COOKIE_SECURE` | Set `true` when the public endpoint uses HTTPS. |
| `ENABLE_REQUEST_LOGS` | Stores detailed request diagnostics when enabled. |
| `JET_ROUTER_PROXY_CLIENT_MAX_BODY_SIZE` | Maximum proxied request body size. |
| `JET_ROUTER_ANTIGRAVITY_CLIENT_ID` | Optional Google OAuth application client ID. |
| `JET_ROUTER_ANTIGRAVITY_CLIENT_SECRET` | Optional Google OAuth application secret. |
| `JET_ROUTER_GOOGLE_CLIENT_ID` | Optional Gemini OAuth application client ID. |
| `JET_ROUTER_GOOGLE_CLIENT_SECRET` | Optional Gemini OAuth application secret. |

Provider credentials and local endpoint keys are stored in the persistent data directory. Never commit `.env`, the data directory, database files, exported settings, tokens, or certificates.

## Production security

- Put Jet Router behind TLS before exposing it beyond localhost.
- Restrict the dashboard with its login and a strong password.
- Use a unique endpoint key per client so keys can be revoked independently.
- Keep `ENABLE_REQUEST_LOGS=false` unless request payload diagnostics are needed.
- Back up the mounted `jet-router-data` volume securely.
- Do not expose the optional Headroom sidecar port publicly.
- Restrict local-only CLI, tunnel, MITM, and host-integration routes to the machine running Jet Router.
- Rotate any provider credential that appears in logs, screenshots, commits, or support messages.
- Review provider terms before connecting subscription or trial accounts.

See [Production deployment](docs/PRODUCTION.md) for reverse-proxy, backup, upgrade, and rollback guidance.

## Development

Use Node.js 22:

```bash
npm ci
npm run lint
npm test
npm run build
npm run dev
```

The development server listens on `http://localhost:20127`.

Useful commands:

```bash
npm run check
npm run test:unit
npm run test:translator
docker build -t jet-router:local .
```

## Project layout

```text
src/app/         Next.js dashboard and API routes
src/lib/         database, auth, runtime, updater, and integrations
src/sse/         request authentication and API handlers
open-sse/        provider registry, routing, translation, and executors
cli/             optional local CLI bundle
tests/           unit and translator coverage
docs/            architecture and operations documentation
```

## License and attribution

Jet Router is available under the [MIT License](LICENSE).

Third-party open-source attribution is recorded in [NOTICE](NOTICE).

## Support

- [Issues](https://github.com/Jethin10/Jet-Router/issues)
- [Repository](https://github.com/Jethin10/Jet-Router)
