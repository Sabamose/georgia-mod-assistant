import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/chat.js";
import { APPOINTMENT_MARKER } from "../api/_lib/appointment.js";

function makeRequest(body) {
  return {
    method: "POST",
    headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
    socket: { remoteAddress: "127.0.0.1" },
    body,
  };
}

function makeResponse() {
  const res = {
    statusCode: null,
    headers: {},
    chunks: [],
    headersSent: false,
    ended: false,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    flushHeaders() {
      this.headersSent = true;
    },
    write(chunk) {
      this.headersSent = true;
      this.chunks.push(String(chunk));
      return true;
    },
    end(chunk) {
      if (chunk) this.write(chunk);
      this.ended = true;
    },
  };
  return res;
}

function parseSseEvents(raw) {
  return raw
    .split("\n\n")
    .filter((frame) => frame.startsWith("data: "))
    .map((frame) => JSON.parse(frame.slice(6)));
}

function sseBodyFromDeltas(deltas) {
  const frames = [
    ...deltas.map((delta) =>
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta })}\n\n`
    ),
    `data: ${JSON.stringify({ type: "response.completed" })}\n\n`,
  ];
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
}

function withStubbedFetch(t, deltas) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(sseBodyFromDeltas(deltas), { status: 200 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
}

function withTestEnv(t) {
  const saved = {};
  const overrides = {
    OPENAI_API_KEY: "test-key",
    ANTHROPIC_API_KEY: "",
    AI_PROVIDER: "openai",
  };
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value) process.env[key] = value;
    else delete process.env[key];
  }
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("handler streams text deltas in the Anthropic-compatible shape", async (t) => {
  withTestEnv(t);
  withStubbedFetch(t, ["გადავადება ", "5,000 ლარი ღირს."]);

  const res = makeResponse();
  await handler(makeRequest({ language: "ka", messages: [{ role: "user", content: "გადავადება რა ღირს?" }] }), res);

  const events = parseSseEvents(res.chunks.join(""));
  const text = events
    .filter((e) => e.type === "content_block_delta")
    .map((e) => e.delta.text)
    .join("");
  const stop = events.find((e) => e.type === "message_stop");

  assert.equal(text, "გადავადება 5,000 ლარი ღირს.");
  assert.ok(stop);
  assert.deepEqual(stop.blocks, []);
  assert.ok(res.ended);
});

test("handler intercepts the appointment marker and emits a booking card", async (t) => {
  withTestEnv(t);
  const payload = {
    name: "Giorgi Beridze",
    topic: "Contract service application",
    city: "ბათუმი",
    date: "2026-06-16",
    time: "11:30",
    phone: "+995 555 12 34 56",
  };
  withStubbedFetch(t, [
    "Done — your visit is booked.",
    "\n\n",
    `${APPOINTMENT_MARKER} ${JSON.stringify(payload)}`,
  ]);

  const res = makeResponse();
  await handler(makeRequest({ language: "en", messages: [{ role: "user", content: "yes, confirm" }] }), res);

  const events = parseSseEvents(res.chunks.join(""));
  const text = events
    .filter((e) => e.type === "content_block_delta")
    .map((e) => e.delta.text)
    .join("");
  const stop = events.find((e) => e.type === "message_stop");

  assert.equal(text, "Done — your visit is booked.");
  assert.ok(!text.includes(APPOINTMENT_MARKER), "marker must never reach the client text");
  assert.equal(stop.blocks.length, 1);
  const card = stop.blocks[0];
  assert.equal(card.type, "appointment_card");
  assert.match(card.reference, /^MOD-/);
  assert.ok(card.fields.some((f) => f.label === "Phone" && f.value === payload.phone));
});

test("handler rejects empty payloads with 400", async (t) => {
  withTestEnv(t);
  const res = makeResponse();
  await handler(makeRequest({ language: "en", messages: [] }), res);
  assert.equal(res.statusCode, 400);
});

test("handler returns a friendly message when no provider is configured", async (t) => {
  withTestEnv(t);
  delete process.env.OPENAI_API_KEY;

  const res = makeResponse();
  await handler(makeRequest({ language: "en", messages: [{ role: "user", content: "hi" }] }), res);

  const events = parseSseEvents(res.chunks.join(""));
  const text = events
    .filter((e) => e.type === "content_block_delta")
    .map((e) => e.delta.text)
    .join("");
  assert.match(text, /not fully configured/);
  assert.ok(events.some((e) => e.type === "message_stop"));
});
