import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/health.js";

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

test("health endpoint returns diagnostics without a configured token", () => {
  const saved = process.env.HEALTH_CHECK_TOKEN;
  delete process.env.HEALTH_CHECK_TOKEN;

  const res = makeResponse();
  handler({ method: "GET", headers: {}, url: "/api/health" }, res);

  if (saved === undefined) delete process.env.HEALTH_CHECK_TOKEN;
  else process.env.HEALTH_CHECK_TOKEN = saved;

  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).ok, true);
});

test("health endpoint requires token when configured", () => {
  const saved = process.env.HEALTH_CHECK_TOKEN;
  process.env.HEALTH_CHECK_TOKEN = "health-secret";

  const blocked = makeResponse();
  handler({ method: "GET", headers: {}, url: "/api/health" }, blocked);
  assert.equal(blocked.statusCode, 401);

  const allowed = makeResponse();
  handler({ method: "GET", headers: { "x-health-token": "health-secret" }, url: "/api/health" }, allowed);
  assert.equal(allowed.statusCode, 200);

  if (saved === undefined) delete process.env.HEALTH_CHECK_TOKEN;
  else process.env.HEALTH_CHECK_TOKEN = saved;
});
