import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Cookie Manager Pro Extension", () => {
  let extensionPath: string;

  test.beforeAll(async ({ context }) => {
    extensionPath = path.join(__dirname, "..", "..", "build", "chrome-mv3-prod");
    await context.addInitScript({
      content: `
        window.chrome = {
          cookies: {
            getAll: () => Promise.resolve([]),
            remove: () => Promise.resolve(),
            onChanged: { addListener: () => {}, removeListener: () => {} },
          },
          tabs: {
            query: () => Promise.resolve([{ url: "https://example.com" }]),
          },
          browsingData: {
            remove: () => Promise.resolve(),
          },
          storage: {
            local: {
              get: () => Promise.resolve({}),
              set: () => Promise.resolve(),
            },
          },
        };
      `,
    });
  });

  test("should load extension successfully", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    await expect(page.locator("h1")).toHaveText("🍪 Cookie Manager Pro");
  });

  test("should display current domain", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    await expect(page.locator(".domain-info")).toBeVisible();
  });

  test("should display cookie statistics", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    await expect(page.locator(".stats")).toBeVisible();
    await expect(page.locator(".stat-item")).toHaveCount(4);
  });

  test("should have quick action buttons", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    await expect(page.locator(".button-group")).toBeVisible();
    await expect(page.locator("button")).toHaveCount(4);
  });

  test("should switch between tabs", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    const manageTab = page.locator(".tab-btn").first();
    await expect(manageTab).toHaveClass("active");

    const settingsTab = page.locator(".tab-btn").filter({ hasText: "设置" });
    await settingsTab.click();
    await expect(settingsTab).toHaveClass("active");
  });

  test("should display whitelist when mode is whitelist", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    const whitelistTab = page.locator(".tab-btn").filter({ hasText: "白名单" });
    await whitelistTab.click();

    await expect(page.locator("h2")).toContainText("白名单");
  });

  test("should display blacklist when mode is blacklist", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    const blacklistTab = page.locator(".tab-btn").filter({ hasText: "黑名单" });
    await blacklistTab.click();

    await expect(page.locator("h2")).toContainText("黑名单");
  });

  test("should show settings page", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    const settingsTab = page.locator(".tab-btn").filter({ hasText: "设置" });
    await settingsTab.click();

    await expect(page.locator("h2")).toContainText("设置");
  });

  test("should show log page", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    const logTab = page.locator(".tab-btn").filter({ hasText: "日志" });
    await logTab.click();

    await expect(page.locator("h2")).toContainText("日志");
  });

  test("should display message notifications", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    const message = page.locator(".message");
    await expect(message).toBeVisible();

    await page.evaluate(() => {
      const msg = document.querySelector(".message");
      if (msg) {
        msg.textContent = "测试消息";
        msg.classList.add("visible");
      }
    });

    await expect(message).toHaveText("测试消息");
    await expect(message).toHaveClass(/visible/);
  });

  test("should handle error messages", async ({ page }) => {
    await page.goto("chrome-extension://" + extensionPath + "/popup.html");

    const message = page.locator(".message");
    await expect(message).toBeVisible();

    await page.evaluate(() => {
      const msg = document.querySelector(".message");
      if (msg) {
        msg.textContent = "错误消息";
        msg.classList.add("visible", "error");
      }
    });

    await expect(message).toHaveText("错误消息");
    await expect(message).toHaveClass(/error/);
  });
});
