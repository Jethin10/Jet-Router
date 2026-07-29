# Jet Router — Agent Skills

Drop-in skills for any AI agent (Claude, Cursor, ChatGPT, custom SDK). Just **copy a link** below and paste it to your AI — it will fetch the skill and use Jet Router for you.

> Tip: start with the **jet-router** entry skill — it covers setup and links to all capability skills.

## Skills

| Capability | Copy link below and paste to your AI |
|---|---|
| **Entry / Setup** (start here) | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router/SKILL.md |
| Chat / code-gen | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router-chat/SKILL.md |
| Image generation | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router-image/SKILL.md |
| Video generation (xAI Grok Imagine) | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router-video/SKILL.md |
| Text-to-speech | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router-tts/SKILL.md |
| Speech-to-text | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router-stt/SKILL.md |
| Embeddings | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router-embeddings/SKILL.md |
| Web search | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router-web-search/SKILL.md |
| Web fetch (URL → markdown) | https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router-web-fetch/SKILL.md |

## How to use

Paste to your AI (Claude, Cursor, ChatGPT, …):

```
Read this skill and use it: https://raw.githubusercontent.com/Jethin10/Jet-Router/refs/heads/master/skills/jet-router/SKILL.md
```

Then ask normally — *"generate an image of a cat"*, *"transcribe this URL"*, etc.

## Configure your shell once

```bash
export JET_ROUTER_URL="http://localhost:20128"   # local default, or your VPS / tunnel URL
export JET_ROUTER_KEY="sk-..."                   # from Dashboard → Keys (only if requireApiKey=true)
```

Verify: `curl $JET_ROUTER_URL/api/health` → `{"ok":true}`.

## Links

- Source: https://github.com/Jethin10/Jet-Router
- Dashboard: https://router.example.com
