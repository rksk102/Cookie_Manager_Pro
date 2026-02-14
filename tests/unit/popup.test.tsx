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
});
