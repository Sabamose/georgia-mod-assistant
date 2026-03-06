# Nika (ნიკა) — Georgia Ministry of Defense AI Assistant

AI-powered chat assistant for Georgia's Ministry of Defense, providing 24/7 information about military service in Georgian and English.

## Overview

Georgia reinstated mandatory military service on January 1, 2025 via the new Defense Code. **Nika** answers questions about service obligations, deferrals, exemptions, and professional military careers.

### Target Audiences
- **Conscripts** (males 18-27) — draft notices, registration, service types
- **Professional career seekers** (18-35) — contract service, salary, benefits
- **Parents/families** — son's obligations, what to expect
- **Students** — university deferrals, summer training requirements
- **Diaspora Georgians** — dual citizenship obligations, foreign service exemption

## Tech Stack

- **Frontend:** React 19 + Vite
- **Backend:** Supabase Edge Functions (Deno)
- **AI:** GPT-5.4 primary (OpenAI Responses API) with Claude Sonnet fallback (Anthropic API)
- **Languages:** Georgian (formal თქვენ-register) + English

## Architecture

Same proven architecture as [Qeti](https://github.com/user/georgia-consulate-assistant) (Georgia MFA consular assistant):

```
Frontend (React) → Supabase Edge Function → OpenAI GPT-5.4
     ↑                    ↑                     ↓
     |                    |                Anthropic fallback
  Widget UI         Prompt + KB + Provider routing
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Georgian factual suite
npm run test:stress

# Georgian quality suite
npm run test:quality

# Provider comparison (requires OPENAI_API_KEY and ANTHROPIC_API_KEY)
npm run test:providers

# Browser smoke test
npm run test:smoke

# Browser smoke test against a deployed demo as well
SMOKE_REMOTE_URL=https://georgia-mod-assistant.vercel.app npm run test:smoke

# Build for production
npm run build
```

### Environment Variables

Create `.env` in root:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The frontend should only contain public Supabase values. Keep model API keys in Supabase secrets only.

Recommended Supabase secrets:
```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-2026-03-05
AI_PROVIDER=openai
AI_FALLBACK_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
ALLOWED_ORIGINS=https://georgia-mod-assistant.vercel.app,http://localhost:5173,http://localhost:5180
```

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

## Project Structure

```
georgia-mod-assistant/
├── src/
│   ├── App.jsx          # Main React app (widget + landing page)
│   ├── App.css          # Widget styles (military green theme)
│   ├── index.css        # Landing page styles
│   └── main.jsx         # React entry point
├── tests/
│   ├── _shared.mjs      # Shared evaluation helpers
│   ├── stress-test-georgian.mjs
│   ├── georgian-quality-check.mjs
│   ├── georgian-quality-cases.json
│   ├── compare-providers.mjs
│   └── smoke.spec.js
├── supabase/
│   └── functions/
│       └── chat/
│           ├── index.ts                # Request validation + provider routing
│           ├── prompt.ts               # Prompt + KB assembly
│           ├── stream-normalizer.ts    # Anthropic-compatible SSE output
│           └── providers/
│               ├── openai.ts
│               ├── anthropic.ts
│               ├── shared.ts
│               └── types.ts
├── knowledge-base.txt   # Comprehensive KB (also embedded in edge fn)
├── SYSTEM_PROMPT.md     # Full system prompt documentation
├── DEMO_CHEATSHEET.md   # Demo scenario scripts
├── playwright.config.js
└── public/              # Static assets
```

## Built by [Wiil](https://wiil.ai)
