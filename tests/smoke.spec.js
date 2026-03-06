import { expect, test } from "@playwright/test";

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

for (const target of targets) {
  test(`${target.name} smoke chat flow`, async ({ page }) => {
    await openGeorgianChat(page, target.url);

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
  });
}
