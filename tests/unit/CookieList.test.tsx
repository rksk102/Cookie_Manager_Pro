import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CookieList } from "../../components/CookieList";

const mockCookies = [
  {
    name: "cookie1",
    value: "value1",
    domain: ".example.com",
    path: "/",
    secure: true,
    httpOnly: false,
    sameSite: "lax" as const,
  },
  {
    name: "cookie2",
    value: "value2",
    domain: "example.com",
    path: "/test",
    secure: false,
    httpOnly: true,
    sameSite: "strict" as const,
  },
  {
    name: "cookie3",
    value: "value3",
    domain: "test.com",
    path: "/",
    secure: false,
    httpOnly: false,
    sameSite: "unspecified" as const,
    expirationDate: 1234567890,
  },
];

vi.mock("../../utils", () => ({
  assessCookieRisk: vi.fn(() => ({ level: "low", reason: "安全" })),
  getRiskLevelColor: vi.fn(() => "#22c55e"),
  getRiskLevelText: vi.fn(() => "低风险"),
  clearSingleCookie: vi.fn(() => Promise.resolve(true)),
  editCookie: vi.fn(() => Promise.resolve(true)),
  normalizeDomain: vi.fn((domain: string) => domain.replace(/^\./, "").toLowerCase()),
  maskCookieValue: vi.fn((_value: string) => "••••••••"),
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
}));

describe("CookieList", () => {
  const mockOnUpdate = vi.fn();
  const mockOnMessage = vi.fn();

  beforeEach(() => {
    mockOnUpdate.mockClear();
    mockOnMessage.mockClear();
  });

  it("should render empty state when no cookies", () => {
    render(<CookieList cookies={[]} currentDomain="example.com" />);

    expect(screen.getByText("当前网站暂无 Cookie")).toBeTruthy();
  });

  it("should render cookie list header with count", () => {
    render(<CookieList cookies={mockCookies} currentDomain="example.com" />);

    expect(screen.getByText(/Cookie 详情/)).toBeTruthy();
    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it("should expand and collapse cookie list", () => {
    render(<CookieList cookies={mockCookies} currentDomain="example.com" />);

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    expect(screen.getByText("全选")).toBeTruthy();
  });

  it("should show select all checkbox when expanded", () => {
    render(<CookieList cookies={mockCookies} currentDomain="example.com" />);

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const checkbox = screen.getByRole("checkbox", { name: /全选/ });
    expect(checkbox).toBeTruthy();
  });

  it("should toggle select all", () => {
    render(<CookieList cookies={mockCookies} currentDomain="example.com" />);

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ }) as HTMLInputElement;
    fireEvent.click(selectAllCheckbox);

    expect(selectAllCheckbox.checked).toBe(true);
  });

  it("should show batch actions when cookies are selected", () => {
    render(<CookieList cookies={mockCookies} currentDomain="example.com" />);

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText("删除选中")).toBeTruthy();
    expect(screen.getByText("加入白名单")).toBeTruthy();
    expect(screen.getByText("加入黑名单")).toBeTruthy();
  });

  it("should call onMessage when add to whitelist is clicked", () => {
    render(
      <CookieList cookies={mockCookies} currentDomain="example.com" onMessage={mockOnMessage} />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    const addToWhitelistBtn = screen.getByText("加入白名单");
    fireEvent.click(addToWhitelistBtn);

    expect(mockOnMessage).toHaveBeenCalled();
  });

  it("should call onMessage when add to blacklist is clicked", () => {
    render(
      <CookieList cookies={mockCookies} currentDomain="example.com" onMessage={mockOnMessage} />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    const addToBlacklistBtn = screen.getByText("加入黑名单");
    fireEvent.click(addToBlacklistBtn);

    expect(mockOnMessage).toHaveBeenCalled();
  });

  it("should expand domain group when clicked", () => {
    render(<CookieList cookies={mockCookies} currentDomain="example.com" />);

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find((btn) => btn.textContent?.includes("example.com"));
    if (domainButton) {
      fireEvent.click(domainButton);
    }
  });

  it("should render with onUpdate callback", () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    expect(screen.getByText(/Cookie 详情/)).toBeTruthy();
  });
});
