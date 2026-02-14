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
});
