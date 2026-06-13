import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/elevenlabs-conversation.js";

function makeResponse() {
  return {
    statusCode: null,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(chunk) {
      this.body += chunk || "";
    },
  };
}

function saveEnv(names) {
  const saved = new Map();
  for (const name of names) saved.set(name, process.env[name]);
  return () => {
    for (const [name, value] of saved.entries()) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

test("ElevenLabs token endpoint reports missing configuration", async (t) => {
  const restoreEnv = saveEnv(["ELEVENLABS_API_KEY", "ELEVENLABS_SPEECH_ENGINE_ID", "ELEVENLABS_AGENT_ID"]);
  t.after(restoreEnv);
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_SPEECH_ENGINE_ID;
  delete process.env.ELEVENLABS_AGENT_ID;

  const res = makeResponse();
  await handler({ method: "POST", body: {}, headers: {} }, res);

  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 503);
  assert.equal(body.missing.ELEVENLABS_API_KEY, true);
  assert.equal(body.missing.ELEVENLABS_SPEECH_ENGINE_ID_OR_AGENT_ID, true);
});

test("ElevenLabs token endpoint exchanges speech engine id for conversation token", async (t) => {
  const restoreEnv = saveEnv([
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_SPEECH_ENGINE_ID",
    "ELEVENLABS_AGENT_ID",
    "ELEVENLABS_BRANCH_ID",
    "ELEVENLABS_ENVIRONMENT",
  ]);
  const originalFetch = globalThis.fetch;
  t.after(() => {
    restoreEnv();
    globalThis.fetch = originalFetch;
  });

  process.env.ELEVENLABS_API_KEY = "eleven-key";
  process.env.ELEVENLABS_SPEECH_ENGINE_ID = "seng_test123";
  process.env.ELEVENLABS_AGENT_ID = "agent_fallback";
  process.env.ELEVENLABS_BRANCH_ID = "branch_1";
  process.env.ELEVENLABS_ENVIRONMENT = "production";

  let requestedUrl = "";
  let requestedHeaders = {};
  globalThis.fetch = async (url, options) => {
    requestedUrl = String(url);
    requestedHeaders = options.headers;
    return new Response(JSON.stringify({ token: "conversation-token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = makeResponse();
  await handler({
    method: "POST",
    body: { participantName: "Demo User" },
    headers: {},
  }, res);

  const body = JSON.parse(res.body);
  const url = new URL(requestedUrl);

  assert.equal(res.statusCode, 200);
  assert.equal(body.conversationToken, "conversation-token");
  assert.equal(body.resourceId, "seng_test123");
  assert.equal(body.resourceType, "speech_engine");
  assert.equal(url.searchParams.get("agent_id"), "seng_test123");
  assert.equal(url.searchParams.get("participant_name"), "Demo User");
  assert.equal(url.searchParams.get("branch_id"), "branch_1");
  assert.equal(url.searchParams.get("environment"), "production");
  assert.equal(requestedHeaders["xi-api-key"], "eleven-key");
});
