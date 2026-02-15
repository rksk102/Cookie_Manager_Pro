import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useState, ReactNode } from "react";
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

const mockClearSingleCookie = vi.fn(() => Promise.resolve(true));
const mockEditCookie = vi.fn(() => Promise.resolve(true));

vi.mock("../../utils", () => ({
  assessCookieRisk: vi.fn(() => ({ level: "low", reason: "安全" })),
  getRiskLevelColor: vi.fn(() => "#22c55e"),
  getRiskLevelText: vi.fn(() => "低风险"),
  clearSingleCookie: () => mockClearSingleCookie(),
  editCookie: () => mockEditCookie(),
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
  isSensitiveCookie: vi.fn(() => false),
}));

vi.mock("../../components/CookieEditor", () => ({
  CookieEditor: ({
    isOpen,
    cookie,
    onClose,
    onSave,
  }: {
    isOpen: boolean;
    cookie: { name: string; value: string; domain: string } | null;
    onClose: () => void;
    onSave: (cookie: { name: string; value: string; domain: string }) => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="cookie-editor">
        <span data-testid="editing-cookie-name">{cookie?.name}</span>
        <button onClick={onClose} data-testid="close-editor">
          关闭
        </button>
        <button
          onClick={() => onSave({ name: "updated", value: "new", domain: "example.com" })}
          data-testid="save-editor"
        >
          保存
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/ConfirmDialogWrapper", () => ({
  ConfirmDialogWrapper: ({
    children,
  }: {
    children: (
      showConfirm: (
        title: string,
        message: string,
        variant: string,
        onConfirm: () => void
      ) => ReactNode
    ) => ReactNode;
  }) => {
    const MockWrapper = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

      const showConfirm = (
        _title: string,
        _message: string,
        _variant: string,
        onConfirm: () => void
      ): ReactNode => {
        setConfirmCallback(() => onConfirm);
        setIsOpen(true);
        return null;
      };

      return (
        <>
          {children(showConfirm)}
          {isOpen && (
            <div className="confirm-dialog">
              <button
                onClick={() => {
                  confirmCallback?.();
                  setIsOpen(false);
                }}
              >
                确定
              </button>
              <button onClick={() => setIsOpen(false)}>取消</button>
            </div>
          )}
        </>
      );
    };
    return <MockWrapper />;
  },
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
    const domainButton = domainButtons.find(
      (btn) => btn.textContent === "example.com" || btn.textContent?.startsWith("example.com ")
    );
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

  it("should toggle select all off when clicked twice", () => {
    render(<CookieList cookies={mockCookies} currentDomain="example.com" />);

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ }) as HTMLInputElement;
    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox.checked).toBe(true);

    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox.checked).toBe(false);
  });

  it("should show delete selected button when items selected", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    const deleteBtn = screen.getByText("删除选中");
    expect(deleteBtn).toBeTruthy();
  });

  it("should collapse when header clicked twice", () => {
    render(<CookieList cookies={mockCookies} currentDomain="example.com" />);

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);
    expect(screen.getByText("全选")).toBeTruthy();

    fireEvent.click(headerButton);
    expect(screen.queryByText("全选")).toBeNull();
  });

  it("should render without currentDomain", () => {
    render(<CookieList cookies={mockCookies} currentDomain="" />);

    expect(screen.getByText(/Cookie 详情/)).toBeTruthy();
  });

  it("should handle cookies with expirationDate", () => {
    const cookiesWithExpiry = [
      {
        name: "persistent",
        value: "value",
        domain: ".example.com",
        path: "/",
        secure: true,
        httpOnly: false,
        sameSite: "lax" as const,
        expirationDate: Date.now() / 1000 + 3600,
      },
    ];

    render(<CookieList cookies={cookiesWithExpiry} currentDomain="example.com" />);

    expect(screen.getByText(/Cookie 详情/)).toBeTruthy();
  });

  it("should handle cookies without expirationDate", () => {
    const sessionCookies = [
      {
        name: "session",
        value: "value",
        domain: ".example.com",
        path: "/",
        secure: false,
        httpOnly: false,
        sameSite: "lax" as const,
      },
    ];

    render(<CookieList cookies={sessionCookies} currentDomain="example.com" />);

    expect(screen.getByText(/Cookie 详情/)).toBeTruthy();
  });

  it("should call onUpdate after delete", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    const deleteBtn = screen.getByText("删除选中");
    fireEvent.click(deleteBtn);

    const confirmButton = screen.getByText("确定");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it("should handle delete single cookie", async () => {
    mockClearSingleCookie.mockClear();

    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const deleteButtons = screen.getAllByRole("button", { name: "删除" });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
    }

    const confirmButton = screen.getByText("确定");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalled();
    });
  });

  it("should handle edit cookie button click", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const editButtons = screen.getAllByRole("button", { name: "编辑" });
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
    }

    await waitFor(() => {
      expect(screen.getByTestId("cookie-editor")).toBeTruthy();
    });
  });

  it("should handle save cookie in editor", async () => {
    mockEditCookie.mockClear();

    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const editButtons = screen.getAllByRole("button", { name: "编辑" });
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
    }

    await waitFor(() => {
      expect(screen.getByTestId("cookie-editor")).toBeTruthy();
    });

    const saveButton = screen.getByTestId("save-editor");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalledWith("Cookie 已更新");
    });
  });

  it("should handle close editor", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const editButtons = screen.getAllByRole("button", { name: "编辑" });
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
    }

    await waitFor(() => {
      expect(screen.getByTestId("cookie-editor")).toBeTruthy();
    });

    const closeButton = screen.getByTestId("close-editor");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId("cookie-editor")).toBeNull();
    });
  });

  it("should toggle value visibility", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const toggleButtons = screen.getAllByRole("button", { name: /显示|隐藏/ });
    if (toggleButtons.length > 0) {
      fireEvent.click(toggleButtons[0]);
    }
  });

  it("should toggle individual cookie selection", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const checkboxes = screen.getAllByRole("checkbox");
    const cookieCheckboxes = checkboxes.filter((cb) => !cb.hasAttribute("name"));

    if (cookieCheckboxes.length > 0) {
      fireEvent.click(cookieCheckboxes[0]);
    }
  });

  it("should handle delete cookie failure", async () => {
    mockClearSingleCookie.mockImplementationOnce(() => Promise.resolve(false));

    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const deleteButtons = screen.getAllByRole("button", { name: "删除" });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
    }

    const confirmButton = screen.getByText("确定");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalledWith("删除 Cookie 失败", true);
    });
  });

  it("should handle delete cookie exception", async () => {
    mockClearSingleCookie.mockImplementationOnce(() => Promise.reject(new Error("Failed")));

    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const deleteButtons = screen.getAllByRole("button", { name: "删除" });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
    }

    const confirmButton = screen.getByText("确定");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalledWith("删除 Cookie 失败", true);
    });
  });

  it("should handle edit cookie failure", async () => {
    mockEditCookie.mockImplementationOnce(() => Promise.resolve(false));

    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const editButtons = screen.getAllByRole("button", { name: "编辑" });
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
    }

    await waitFor(() => {
      expect(screen.getByTestId("cookie-editor")).toBeTruthy();
    });

    const saveButton = screen.getByTestId("save-editor");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalledWith("更新 Cookie 失败", true);
    });
  });

  it("should handle edit cookie exception", async () => {
    mockEditCookie.mockImplementationOnce(() => Promise.reject(new Error("Failed")));

    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const editButtons = screen.getAllByRole("button", { name: "编辑" });
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
    }

    await waitFor(() => {
      expect(screen.getByTestId("cookie-editor")).toBeTruthy();
    });

    const saveButton = screen.getByTestId("save-editor");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalledWith("更新 Cookie 失败", true);
    });
  });

  it("should handle delete selected with partial failure", async () => {
    mockClearSingleCookie.mockImplementationOnce(() => Promise.resolve(true));
    mockClearSingleCookie.mockImplementationOnce(() => Promise.reject(new Error("Failed")));
    mockClearSingleCookie.mockImplementationOnce(() => Promise.resolve(true));

    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    const deleteBtn = screen.getByText("删除选中");
    fireEvent.click(deleteBtn);

    const confirmButton = screen.getByText("确定");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalled();
    });
  });

  it("should handle delete selected with zero deleted", async () => {
    mockClearSingleCookie.mockImplementation(() => Promise.resolve(false));

    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    const deleteBtn = screen.getByText("删除选中");
    fireEvent.click(deleteBtn);

    const confirmButton = screen.getByText("确定");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  it("should render cookie details correctly", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    expect(screen.getAllByText("路径:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("安全:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("仅 HTTP:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SameSite:").length).toBeGreaterThan(0);
  });

  it("should render risk badge", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const riskBadge = document.querySelector(".risk-badge");
    expect(riskBadge).toBeTruthy();
  });

  it("should render cookie item as selected when selected", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const selectedItems = document.querySelectorAll(".cookie-item.selected");
    expect(selectedItems.length).toBeGreaterThan(0);
  });

  it("should render batch count when items selected", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const selectAllCheckbox = screen.getByRole("checkbox", { name: /全选/ });
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText(/个已选中/)).toBeTruthy();
  });

  it("should handle expand icon state", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const expandIcon = document.querySelector(".expand-icon.expanded");
    expect(expandIcon).toBeTruthy();
  });

  it("should handle domain expand icon state", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    const expandedDomainIcon = document.querySelectorAll(".expand-icon.expanded");
    expect(expandedDomainIcon.length).toBeGreaterThan(1);
  });

  it("should handle aria-expanded attribute", async () => {
    render(
      <CookieList
        cookies={mockCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    expect(headerButton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(headerButton);
    expect(headerButton.getAttribute("aria-expanded")).toBe("true");
  });

  it("should handle cookies with unspecified sameSite", async () => {
    const cookiesWithUnspecifiedSameSite = [
      {
        name: "cookie1",
        value: "value1",
        domain: ".example.com",
        path: "/",
        secure: true,
        httpOnly: false,
        sameSite: "unspecified" as const,
      },
    ];

    render(
      <CookieList
        cookies={cookiesWithUnspecifiedSameSite}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainButtons = screen.getAllByRole("button");
    const domainButton = domainButtons.find(
      (btn) =>
        btn.textContent === "example.com" || /^🌐\s*example\.com\s*\(/.test(btn.textContent || "")
    );
    if (domainButton) {
      fireEvent.click(domainButton);
    }

    expect(screen.getByText("unspecified")).toBeTruthy();
  });

  it("should handle cookies grouped by domain", async () => {
    const multiDomainCookies = [
      {
        name: "a",
        value: "1",
        domain: ".example.com",
        path: "/",
        secure: true,
        httpOnly: false,
        sameSite: "lax" as const,
      },
      {
        name: "b",
        value: "2",
        domain: "example.com",
        path: "/",
        secure: true,
        httpOnly: false,
        sameSite: "lax" as const,
      },
      {
        name: "c",
        value: "3",
        domain: "other.com",
        path: "/",
        secure: true,
        httpOnly: false,
        sameSite: "lax" as const,
      },
    ];

    render(
      <CookieList
        cookies={multiDomainCookies}
        currentDomain="example.com"
        onUpdate={mockOnUpdate}
        onMessage={mockOnMessage}
      />
    );

    const headerButton = screen.getByRole("button", { name: /Cookie 详情/ });
    fireEvent.click(headerButton);

    const domainGroups = document.querySelectorAll(".cookie-domain-group");
    expect(domainGroups.length).toBe(2);
  });
});
