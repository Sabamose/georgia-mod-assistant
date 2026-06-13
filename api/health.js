import { getEnvDiagnostics, getEnvValue } from "./_lib/providers.js";

function getQueryToken(req) {
  try {
    return new URL(req.url || "/api/health", "https://local.invalid").searchParams.get("token");
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const expectedToken = getEnvValue("HEALTH_CHECK_TOKEN");
  const suppliedToken = req.headers?.["x-health-token"] || getQueryToken(req);
  if (expectedToken && suppliedToken !== expectedToken) {
    res.statusCode = 401;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  res.statusCode = 200;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    ok: true,
    diagnostics: getEnvDiagnostics(),
  }));
}
