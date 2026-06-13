import { getEnvValue } from "./_lib/providers.js";

const ELEVENLABS_TOKEN_URL = "https://api.elevenlabs.io/v1/convai/conversation/token";

function setJsonHeaders(res, statusCode) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
}

function getSpeechResourceId() {
  return getEnvValue("ELEVENLABS_SPEECH_ENGINE_ID") || getEnvValue("ELEVENLABS_AGENT_ID");
}

function getParticipantName(body) {
  const raw = typeof body?.participantName === "string" ? body.participantName.trim() : "";
  return raw.slice(0, 80) || "Georgia MOD web visitor";
}

function appendOptionalParam(params, name, value) {
  if (value) params.set(name, value);
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    setJsonHeaders(res, 405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const apiKey = getEnvValue("ELEVENLABS_API_KEY");
  const resourceId = getSpeechResourceId();

  if (!apiKey || !resourceId) {
    setJsonHeaders(res, 503);
    res.end(JSON.stringify({
      error: "ElevenLabs voice is not configured.",
      missing: {
        ELEVENLABS_API_KEY: !apiKey,
        ELEVENLABS_SPEECH_ENGINE_ID_OR_AGENT_ID: !resourceId,
      },
    }));
    return;
  }

  try {
    const params = new URLSearchParams({
      agent_id: resourceId,
      participant_name: getParticipantName(req.body),
    });

    appendOptionalParam(params, "branch_id", getEnvValue("ELEVENLABS_BRANCH_ID"));
    appendOptionalParam(params, "environment", getEnvValue("ELEVENLABS_ENVIRONMENT"));

    const response = await fetch(`${ELEVENLABS_TOKEN_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      setJsonHeaders(res, response.status >= 400 && response.status < 500 ? 502 : 503);
      res.end(JSON.stringify({
        error: "Failed to start ElevenLabs voice session.",
        status: response.status,
        detail: detail.slice(0, 500),
      }));
      return;
    }

    const body = await response.json();
    if (!body?.token) {
      setJsonHeaders(res, 502);
      res.end(JSON.stringify({ error: "ElevenLabs did not return a conversation token." }));
      return;
    }

    setJsonHeaders(res, 200);
    res.end(JSON.stringify({
      conversationToken: body.token,
      resourceId,
      resourceType: resourceId.startsWith("seng_") ? "speech_engine" : "agent",
    }));
  } catch (error) {
    setJsonHeaders(res, 503);
    res.end(JSON.stringify({
      error: "ElevenLabs voice service is unreachable.",
      detail: error instanceof Error ? error.message : String(error),
    }));
  }
}
