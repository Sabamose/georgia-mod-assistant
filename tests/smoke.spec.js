import { devices, expect, test } from "@playwright/test";

const targets = [{
  name: "local",
  url: process.env.SMOKE_LOCAL_URL || "http://localhost:4173",
}];

if (process.env.SMOKE_REMOTE_URL) {
  targets.push({
    name: "vercel",
    url: process.env.SMOKE_REMOTE_URL,
  });
}

async function openGeorgianChat(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".trigger").click();
  await page.locator(".lang-trigger-btn").click();
  await page.locator(".lang-option", { hasText: "ქართული" }).click();
  await page.locator(".service-card").first().click();
}

async function runSmokeAssertions(page) {
  const firstAgentMessage = page.locator(".msg-agent .msg-content").first();
  await expect(firstAgentMessage).toContainText(/სამხედრო|სავალდებულო|18|27/, {
    timeout: 30_000,
  });

  const textarea = page.locator(".panel-textarea");
  await expect(textarea).toBeEnabled();
  await textarea.fill("გადავადება რა ღირს?");
  await page.locator(".send-btn").click();

  const lastAgentMessage = page.locator(".msg-agent .msg-content").last();
  await expect(lastAgentMessage).toContainText(/5,000|5000|ლარი/, {
    timeout: 30_000,
  });

  await expect(page.locator(".quick-action-btn")).toHaveCount(0);
  await expect(page.locator(".panel-textarea")).toBeEnabled();
}

for (const target of targets) {
  test(`${target.name} smoke chat flow`, async ({ page }) => {
    await openGeorgianChat(page, target.url);
    await runSmokeAssertions(page);
  });
  test(`${target.name} mobile smoke chat flow`, async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await context.newPage();

    await page.goto(target.url, { waitUntil: "networkidle" });
    await page.locator(".trigger").click();

    const panel = page.locator(".panel");
    await expect(panel).toBeVisible();

    const panelBox = await panel.boundingBox();
    expect(panelBox?.x ?? 999).toBeLessThanOrEqual(8);
    expect(panelBox?.width ?? 0).toBeGreaterThanOrEqual(378);

    await page.locator(".lang-trigger-btn").click();
    await page.locator(".lang-option", { hasText: "ქართული" }).click();
    await page.locator(".service-card").first().click();

    await runSmokeAssertions(page);
    await context.close();
  });
}
