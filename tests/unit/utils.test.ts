import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildOrigins, clearCookies, clearBrowserData } from "../../utils";
import type { CookieClearType } from "../../types";

describe("buildOrigins", () => {
  it("should build origins for single domain", () => {
    const domains = new Set(["example.com"]);
    const result = buildOrigins(domains);
    expect(result).toEqual(["https://example.com"]);
  });

  it("should build origins for multiple domains", () => {
    const domains = new Set(["example.com", "test.org"]);
    const result = buildOrigins(domains);
    expect(result).toEqual(["https://example.com", "https://test.org"]);
  });

  it("should return empty array for empty set", () => {
    const domains = new Set<string>();
    const result = buildOrigins(domains);
    expect(result).toEqual([]);
  });
});

describe("clearCookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should clear all cookies when no options provided", async () => {
    const mockCookies = [
      { name: "test1", domain: "example.com", path: "/", secure: false, httpOnly: false },
      { name: "test2", domain: "test.org", path: "/", secure: true, httpOnly: true },
    ] as chrome.cookies.Cookie[];

    vi.spyOn(chrome.cookies, "getAll").mockResolvedValue(mockCookies);
    vi.spyOn(chrome.cookies, "remove").mockResolvedValue({
      name: "test",
      url: "http://example.com",
    } as any);

    const result = await clearCookies();

    expect(chrome.cookies.getAll).toHaveBeenCalled();
    expect(result.count).toBe(2);
    expect(result.clearedDomains.size).toBe(2);
  });

  it("should filter cookies by domain", async () => {
    const mockCookies = [
      { name: "test1", domain: "example.com", path: "/", secure: false, httpOnly: false },
      { name: "test2", domain: "test.org", path: "/", secure: true, httpOnly: true },
    ] as chrome.cookies.Cookie[];

    vi.spyOn(chrome.cookies, "getAll").mockResolvedValue(mockCookies);
    vi.spyOn(chrome.cookies, "remove").mockResolvedValue({
      name: "test",
      url: "http://example.com",
    } as any);

    const result = await clearCookies({
      filterFn: (domain) => domain === "example.com",
    });

    expect(result.count).toBe(1);
    expect(result.clearedDomains.has("example.com")).toBe(true);
  });

  it("should filter cookies by type - session only", async () => {
    const mockCookies = [
      {
        name: "session1",
        domain: "example.com",
        path: "/",
        secure: false,
        httpOnly: false,
      },
      {
        name: "persistent1",
        domain: "example.com",
        path: "/",
        secure: true,
        httpOnly: false,
        expirationDate: Date.now() / 1000 + 3600,
      },
    ] as chrome.cookies.Cookie[];

    vi.spyOn(chrome.cookies, "getAll").mockResolvedValue(mockCookies);
    vi.spyOn(chrome.cookies, "remove").mockResolvedValue({
      name: "test",
      url: "http://example.com",
    } as any);

    const result = await clearCookies({
      clearType: "session" as CookieClearType,
    });

    expect(result.count).toBe(1);
  });

  it("should filter cookies by type - persistent only", async () => {
    const mockCookies = [
      {
        name: "session1",
        domain: "example.com",
        path: "/",
        secure: false,
        httpOnly: false,
      },
      {
        name: "persistent1",
        domain: "example.com",
        path: "/",
        secure: true,
        httpOnly: false,
        expirationDate: Date.now() / 1000 + 3600,
      },
    ] as chrome.cookies.Cookie[];

    vi.spyOn(chrome.cookies, "getAll").mockResolvedValue(mockCookies);
    vi.spyOn(chrome.cookies, "remove").mockResolvedValue({
      name: "test",
      url: "http://example.com",
    } as any);

    const result = await clearCookies({
      clearType: "persistent" as CookieClearType,
    });

    expect(result.count).toBe(1);
  });

  it("should handle errors gracefully", async () => {
    const mockCookies = [
      { name: "test1", domain: "example.com", path: "/", secure: false, httpOnly: false },
    ] as chrome.cookies.Cookie[];

    vi.spyOn(chrome.cookies, "getAll").mockResolvedValue(mockCookies);
    vi.spyOn(chrome.cookies, "remove").mockRejectedValue(new Error("Failed to remove"));

    const result = await clearCookies();

    expect(result.count).toBe(0);
    expect(result.clearedDomains.size).toBe(0);
  });
});

describe("clearBrowserData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should clear cache when clearCache is true", async () => {
    const domains = new Set(["example.com"]);
    const mockOrigins = ["https://example.com"];

    vi.spyOn(chrome.browsingData, "remove").mockResolvedValue(undefined);

    await clearBrowserData(domains, { clearCache: true });

    expect(chrome.browsingData.remove).toHaveBeenCalledWith(
      { origins: mockOrigins },
      {
        cacheStorage: true,
        fileSystems: true,
        serviceWorkers: true,
      }
    );
  });

  it("should clear localStorage when clearLocalStorage is true", async () => {
    const domains = new Set(["example.com"]);
    const mockOrigins = ["https://example.com"];

    vi.spyOn(chrome.browsingData, "remove").mockResolvedValue(undefined);

    await clearBrowserData(domains, { clearLocalStorage: true });

    expect(chrome.browsingData.remove).toHaveBeenCalledWith(
      { origins: mockOrigins },
      {
        localStorage: true,
      }
    );
  });

  it("should clear IndexedDB when clearIndexedDB is true", async () => {
    const domains = new Set(["example.com"]);
    const mockOrigins = ["https://example.com"];

    vi.spyOn(chrome.browsingData, "remove").mockResolvedValue(undefined);

    await clearBrowserData(domains, { clearIndexedDB: true });

    expect(chrome.browsingData.remove).toHaveBeenCalledWith(
      { origins: mockOrigins },
      {
        indexedDB: true,
      }
    );
  });

  it("should not clear anything when all options are false", async () => {
    const domains = new Set(["example.com"]);

    vi.spyOn(chrome.browsingData, "remove").mockResolvedValue(undefined);

    await clearBrowserData(domains, {
      clearCache: false,
      clearLocalStorage: false,
      clearIndexedDB: false,
    });

    expect(chrome.browsingData.remove).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    const domains = new Set(["example.com"]);

    vi.spyOn(chrome.browsingData, "remove").mockRejectedValue(new Error("Failed to clear"));

    await clearBrowserData(domains, { clearCache: true });

    expect(chrome.browsingData.remove).toHaveBeenCalled();
  });

  it("should not call clear when domains is empty", async () => {
    const domains = new Set<string>();

    vi.spyOn(chrome.browsingData, "remove").mockResolvedValue(undefined);

    await clearBrowserData(domains, { clearCache: true });

    expect(chrome.browsingData.remove).not.toHaveBeenCalled();
  });
});
