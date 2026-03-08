import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO_ROOT = "/Users/sabamoseshvili/georgia-mod-assistant";

function loadGuidanceModule() {
  const outfile = join(
    tmpdir(),
    `guidance-${randomBytes(6).toString("hex")}.mjs`,
  );

  execFileSync(
    "npx",
    [
      "esbuild",
      "supabase/functions/chat/guidance.ts",
      "--bundle",
      "--format=esm",
      "--platform=node",
      `--outfile=${outfile}`,
    ],
    {
      cwd: REPO_ROOT,
      stdio: "ignore",
    },
  );

  return import(pathToFileURL(outfile).href);
}

const { buildGuidanceMetadata } = await loadGuidanceModule();

test("broad deferral and exemption query stays in compact overview mode", () => {
  const result = buildGuidanceMetadata([
    {
      role: "user",
      content: "გადავადებისა და გათავისუფლების შესახებ ინფორმაცია მინდა.",
    },
  ], "ka");

  assert.equal(result.journey, "general");
  assert.deepEqual(
    result.blocks.map((block) => block.type),
    ["summary", "key_facts", "follow_up_chips"],
  );
});

test("broad contract-service prompt stays overview-first", () => {
  const result = buildGuidanceMetadata([
    {
      role: "user",
      content: "საკონტრაქტო სამხედრო სამსახურის შესახებ ინფორმაცია მინდა.",
    },
  ], "ka");

  assert.equal(result.journey, "contract_service");
  assert.deepEqual(
    result.blocks.map((block) => block.type),
    ["summary", "key_facts", "follow_up_chips"],
  );
});

test("student deferral prompt still keeps focused verification guidance", () => {
  const result = buildGuidanceMetadata([
    {
      role: "user",
      content: "სტუდენტი ვარ და გადავადება მაინტერესებს.",
    },
  ], "ka");

  assert.equal(result.journey, "deferral");
  assert.ok(result.blocks.some((block) => block.type === "verification_note"));
  assert.ok(result.blocks.some((block) => block.type === "follow_up_chips"));
  assert.ok(!result.blocks.some((block) => block.type === "documents"));
});
