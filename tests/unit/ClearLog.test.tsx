import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useState, ReactNode } from "react";
import { ClearLog } from "../../components/ClearLog";

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
              <p>确定要清除所有日志记录吗？</p>
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

describe("ClearLog", () => {
  const mockOnMessage = vi.fn();

  beforeEach(() => {
    mockOnMessage.mockClear();
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
    render(<ClearLog onMessage={mockOnMessage} />);

    const clearAllButton = screen.getByText("清除全部");
    fireEvent.click(clearAllButton);

    expect(screen.getByText("确定要清除所有日志记录吗？")).toBeInTheDocument();
  });

  it("should clear logs when confirm is accepted", () => {
    render(<ClearLog onMessage={mockOnMessage} />);

    const clearAllButton = screen.getByText("清除全部");
    fireEvent.click(clearAllButton);

    const confirmButton = screen.getByText("确定");
    fireEvent.click(confirmButton);

    expect(mockOnMessage).toHaveBeenCalledWith("已清除所有日志");
  });

  it("should not clear logs when confirm is cancelled", () => {
    render(<ClearLog onMessage={mockOnMessage} />);

    const clearAllButton = screen.getByText("清除全部");
    fireEvent.click(clearAllButton);

    const cancelButton = screen.getByText("取消");
    fireEvent.click(cancelButton);

    expect(mockOnMessage).not.toHaveBeenCalled();
  });
});
