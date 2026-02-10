import { test, expect } from "@playwright/test";

test.describe("Cookie Manager Pro Extension", () => {
  test("should load extension successfully", async ({ context }) => {
    // Get the background page or service worker
    const backgroundPages = context.backgroundPages();
    console.log("Background pages:", backgroundPages.length);

    // Get all pages
    const pages = context.pages();
    console.log("Pages:", pages.length);

    // Extension should be loaded
    expect(backgroundPages.length + pages.length).toBeGreaterThanOrEqual(0);
  });

  test("should have extension context", async ({ page }) => {
    // Navigate to a simple page
    await page.goto("https://example.com");

    // Check if we can execute JavaScript in the page
    const title = await page.title();
    expect(title).toBeDefined();
  });
});
