import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClearLog } from "../../components/ClearLog";

describe("ClearLog", () => {
  const mockOnMessage = vi.fn();

  beforeEach(() => {
    mockOnMessage.mockClear();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
  });

  it("should render empty state when no logs", () => {
    render(<ClearLog onMessage={mockOnMessage} />);

    expect(screen.getByText("暂无清除日志记录")).toBeTruthy();
  });

  it("should render log header", () => {
    render(<ClearLog onMessage={mockOnMessage} />);

    expect(screen.getByText("清除日志")).toBeTruthy();
    expect(screen.getByText("清除过期")).toBeTruthy();
    expect(screen.getByText("导出日志")).toBeTruthy();
    expect(screen.getByText("清除全部")).toBeTruthy();
  });

  it("should call onMessage when export logs is clicked", () => {
    render(<ClearLog onMessage={mockOnMessage} />);

    const exportButton = screen.getByText("导出日志");
    fireEvent.click(exportButton);

    expect(mockOnMessage).toHaveBeenCalledWith("日志已导出");
  });

  it("should call onMessage when clear old logs is clicked", () => {
    render(<ClearLog onMessage={mockOnMessage} />);

    const clearOldButton = screen.getByText("清除过期");
    fireEvent.click(clearOldButton);

    expect(mockOnMessage).toHaveBeenCalled();
  });

  it("should show confirm dialog when clear all logs is clicked", () => {
    const mockConfirm = vi.fn(() => true);
    vi.stubGlobal("confirm", mockConfirm);

    render(<ClearLog onMessage={mockOnMessage} />);

    const clearAllButton = screen.getByText("清除全部");
    fireEvent.click(clearAllButton);

    expect(mockConfirm).toHaveBeenCalledWith("确定要清除所有日志记录吗？");
  });

  it("should clear logs when confirm is accepted", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );

    render(<ClearLog onMessage={mockOnMessage} />);

    const clearAllButton = screen.getByText("清除全部");
    fireEvent.click(clearAllButton);

    expect(mockOnMessage).toHaveBeenCalledWith("已清除所有日志");
  });

  it("should not clear logs when confirm is rejected", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false)
    );

    render(<ClearLog onMessage={mockOnMessage} />);

    const clearAllButton = screen.getByText("清除全部");
    fireEvent.click(clearAllButton);

    expect(mockOnMessage).not.toHaveBeenCalled();
  });
});
