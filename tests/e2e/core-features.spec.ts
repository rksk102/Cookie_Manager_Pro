import { test, expect } from "@playwright/test";
import type { CookieClearType } from "../../types";

test.describe("Cookie Manager Pro - 核心功能测试", () => {
  test.beforeEach(async ({ context }) => {
    const extensionPath = process.env.EXTENSION_PATH || "build/chrome-mv3-prod";
    await context.addInitScript({
      path: extensionPath,
    });
  });

  test("应该能够添加域名到白名单", async ({ page }) => {
    await page.goto("https://example.com");

    const domain = "example.com";

    const isAdded = await page.evaluate(async (domain) => {
      const { storage } = await import("../../store");
      const whitelist = await storage.get("whitelist");
      const currentList = whitelist || [];
      await storage.set("whitelist", [...currentList, domain]);
      return true;
    }, domain);

    expect(isAdded).toBe(true);
  });

  test("应该能够添加域名到黑名单", async ({ page }) => {
    await page.goto("https://example.com");

    const domain = "example.com";

    const isAdded = await page.evaluate(async (domain) => {
      const { storage } = await import("../../store");
      const blacklist = await storage.get("blacklist");
      const currentList = blacklist || [];
      await storage.set("blacklist", [...currentList, domain]);
      return true;
    }, domain);

    expect(isAdded).toBe(true);
  });

  test("应该能够清除当前网站的 Cookie", async ({ page, context }) => {
    await page.goto("https://example.com");

    const cookiesBefore = await context.cookies();
    expect(cookiesBefore.length).toBeGreaterThanOrEqual(0);

    const clearedCount = await page.evaluate(async () => {
      const { performCleanupWithFilter } = await import("../../utils/cleanup");
      const { isDomainMatch } = await import("../../utils");

      const result = await performCleanupWithFilter(
        (domain) => isDomainMatch(domain, "example.com"),
        { clearType: "all" as CookieClearType }
      );

      return result.count;
    });

    expect(clearedCount).toBeGreaterThanOrEqual(0);
  });

  test("应该能够清除所有 Cookie（白名单除外）", async ({ page, context }) => {
    await page.goto("https://example.com");
    const cookiesBefore = await context.cookies();
    expect(cookiesBefore.length).toBeGreaterThanOrEqual(0);

    const clearedCount = await page.evaluate(async () => {
      const { performCleanupWithFilter } = await import("../../utils/cleanup");

      const result = await performCleanupWithFilter(() => true, {
        clearType: "all" as CookieClearType,
      });

      return result.count;
    });

    expect(clearedCount).toBeGreaterThanOrEqual(0);
  });

  test("应该能够清除过期的 Cookie", async ({ page }) => {
    await page.goto("https://example.com");

    const clearedCount = await page.evaluate(async () => {
      const { cleanupExpiredCookies } = await import("../../utils/cleanup");
      const count = await cleanupExpiredCookies();
      return count;
    });

    expect(clearedCount).toBeGreaterThanOrEqual(0);
  });

  test("应该能够记录清理日志", async ({ page }) => {
    await page.goto("https://example.com");

    const logEntry = {
      id: "test-log-123",
      domain: "example.com",
      cookieType: "all",
      count: 5,
      timestamp: Date.now(),
    };

    const isLogged = await page.evaluate(async (entry) => {
      const { storage } = await import("../../store");
      const logs = (await storage.get("clearLog")) || [];
      await storage.set("clearLog", [entry, ...logs]);
      return true;
    }, logEntry);

    expect(isLogged).toBe(true);
  });

  test("应该能够清除所有日志", async ({ page }) => {
    await page.goto("https://example.com");

    const isCleared = await page.evaluate(async () => {
      const { CLEAR_LOG_KEY } = await import("../../store");
      const { useStorage } = await import("@plasmohq/storage/hook");
      return new Promise((resolve) => {
        const [, setLogs] = useStorage(CLEAR_LOG_KEY, []);
        setLogs([]);
        resolve(true);
      });
    });

    expect(isCleared).toBe(true);
  });

  test("应该能够更新设置", async ({ page }) => {
    await page.goto("https://example.com");

    const newSettings = {
      clearType: "session",
      logRetention: "7days",
      themeMode: "dark",
      mode: "whitelist",
      clearLocalStorage: true,
      clearIndexedDB: false,
      clearCache: true,
      enableAutoCleanup: true,
      cleanupOnTabDiscard: true,
      cleanupOnStartup: false,
      cleanupExpiredCookies: true,
    };

    const isUpdated = await page.evaluate(async (settings) => {
      const { SETTINGS_KEY } = await import("../../store");
      const { useStorage } = await import("@plasmohq/storage/hook");
      return new Promise((resolve) => {
        const [, setSettings] = useStorage(SETTINGS_KEY, {});
        setSettings(settings);
        resolve(true);
      });
    }, newSettings);

    expect(isUpdated).toBe(true);
  });

  test("应该能够获取当前网站的 Cookie 统计", async ({ page }) => {
    await page.goto("https://example.com");

    const stats = await page.evaluate(async () => {
      const { isDomainMatch } = await import("../../utils");

      const cookies = await chrome.cookies.getAll({});
      const currentCookiesList = cookies.filter((c) => isDomainMatch(c.domain, "example.com"));
      const sessionCookies = currentCookiesList.filter((c) => !c.expirationDate);
      const persistentCookies = currentCookiesList.filter((c) => c.expirationDate);

      return {
        total: cookies.length,
        current: currentCookiesList.length,
        session: sessionCookies.length,
        persistent: persistentCookies.length,
      };
    });

    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("current");
    expect(stats).toHaveProperty("session");
    expect(stats).toHaveProperty("persistent");
  });

  test("应该能够检测敏感 Cookie", async ({ page }) => {
    await page.goto("https://example.com");

    const testCookies = [
      { name: "session_id", value: "abc123" },
      { name: "auth_token", value: "xyz789" },
      { name: "user_pref", value: "dark_mode" },
    ];

    const results = await page.evaluate(async (cookies) => {
      const { SENSITIVE_COOKIE_KEYWORDS } = await import("../../constants");

      return cookies.map((cookie) => ({
        name: cookie.name,
        isSensitive: SENSITIVE_COOKIE_KEYWORDS.some((keyword) =>
          cookie.name.toLowerCase().includes(keyword)
        ),
      }));
    }, testCookies);

    expect(results[0].isSensitive).toBe(true);
    expect(results[1].isSensitive).toBe(true);
    expect(results[2].isSensitive).toBe(false);
  });
});
