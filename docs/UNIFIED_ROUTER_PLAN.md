# Unified Local Router Plan

## Goal

Expose every enabled upstream provider and account pool behind one local router
credential and two compatible wire protocols:

- OpenAI: `/v1/models`, `/v1/chat/completions`, and `/v1/responses`
- Anthropic: `/v1/models`, `/v1/messages`, and `/v1/messages/count_tokens`

Clients select a provider-prefixed model such as
`agentrouter/claude-opus-4-8`. The router selects an eligible account for that
provider and retries another account when the first one is unavailable.

## Request flow

1. The client authenticates with a locally issued router API key.
2. `/v1/models` returns models from enabled provider connections only.
3. The selected model ID resolves to a provider and upstream model.
4. The account pool applies priority or sticky round-robin selection.
   A request may optionally pin an account with `x-connection-id`; normal
   failover resumes if the pinned account is unavailable.
5. The request stays in its native wire format when the upstream supports it;
   otherwise Jet Router translates it.
6. Authentication, quota, rate-limit, missing-model, and transient failures
   lock only that account/model pair before the next account is tried.
7. The response is translated back to the client's original format.

## AgentRouter integration

AgentRouter has both documented transports:

- Anthropic Messages: `https://agentrouter.org/v1/messages`
- OpenAI Chat Completions: `https://agentrouter.org/v1/chat/completions`

Its authenticated `https://agentrouter.org/v1/models` catalog is fetched for
each active AgentRouter account. The catalogs are unioned so a model available
to any account can be selected from Claude Code, Codex, Pi, or another client.
Static models are used only when live discovery is unavailable.

## Edge-case policy

| Condition | Router behavior |
| --- | --- |
| Two accounts expose the same model | Return one model ID; either account may serve it. |
| Only one account exposes a model | Select it; other accounts fail over once and receive a short model lock if they reject it. |
| Upstream `/models` is down | Fall back to the provider's static catalog without blocking chat. |
| One account's catalog request fails | Keep catalogs returned by the other accounts. |
| Every account is rate-limited | Return a retryable error with the earliest known reset. |
| Invalid upstream credential | Lock that account/model and try the next account. |
| Invalid local router key | Reject before catalog or inference routing when key enforcement is enabled. |
| Duplicate provider/model IDs | De-duplicate by the complete provider-prefixed ID. |
| Provider removed or disabled | Remove its models from discovery immediately. |
| Client sends Anthropic model discovery headers | Return Anthropic Models API pagination fields. |
| Client sends OpenAI model discovery headers | Return the OpenAI `{object:"list",data:[...]}` shape. |
| Client uses OpenAI Responses with an upstream lacking Responses | Translate through the provider's documented fallback transport. |
| Streaming disconnect | Abort the upstream request and do not retry after output has begun. |

## Security boundary

Upstream credentials stay in the local credential store and are never returned
by `/v1` endpoints. The local router key is the only credential placed in
Claude Code, Codex, Pi, or other clients. Remote exposure should always enable
router-key enforcement and dashboard authentication.
