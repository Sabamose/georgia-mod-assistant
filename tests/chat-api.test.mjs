import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/chat.js";
import { APPOINTMENT_MARKER } from "../api/_lib/appointment.js";
import { hasProviderKey } from "../api/_lib/providers.js";

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
  assert.ok(stop.blocks.some((block) => block.type === "sources"));
  assert.ok(stop.blocks.some((block) => block.type === "follow_up_chips"));
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

test("handler appends server-driven chips and sources for service answers", async (t) => {
  withTestEnv(t);
  withStubbedFetch(t, ["Paid deferral costs 5,000 GEL and can be used once."]);

  const res = makeResponse();
  await handler(makeRequest({ language: "en", messages: [{ role: "user", content: "How much is deferral?" }] }), res);

  const events = parseSseEvents(res.chunks.join(""));
  const stop = events.find((e) => e.type === "message_stop");

  assert.ok(stop.blocks.some((block) => block.type === "sources"));
  const chips = stop.blocks.find((block) => block.type === "follow_up_chips");
  assert.ok(chips);
  assert.ok(chips.items.some((item) => item.label === "Paid deferral"));
});

test("handler adds hotline handoff block for complex cases", async (t) => {
  withTestEnv(t);
  withStubbedFetch(t, ["For a complex personal legal case, please confirm details with the hotline."]);

  const res = makeResponse();
  await handler(makeRequest({ language: "en", messages: [{ role: "user", content: "This is a complex legal personal case" }] }), res);

  const events = parseSseEvents(res.chunks.join(""));
  const stop = events.find((e) => e.type === "message_stop");
  const contact = stop.blocks.find((block) => block.type === "contact_card");

  assert.ok(contact);
  assert.ok(contact.contacts.some((item) => item.href === "tel:+995322721000"));
});

test("handler starts deterministic appointment intake before model call", async (t) => {
  withTestEnv(t);
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(sseBodyFromDeltas(["should not be called"]), { status: 200 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const res = makeResponse();
  await handler(makeRequest({ language: "en", messages: [{ role: "user", content: "I want to book a visit" }] }), res);

  const events = parseSseEvents(res.chunks.join(""));
  const text = events
    .filter((e) => e.type === "content_block_delta")
    .map((e) => e.delta.text)
    .join("");
  const stop = events.find((e) => e.type === "message_stop");

  assert.equal(fetchCalled, false);
  assert.equal(text, "What is your full name?");
  assert.equal(stop.journey, "appointment_intake");
});

test("appointment intake advances to topic chips after name", async (t) => {
  withTestEnv(t);

  const res = makeResponse();
  await handler(makeRequest({
    language: "en",
    messages: [
      { role: "user", content: "I want to book a visit" },
      { role: "assistant", content: "What is your full name?" },
      { role: "user", content: "Giorgi Beridze" },
    ],
  }), res);

  const events = parseSseEvents(res.chunks.join(""));
  const text = events
    .filter((e) => e.type === "content_block_delta")
    .map((e) => e.delta.text)
    .join("");
  const stop = events.find((e) => e.type === "message_stop");
  const chips = stop.blocks.find((block) => block.type === "follow_up_chips");

  assert.equal(text, "What is the topic of your visit?");
  assert.ok(chips.items.some((item) => item.label === "Contract service"));
});

test("appointment intake does not intercept informational apply questions", async (t) => {
  withTestEnv(t);
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(sseBodyFromDeltas(["You can apply through the relevant center."]), { status: 200 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const res = makeResponse();
  await handler(makeRequest({ language: "en", messages: [{ role: "user", content: "How do I apply for professional service?" }] }), res);

  const events = parseSseEvents(res.chunks.join(""));
  const text = events
    .filter((e) => e.type === "content_block_delta")
    .map((e) => e.delta.text)
    .join("");

  assert.equal(fetchCalled, true);
  assert.equal(text, "You can apply through the relevant center.");
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

test("provider key lookup tolerates hidden whitespace in env names", (t) => {
  const exact = process.env.OPENAI_API_KEY;
  const nearMiss = process.env["OPENAI_API_KEY "];
  delete process.env.OPENAI_API_KEY;
  process.env["OPENAI_API_KEY "] = "test-key";

  t.after(() => {
    if (exact === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = exact;

    if (nearMiss === undefined) delete process.env["OPENAI_API_KEY "];
    else process.env["OPENAI_API_KEY "] = nearMiss;
  });

  assert.equal(hasProviderKey("openai"), true);
});
