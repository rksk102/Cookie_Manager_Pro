import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CookieEditor } from "../../components/CookieEditor";

const mockCookie = {
  name: "test",
  value: "value123",
  domain: ".example.com",
  path: "/",
  secure: true,
  httpOnly: false,
  sameSite: "lax" as const,
  expirationDate: 1234567890,
};

describe("CookieEditor", () => {
  it("should not render when isOpen is false", () => {
    render(<CookieEditor isOpen={false} cookie={null} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.queryByText("新建 Cookie")).toBeNull();
  });

  it("should render new cookie editor when cookie is null", () => {
    render(<CookieEditor isOpen={true} cookie={null} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByText("新建 Cookie")).toBeTruthy();
  });

  it("should render edit cookie editor with existing cookie", () => {
    render(<CookieEditor isOpen={true} cookie={mockCookie} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByText("编辑 Cookie")).toBeTruthy();
    expect(screen.getByDisplayValue("test")).toBeTruthy();
  });

  it("should call onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(<CookieEditor isOpen={true} cookie={null} onClose={onClose} onSave={vi.fn()} />);

    fireEvent.click(screen.getByText("取消"));
    expect(onClose).toHaveBeenCalled();
  });

  it("should stop propagation when dialog is clicked", () => {
    const onClose = vi.fn();
    render(<CookieEditor isOpen={true} cookie={null} onClose={onClose} onSave={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });
});
