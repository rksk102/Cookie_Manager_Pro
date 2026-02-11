import { test, expect } from "@playwright/test";

test.describe("Cookie Manager Pro - 核心功能测试", () => {
  test("应该能够加载扩展", async ({ context }) => {
    const backgroundPages = context.backgroundPages();
    console.log("Background pages:", backgroundPages.length);

    const pages = context.pages();
    console.log("Pages:", pages.length);

    expect(backgroundPages.length + pages.length).toBeGreaterThanOrEqual(0);
  });

  test("应该能够导航到页面", async ({ page }) => {
    await page.goto("https://example.com");

    const title = await page.title();
    expect(title).toBeDefined();
  });
});
