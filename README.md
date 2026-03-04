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
- **AI:** Claude Sonnet 4.5 (Anthropic API)
- **Languages:** Georgian (formal თქვენ-register) + English

## Architecture

Same proven architecture as [Qeti](https://github.com/user/georgia-consulate-assistant) (Georgia MFA consular assistant):

```
Frontend (React) → Supabase Edge Function → Anthropic Claude API
     ↑                    ↑
     |                    |
  Widget UI         System Prompt + Knowledge Base
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create `.env` in root:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Supabase Edge Function requires `ANTHROPIC_API_KEY` set in Supabase secrets.

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
├── supabase/
│   └── functions/
│       └── chat/
│           └── index.ts # Edge function (Claude + knowledge base)
├── knowledge-base.txt   # Comprehensive KB (also embedded in edge fn)
├── SYSTEM_PROMPT.md     # Full system prompt documentation
├── DEMO_CHEATSHEET.md   # Demo scenario scripts
└── public/              # Static assets
```

## Built by [Wiil](https://wiil.ai)
