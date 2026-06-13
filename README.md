# Nika (ნიკა) — Georgia Ministry of Defense AI Assistant

AI-powered chat assistant for Georgia's Ministry of Defense, providing 24/7 information about military service in Georgian and English — and booking visits to military registration centers directly from the conversation.

## Overview

Georgia reinstated mandatory military service on January 1, 2025 via the new Defense Code. **Nika** answers questions about service obligations, deferrals, exemptions, and professional military careers, and can schedule an in-person appointment at a registration center.

### Target Audiences
- **Conscripts** (males 18-27) — draft notices, registration, service types
- **Professional career seekers** (18-35) — contract service, salary, benefits
- **Parents/families** — son's obligations, what to expect
- **Students** — university deferrals, summer training requirements
- **Diaspora Georgians** — dual citizenship obligations, foreign service exemption

## Tech Stack

- **Frontend:** React 19 + Vite
- **Backend:** Vercel Serverless Function (`/api/chat`) — deploys together with the frontend
- **AI:** GPT-5.4 primary (OpenAI Responses API) with Claude Sonnet fallback (Anthropic API)
- **Languages:** Georgian (formal თქვენ-register) + English

## Architecture

```
Browser widget ──POST /api/chat──▶ Vercel Function ──▶ OpenAI GPT-5.4
      ▲                                │                    │
      │       SSE stream + booking card│              Anthropic fallback
      └────────────────────────────────┘
```

Everything ships from this one repo: `git push` deploys frontend and backend together. The knowledge base lives in `knowledge-base.txt` and is embedded into the function via a generated module.

### Appointments

The agent collects name → topic → city → date/time conversationally, asks for confirmation, then emits a machine-readable `APPOINTMENT_JSON:` line. The backend strips that line from the visible stream, resolves the city against `src/data/registration-centers.json`, generates a `MOD-XXXXXX` booking reference, and returns a confirmation card with an "Add to calendar" (.ics) action. Bookings are simulated for the demo — no real MOD system is called.

## Getting Started

```bash
# Install dependencies
npm install

# Local dev — serves the widget AND /api/chat on one port
npm run dev

# Unit tests (center lookup, appointment pipeline, chat handler)
npm run test:unit

# Georgian factual suite (needs a running backend; set CHAT_API_URL to target a deployment)
npm run test:stress

# Georgian quality suite
npm run test:quality

# Provider comparison (requires OPENAI_API_KEY and ANTHROPIC_API_KEY)
npm run test:providers

# Browser smoke test
npm run test:smoke

# Regenerate the embedded knowledge base after editing knowledge-base.txt
npm run build:kb

# Build for production
npm run build
```

### Environment Variables

Set these in Vercel → Project → Settings → Environment Variables for the same project that owns `georgia-mod-assistant.vercel.app`. `OPENAI_API_KEY` must be enabled for the **Production** environment, then the project needs a fresh production redeploy. Use a local `.env` for `npm run dev`.

```
OPENAI_API_KEY=...            # required
ANTHROPIC_API_KEY=...         # optional — enables automatic fallback
OPENAI_MODEL=gpt-5.4          # optional override
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929  # optional override
AI_PROVIDER=openai            # optional: openai | anthropic
AI_FALLBACK_PROVIDER=anthropic
```

If you only have an OpenAI key, leave `AI_PROVIDER` unset or set it to `openai`. Do not set `AI_PROVIDER=anthropic` unless `ANTHROPIC_API_KEY` is also configured, or set `AI_FALLBACK_PROVIDER=openai`.

No client-side env vars are needed — the widget calls its own origin.

Tests that talk to a deployed backend use `CHAT_API_URL` (defaults to `http://localhost:5173/api/chat`).

## Knowledge Coverage

| Topic | Details |
|-------|---------|
| Mandatory Service | Who serves, registration, durations (6/8/11 months), call-up |
| Deferrals | 5,000 GEL paid deferral, student deferral, family grounds |
| Exemptions | Medical (5 categories), foreign service, clergy, Parliament |
| Alternative Service | Conscientious objection, 12-month duration, sectors |
| Professional Service | Contract terms, salary (1,050+ GEL), benefits, specializations |
| Reserve Forces | Post-service, training obligations, mobilization |
| Compensation | Wounded: 20K GEL, deceased: 30K/100K GEL, housing |
| Diaspora | Dual citizen obligations, renunciation restrictions |
| Appointments | Conversational booking at any registration center, .ics export |

## Project Structure

```
georgia-mod-assistant/
├── api/
│   ├── chat.js              # Vercel function: validation, rate limit, provider routing, SSE
│   └── _lib/
│       ├── prompt.js        # System prompt (concise style + appointment protocol)
│       ├── providers.js     # OpenAI + Anthropic streaming clients
│       ├── appointment.js   # Marker interception + booking card builder
│       ├── centers.js       # City → registration center resolution
│       └── knowledge.js     # Generated from knowledge-base.txt (npm run build:kb)
├── src/
│   ├── App.jsx              # Widget + landing page (booking card, .ics export)
│   ├── App.css              # Widget styles (military green theme)
│   ├── centerLookup.js      # Local "Find My Center" flow (no backend needed)
│   └── data/registration-centers.json
├── tests/
│   ├── appointment.test.mjs # Marker splitter + booking card units
│   ├── chat-api.test.mjs    # Handler end-to-end with stubbed model stream
│   ├── center-lookup.test.mjs
│   ├── stress-test-georgian.mjs
│   ├── georgian-quality-check.mjs
│   └── smoke.spec.js
├── knowledge-base.txt       # Canonical KB (source for api/_lib/knowledge.js)
├── SYSTEM_PROMPT.md         # Prompt documentation
├── DEMO_CHEATSHEET.md       # Demo scenario scripts
└── vercel.json              # Security headers + function config
```

## Built by [Wiil](https://wiil.ai)
