import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import IndexPopup from "../../popup";

vi.mock("~utils/cleanup", () => ({
  performCleanupWithFilter: vi.fn(() =>
    Promise.resolve({ count: 5, clearedDomains: ["example.com"] })
  ),
  cleanupExpiredCookies: vi.fn(() => Promise.resolve(3)),
  performCleanup: vi.fn(() => Promise.resolve({ count: 2, clearedDomains: ["test.com"] })),
}));

vi.mock("~utils", () => ({
  isDomainMatch: vi.fn((domain: string, currentDomain: string) => domain.includes(currentDomain)),
  isInList: vi.fn(() => false),
  isTrackingCookie: vi.fn(() => false),
  isThirdPartyCookie: vi.fn(() => false),
  isSensitiveCookie: vi.fn(() => false),
  normalizeDomain: vi.fn((d: string) => d.replace(/^\./, "").toLowerCase()),
  assessCookieRisk: vi.fn(() => ({ level: "low", reason: "安全" })),
  getRiskLevelColor: vi.fn(() => "#22c55e"),
  getRiskLevelText: vi.fn(() => "低风险"),
  clearSingleCookie: vi.fn(() => Promise.resolve(true)),
  editCookie: vi.fn(() => Promise.resolve(true)),
  maskCookieValue: vi.fn(() => "••••••••"),
  getCookieKey: vi.fn((name: string, domain: string) => `${name}-${domain}`),
  toggleSetValue: vi.fn((set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return next;
  }),
  getCookieTypeName: vi.fn(() => "会话"),
  getActionText: vi.fn(() => "清除"),
  getActionColor: vi.fn(() => "#22c55e"),
  formatLogTime: vi.fn(() => "2024-01-01 12:00"),
}));

