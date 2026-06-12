# Nika System Prompt — Documentation

The live prompt is assembled in `api/_lib/prompt.js` (source of truth). This file documents its structure and intent.

## Design goals

1. **Concise, conversational answers.** Default 1–3 short sentences, hard ceiling ~80 words unless the user asks for detail. One question per reply, maximum. The old card-heavy guidance system was removed — the conversation itself carries the help.
2. **Service, not just information.** After answering, Nika offers the single most useful next step — usually booking a registration-center visit.
3. **Formal, clean Georgian.** თქვენ-register only, Georgian script only, canonical ministry terminology, no malformed suffix forms (e.g. ❌ "სამსახური-ს შესახებ").
4. **Grounded answers.** Only facts from `knowledge-base.txt`; everything else is redirected to the registration center or the hotline +995 32 2 72 10 00.

## Prompt structure (assembled per request)

```
[Core prompt]
  - Identity (Nika, MOD Georgia) + today's date in Asia/Tbilisi
  - CONVERSATION STYLE — length limits, lead-with-answer, exact figures
  - LANGUAGE — Georgian/English rules
  - APPOINTMENTS — booking protocol (below)
  - BOUNDARIES — KB-only, no politics/legal advice, hotline referral
---
KNOWLEDGE BASE (from knowledge-base.txt via api/_lib/knowledge.js)
---
[Language addendum — short ka/en reinforcement chosen by UI language]
```

The current date is injected at request time so relative dates ("tomorrow", "next Tuesday") resolve correctly when booking.

## Appointment protocol

The model books visits to military registration centers:

1. Offers booking when an in-person visit is the natural next step, or on request.
2. Collects only missing details, one question at a time: **full name → topic → city → date/time** (phone optional). Working hours Mon–Fri 09:00–18:00; invalid slots get the nearest alternative proposed.
3. Confirms everything in one sentence and waits for explicit user confirmation.
4. Only then emits, as the final line of the reply:

   ```
   APPOINTMENT_JSON: {"name":"...","topic":"...","city":"თბილისი","date":"YYYY-MM-DD","time":"HH:MM","phone":"... or null"}
   ```

The backend (`api/_lib/appointment.js`) strips this line from the visible stream, validates it, resolves the city to a real center from `src/data/registration-centers.json` (address included when known), generates a `MOD-XXXXXX` reference, and ships an `appointment_card` block in the `message_stop` SSE event. The widget renders the confirmation card with an "Add to calendar" (.ics) action.

Bookings are simulated for demo purposes — no MOD system is called.

## Key facts the prompt pins for accuracy

- Paid deferral: 5,000 GEL, one-time, max 1 year
- Service durations: 6 / 8 / 11 months
- Non-appearance fine: 1,000 GEL
- Contract salary: from 1,050 GEL/month
- Registration window: January 1 – April 30
- Hotline: +995 32 2 72 10 00 (Mon–Fri 09:00–18:00)

## Editing

- Behavior/style/booking rules → `api/_lib/prompt.js`
- Facts → `knowledge-base.txt`, then `npm run build:kb`
- Booking card contents/validation → `api/_lib/appointment.js`