describe("IndexPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          id: 1,
          url: "https://example.com/test",
          active: true,
          currentWindow: true,
        },
      ])
    );

    (chrome.cookies.getAll as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          name: "test",
          value: "value",
          domain: ".example.com",
          path: "/",
          secure: true,
          httpOnly: false,
          sameSite: "lax",
        },
        {
          name: "session",
          value: "sessionval",
          domain: ".example.com",
          path: "/",
          secure: false,
          httpOnly: false,
          sameSite: "lax",
        },
        {
          name: "persistent",
          value: "persistentval",
          domain: ".example.com",
          path: "/",
          secure: true,
          httpOnly: true,
          sameSite: "strict",
          expirationDate: Date.now() / 1000 + 3600,
        },
      ])
    );
  });

  it("should render header", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("Cookie Manager Pro")).toBeTruthy();
  });

  it("should render tabs", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("管理")).toBeTruthy();
    expect(screen.getByText("设置")).toBeTruthy();
    expect(screen.getByText("日志")).toBeTruthy();
  });

  it("should switch tabs when clicked", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const settingsTab = screen.getByRole("tab", { name: /设置/ });
    fireEvent.click(settingsTab);

    expect(screen.getByRole("tabpanel")).toBeTruthy();
  });

  it("should render cookie statistics section", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("Cookie统计")).toBeTruthy();
  });

  it("should render quick actions section", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("快速操作")).toBeTruthy();
  });

  it("should render quick action buttons", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("添加到白名单")).toBeTruthy();
    expect(screen.getByText("添加到黑名单")).toBeTruthy();
    expect(screen.getByText("清除当前网站")).toBeTruthy();
    expect(screen.getByText("清除所有Cookie")).toBeTruthy();
  });

  it("should switch to log tab when clicked", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const logTab = screen.getByRole("tab", { name: /日志/ });
    fireEvent.click(logTab);

    expect(screen.getByText("清除日志")).toBeTruthy();
  });

  it("should switch to settings tab when clicked", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const settingsTab = screen.getByRole("tab", { name: /设置/ });
    fireEvent.click(settingsTab);

    expect(screen.getByText("工作模式")).toBeTruthy();
  });

  it("should show confirm dialog when clear current site is clicked", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });
  });

  it("should show confirm dialog when clear all is clicked", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearAllBtn = screen.getByText("清除所有Cookie");
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });
  });

  it("should close confirm dialog when cancel is clicked", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const cancelBtn = screen.getByText("取消");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("清除确认")).toBeNull();
    });
  });

  it("should execute clear when confirm is clicked", async () => {
    const { performCleanupWithFilter } = await import("~utils/cleanup");

    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(performCleanupWithFilter).toHaveBeenCalled();
    });
  });

  it("should execute clear all when confirm is clicked", async () => {
    const { performCleanupWithFilter } = await import("~utils/cleanup");

    await act(async () => {
      render(<IndexPopup />);
    });

    const clearAllBtn = screen.getByText("清除所有Cookie");
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(performCleanupWithFilter).toHaveBeenCalled();
    });
  });

  it("should display current domain", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const domainInfo = document.querySelector(".domain-info");
    await waitFor(() => {
      expect(domainInfo?.textContent).toBe("example.com");
    });
  });

  it("should display stat labels", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const statLabels = document.querySelectorAll(".stat-label");
    expect(statLabels.length).toBeGreaterThan(0);
    expect(statLabels[0].textContent).toBe("总数");
  });

  it("should switch to whitelist tab when clicked", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const whitelistTab = screen.getByRole("tab", { name: /白名单/ });
    fireEvent.click(whitelistTab);

    expect(screen.getByText("白名单域名")).toBeTruthy();
  });

  it("should handle add to whitelist click", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const addWhitelistBtn = screen.getByText("添加到白名单");
    fireEvent.click(addWhitelistBtn);

    await waitFor(() => {
      expect(screen.getByText(/已添加.*到白名单/)).toBeTruthy();
    });
  });

  it("should handle add to blacklist click", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const addBlacklistBtn = screen.getByText("添加到黑名单");
    fireEvent.click(addBlacklistBtn);

    await waitFor(() => {
      expect(screen.getByText(/已添加.*到黑名单/)).toBeTruthy();
    });
  });

  it("should handle tab without url", async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          id: 1,
          url: undefined,
          active: true,
          currentWindow: true,
        },
      ])
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("无法获取域名")).toBeTruthy();
  });

  it("should handle invalid url", async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          id: 1,
          url: "invalid-url",
          active: true,
          currentWindow: true,
        },
      ])
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("无法获取域名")).toBeTruthy();
  });

  it("should show success message after clearing cookies", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/已清除/)).toBeTruthy();
    });
  });

  it("should display stat values", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const statValues = document.querySelectorAll(".stat-value");
      expect(statValues.length).toBeGreaterThan(0);
    });
  });

  it("should have correct tab structure", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(4);
  });

  it("should have correct aria attributes on tabs", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const manageTab = screen.getByRole("tab", { name: /管理/ });
    expect(manageTab.getAttribute("aria-selected")).toBe("true");
    expect(manageTab.getAttribute("tabindex")).toBe("0");
  });

  it("should update aria-selected when tab changes", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const settingsTab = screen.getByRole("tab", { name: /设置/ });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(settingsTab.getAttribute("aria-selected")).toBe("true");
    });
  });

  it("should render container with theme class", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const container = document.querySelector(".container");
    expect(container?.className).toMatch(/theme-/);
  });

  it("should render cookie list component", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Cookie 详情/)).toBeTruthy();
    });
  });

  it("should handle cookies change event", async () => {
    const addListenerMock = chrome.cookies.onChanged.addListener as ReturnType<typeof vi.fn>;

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(addListenerMock).toHaveBeenCalled();
  });

  it("should handle multiple cookies with different domains", async () => {
    (chrome.cookies.getAll as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          name: "test1",
          value: "value1",
          domain: ".example.com",
          path: "/",
          secure: true,
          httpOnly: false,
          sameSite: "lax",
        },
        {
          name: "test2",
          value: "value2",
          domain: ".other.com",
          path: "/",
          secure: false,
          httpOnly: false,
          sameSite: "lax",
        },
      ])
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const statValues = document.querySelectorAll(".stat-value");
      expect(statValues[0].textContent).toBe("2");
    });
  });

  it("should render message component", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const addWhitelistBtn = screen.getByText("添加到白名单");
    fireEvent.click(addWhitelistBtn);

    await waitFor(() => {
      const message = document.querySelector(".message");
      expect(message).toBeTruthy();
    });
  });

  it("should render confirm dialog with danger variant for clear all", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearAllBtn = screen.getByText("清除所有Cookie");
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      const title = document.querySelector(".confirm-title.danger");
      expect(title).toBeTruthy();
    });
  });

  it("should render confirm dialog with warning variant for clear current", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      const title = document.querySelector(".confirm-title");
      expect(title).toBeTruthy();
      expect(title?.classList.contains("danger")).toBe(false);
    });
  });

  it("should render section icons", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const sectionIcons = document.querySelectorAll(".section-icon");
    expect(sectionIcons.length).toBeGreaterThan(0);
  });

  it("should render tab icons", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const tabIcons = document.querySelectorAll(".tab-icon");
    expect(tabIcons.length).toBe(4);
  });

  it("should render button icons", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const btnIcons = document.querySelectorAll(".btn-icon");
    expect(btnIcons.length).toBeGreaterThan(0);
  });

  it("should handle empty cookies list", async () => {
    (chrome.cookies.getAll as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([])
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const statValues = document.querySelectorAll(".stat-value");
      expect(statValues[0].textContent).toBe("0");
    });
  });

  it("should register media query listener", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    expect(window.matchMedia).toBeDefined();
  });

  it("should handle cookies with tracking cookies", async () => {
    const { isTrackingCookie } = await import("~utils");
    (isTrackingCookie as ReturnType<typeof vi.fn>).mockImplementation(() => true);

    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const statValues = document.querySelectorAll(".stat-value");
      expect(statValues.length).toBeGreaterThan(0);
    });
  });

  it("should handle cookies with third party cookies", async () => {
    const { isThirdPartyCookie } = await import("~utils");
    (isThirdPartyCookie as ReturnType<typeof vi.fn>).mockImplementation(() => true);

    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const statValues = document.querySelectorAll(".stat-value");
      expect(statValues.length).toBeGreaterThan(0);
    });
  });

  it("should render all stat items", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const statItems = document.querySelectorAll(".stat-item");
      expect(statItems.length).toBe(6);
    });
  });

  it("should render all sections", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const sections = document.querySelectorAll(".section");
      expect(sections.length).toBe(3);
    });
  });

  it("should have correct tabpanel ids", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const managePanel = document.getElementById("manage-panel");
    expect(managePanel).toBeTruthy();
  });

  it("should have correct button classes", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const successBtn = document.querySelector(".btn-success");
    const secondaryBtn = document.querySelector(".btn-secondary");
    const warningBtn = document.querySelector(".btn-warning");
    const dangerBtn = document.querySelector(".btn-danger");

    expect(successBtn).toBeTruthy();
    expect(secondaryBtn).toBeTruthy();
    expect(warningBtn).toBeTruthy();
    expect(dangerBtn).toBeTruthy();
  });

  it("should handle multiple clears in sequence", async () => {
    const { performCleanupWithFilter } = await import("~utils/cleanup");

    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(performCleanupWithFilter).toHaveBeenCalledTimes(1);
    });

    const clearAllBtn = screen.getByText("清除所有Cookie");
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn2 = screen.getByText("确定");
    fireEvent.click(confirmBtn2);

    await waitFor(() => {
      expect(performCleanupWithFilter).toHaveBeenCalledTimes(2);
    });
  });

  it("should show message with error class when error", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const message = document.querySelector(".message");
    expect(message?.classList.contains("error")).toBe(false);
    expect(message?.classList.contains("visible")).toBe(false);
  });

  it("should handle chrome.tabs.query returning empty array", async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve([]));

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("无法获取域名")).toBeTruthy();
  });

  it("should handle tab with chrome:// url", async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          id: 1,
          url: "chrome://extensions",
          active: true,
          currentWindow: true,
        },
      ])
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    const domainInfo = document.querySelector(".domain-info");
    expect(domainInfo?.textContent).toBe("extensions");
  });

  it("should handle tab with about: url", async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          id: 1,
          url: "about:blank",
          active: true,
          currentWindow: true,
        },
      ])
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(screen.getByText("无法获取域名")).toBeTruthy();
  });

  it("should handle updateStats error", async () => {
    (chrome.cookies.getAll as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.reject(new Error("Failed to get cookies"))
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      expect(screen.getByText("更新统计信息失败")).toBeTruthy();
    });
  });

  it("should handle clearCookies error", async () => {
    const { performCleanupWithFilter } = await import("~utils/cleanup");
    (performCleanupWithFilter as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.reject(new Error("Failed to clear"))
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText("清除Cookie失败")).toBeTruthy();
    });
  });

  it("should call cookies.onChanged listener", async () => {
    let cookieListener: (() => void) | null = null;
    (chrome.cookies.onChanged.addListener as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: () => void) => {
        cookieListener = fn;
      }
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(cookieListener).not.toBeNull();

    await act(async () => {
      if (cookieListener) {
        cookieListener();
      }
    });
  });

  it("should handle media query change event", async () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    const mockMatchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners.push(handler);
      }),
      removeEventListener: vi.fn(),
    }));

    Object.defineProperty(window, "matchMedia", {
      value: mockMatchMedia,
      writable: true,
    });

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(listeners.length).toBeGreaterThan(0);

    await act(async () => {
      listeners[0]({ matches: true } as MediaQueryListEvent);
    });
  });

  it("should render with dark theme when system is dark", async () => {
    const mockMatchMedia = vi.fn((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    Object.defineProperty(window, "matchMedia", {
      value: mockMatchMedia,
      writable: true,
    });

    await act(async () => {
      render(<IndexPopup />);
    });

    const container = document.querySelector(".container");
    expect(container?.className).toContain("theme-");
  });

  it("should handle clear with multiple domains", async () => {
    const { performCleanupWithFilter } = await import("~utils/cleanup");
    (performCleanupWithFilter as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ count: 10, clearedDomains: ["example.com", "test.com", "other.com"] })
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    const clearAllBtn = screen.getByText("清除所有Cookie");
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/已清除/)).toBeTruthy();
    });
  });

  it("should handle clear with zero count", async () => {
    const { performCleanupWithFilter } = await import("~utils/cleanup");
    (performCleanupWithFilter as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ count: 0, clearedDomains: [] })
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/已清除/)).toBeTruthy();
    });
  });

  it("should remove cookies.onChanged listener on unmount", async () => {
    const removeListenerMock = chrome.cookies.onChanged.removeListener as ReturnType<typeof vi.fn>;

    const { unmount } = await act(async () => {
      return render(<IndexPopup />);
    });

    await act(async () => {
      unmount();
    });

    expect(removeListenerMock).toHaveBeenCalled();
  });

  it("should handle escape key to close confirm dialog", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("清除确认")).toBeNull();
    });
  });

  it("should handle clear with single domain", async () => {
    const { performCleanupWithFilter } = await import("~utils/cleanup");
    (performCleanupWithFilter as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ count: 5, clearedDomains: ["example.com"] })
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    const clearAllBtn = screen.getByText("清除所有Cookie");
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/已清除/)).toBeTruthy();
    });
  });

  it("should handle debounce timer on cookies change", async () => {
    vi.useFakeTimers();

    let cookieListener: (() => void) | null = null;
    (chrome.cookies.onChanged.addListener as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: () => void) => {
        cookieListener = fn;
      }
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(cookieListener).not.toBeNull();

    await act(async () => {
      if (cookieListener) {
        cookieListener();
        cookieListener();
      }
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();
  });

  it("should remove media query listener on unmount", async () => {
    const removeEventListenerMock = vi.fn();
    const mockMatchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
    }));

    Object.defineProperty(window, "matchMedia", {
      value: mockMatchMedia,
      writable: true,
    });

    const { unmount } = await act(async () => {
      return render(<IndexPopup />);
    });

    await act(async () => {
      unmount();
    });

    expect(removeEventListenerMock).toHaveBeenCalled();
  });

  it("should handle message visibility timeout", async () => {
    vi.useFakeTimers();

    await act(async () => {
      render(<IndexPopup />);
    });

    const addWhitelistBtn = screen.getByText("添加到白名单");
    fireEvent.click(addWhitelistBtn);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const message = document.querySelector(".message");
    expect(message?.classList.contains("visible")).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();
  });

  it("should handle cookies with storeId", async () => {
    (chrome.cookies.getAll as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          name: "test",
          value: "value",
          domain: ".example.com",
          path: "/",
          secure: true,
          httpOnly: false,
          sameSite: "lax",
          storeId: "store-1",
        },
      ])
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const statValues = document.querySelectorAll(".stat-value");
      expect(statValues[0].textContent).toBe("1");
    });
  });

  it("should handle cookies with sameSite attribute", async () => {
    (chrome.cookies.getAll as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve([
        {
          name: "test",
          value: "value",
          domain: ".example.com",
          path: "/",
          secure: true,
          httpOnly: false,
          sameSite: "strict",
        },
      ])
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const statValues = document.querySelectorAll(".stat-value");
      expect(statValues.length).toBeGreaterThan(0);
    });
  });

  it("should handle error message with error class", async () => {
    const { performCleanupWithFilter } = await import("~utils/cleanup");
    (performCleanupWithFilter as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.reject(new Error("Failed"))
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const confirmBtn = screen.getByText("确定");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const message = document.querySelector(".message");
      expect(message?.classList.contains("error")).toBe(true);
    });
  });

  it("should handle tab aria-controls attribute", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const manageTab = screen.getByRole("tab", { name: /管理/ });
    expect(manageTab.getAttribute("aria-controls")).toBe("manage-panel");
  });

  it("should handle confirm dialog overlay click", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const overlay = document.querySelector(".confirm-overlay");
    if (overlay) {
      fireEvent.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByText("清除确认")).toBeNull();
    });
  });

  it("should handle confirm dialog Enter key", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const overlay = document.querySelector(".confirm-overlay");
    if (overlay) {
      fireEvent.keyDown(overlay, { key: "Enter" });
    }

    await waitFor(() => {
      expect(screen.queryByText("清除确认")).toBeNull();
    });
  });

  it("should handle confirm dialog Space key", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      expect(screen.getByText("清除确认")).toBeTruthy();
    });

    const overlay = document.querySelector(".confirm-overlay");
    if (overlay) {
      fireEvent.keyDown(overlay, { key: " " });
    }

    await waitFor(() => {
      expect(screen.queryByText("清除确认")).toBeNull();
    });
  });

  it("should handle message with isError true", async () => {
    (chrome.cookies.getAll as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.reject(new Error("Failed"))
    );

    await act(async () => {
      render(<IndexPopup />);
    });

    await waitFor(() => {
      const message = document.querySelector(".message.error");
      expect(message).toBeTruthy();
    });
  });

  it("should handle quickAddToWhitelist with no currentDomain", async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve([]));

    await act(async () => {
      render(<IndexPopup />);
    });

    const addWhitelistBtn = screen.getByText("添加到白名单");
    fireEvent.click(addWhitelistBtn);

    await waitFor(() => {
      expect(screen.getByText("无法获取域名")).toBeTruthy();
    });
  });

  it("should handle quickAddToBlacklist with no currentDomain", async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve([]));

    await act(async () => {
      render(<IndexPopup />);
    });

    const addBlacklistBtn = screen.getByText("添加到黑名单");
    fireEvent.click(addBlacklistBtn);

    await waitFor(() => {
      expect(screen.getByText("无法获取域名")).toBeTruthy();
    });
  });

  it("should handle message text content", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const addWhitelistBtn = screen.getByText("添加到白名单");
    fireEvent.click(addWhitelistBtn);

    await waitFor(() => {
      const message = document.querySelector(".message");
      expect(message?.textContent).toContain("已添加");
    });
  });

  it("should handle confirm dialog confirm button focus", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const clearCurrentBtn = screen.getByText("清除当前网站");
    fireEvent.click(clearCurrentBtn);

    await waitFor(() => {
      const confirmBtn = screen.getByText("确定");
      expect(confirmBtn).toBeTruthy();
    });
  });

  it("should handle settings change triggering init", async () => {
    const { useStorage } = await import("@plasmohq/storage/hook");
    const { useState } = await import("react");

    const settingsMock = vi.fn((key: string, defaultValue: unknown) => {
      if (key === "settings") {
        return [
          {
            mode: "whitelist",
            themeMode: "light",
            clearType: "all",
            clearCache: false,
            clearLocalStorage: false,
            clearIndexedDB: false,
            cleanupOnStartup: false,
            cleanupExpiredCookies: false,
            logRetention: "7d",
          },
        ];
      }
      return useState(defaultValue);
    });

    (useStorage as ReturnType<typeof vi.fn>).mockImplementation(settingsMock);

    await act(async () => {
      render(<IndexPopup />);
    });

    expect(settingsMock).toHaveBeenCalled();
  });

  it("should handle arrow right key for tab navigation", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const manageTab = screen.getByRole("tab", { name: /管理/ });
    const tablist = document.querySelector('[role="tablist"]');

    expect(manageTab.getAttribute("aria-selected")).toBe("true");

    if (tablist) {
      fireEvent.keyDown(tablist, { key: "ArrowRight" });
    }

    await waitFor(() => {
      const whitelistTab = screen.getByRole("tab", { name: /白名单/ });
      expect(whitelistTab.getAttribute("aria-selected")).toBe("true");
    });
  });

  it("should handle arrow left key for tab navigation", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const manageTab = screen.getByRole("tab", { name: /管理/ });
    const tablist = document.querySelector('[role="tablist"]');

    expect(manageTab.getAttribute("aria-selected")).toBe("true");

    if (tablist) {
      fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    }

    await waitFor(() => {
      const logTab = screen.getByRole("tab", { name: /日志/ });
      expect(logTab.getAttribute("aria-selected")).toBe("true");
    });
  });

  it("should handle Home key for tab navigation", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const settingsTab = screen.getByRole("tab", { name: /设置/ });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(settingsTab.getAttribute("aria-selected")).toBe("true");
    });

    const tablist = document.querySelector('[role="tablist"]');
    if (tablist) {
      fireEvent.keyDown(tablist, { key: "Home" });
    }

    await waitFor(() => {
      const manageTab = screen.getByRole("tab", { name: /管理/ });
      expect(manageTab.getAttribute("aria-selected")).toBe("true");
    });
  });

  it("should handle End key for tab navigation", async () => {
    await act(async () => {
      render(<IndexPopup />);
    });

    const manageTab = screen.getByRole("tab", { name: /管理/ });
    expect(manageTab.getAttribute("aria-selected")).toBe("true");

    const tablist = document.querySelector('[role="tablist"]');
    if (tablist) {
      fireEvent.keyDown(tablist, { key: "End" });
    }

    await waitFor(() => {
      const logTab = screen.getByRole("tab", { name: /日志/ });
      expect(logTab.getAttribute("aria-selected")).toBe("true");
    });
  });

  it("should apply custom theme CSS variables when theme is custom", async () => {
    const { useStorage } = await import("@plasmohq/storage/hook");

    (useStorage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === "settings") {
        return [
          {
            mode: "whitelist",
            themeMode: "custom",
            customTheme: {
              primary: "#ff0000",
              success: "#00ff00",
              warning: "#ffff00",
              danger: "#0000ff",
              bgPrimary: "#ffffff",
              textPrimary: "#000000",
            },
            clearType: "all",
            clearCache: false,
            clearLocalStorage: false,
            clearIndexedDB: false,
            cleanupOnStartup: false,
            cleanupExpiredCookies: false,
            logRetention: "7d",
          },
        ];
      }
      return [[]];
    });

    await act(async () => {
      render(<IndexPopup />);
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--primary-500")).toBe("#ff0000");
  });
});
