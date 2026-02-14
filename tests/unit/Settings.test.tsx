import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Settings } from "../../components/Settings";
import { LogRetention } from "../../types";

vi.mock("~components/RadioGroup", () => ({
  RadioGroup: ({
    name,
    value,
    onChange,
    options,
  }: {
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div data-testid={`radio-${name}`}>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  ),
}));

vi.mock("~components/CheckboxGroup", () => ({
  CheckboxGroup: ({
    options,
  }: {
    options: { checked: boolean; label: string; onChange: (checked: boolean) => void }[];
  }) => (
    <div data-testid="checkbox-group">
      {options.map((option, index) => (
        <label key={index}>
          <input
            type="checkbox"
            checked={option.checked}
            onChange={(e) => option.onChange(e.target.checked)}
          />
          {option.label}
        </label>
      ))}
    </div>
  ),
}));

describe("Settings", () => {
  const mockOnMessage = vi.fn();

  beforeEach(() => {
    mockOnMessage.mockClear();
  });

  it("should render settings container", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("工作模式")).toBeTruthy();
    expect(screen.getByText("Cookie清除类型")).toBeTruthy();
    expect(screen.getByText("定时清理")).toBeTruthy();
    expect(screen.getByText("日志保留时长")).toBeTruthy();
    expect(screen.getByText("主题模式")).toBeTruthy();
  });

  it("should render mode settings", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("白名单模式：仅白名单内网站不执行清理")).toBeTruthy();
    expect(screen.getByText("黑名单模式：仅黑名单内网站执行清理")).toBeTruthy();
  });

  it("should render clear type settings", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("仅清除会话Cookie")).toBeTruthy();
    expect(screen.getByText("仅清除持久Cookie")).toBeTruthy();
    expect(screen.getByText("清除所有Cookie")).toBeTruthy();
  });

  it("should render schedule interval settings", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("禁用")).toBeTruthy();
    expect(screen.getByText("每小时")).toBeTruthy();
    expect(screen.getByText("每天")).toBeTruthy();
    expect(screen.getByText("每周")).toBeTruthy();
  });

  it("should render log retention select", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    expect(select).toBeTruthy();
  });

  it("should call onMessage when log retention changes", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.ONE_DAY } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should render theme mode settings", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("跟随浏览器")).toBeTruthy();
    expect(screen.getByText("亮色")).toBeTruthy();
    expect(screen.getByText("暗色")).toBeTruthy();
    expect(screen.getByText("自定义")).toBeTruthy();
  });

  it("should render auto cleanup settings", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("启用自动清理")).toBeTruthy();
    expect(screen.getByText("启用已丢弃/未加载标签的清理")).toBeTruthy();
    expect(screen.getByText("启动时清理打开标签页的 Cookie")).toBeTruthy();
    expect(screen.getByText("清理所有过期的 Cookie")).toBeTruthy();
  });

  it("should render privacy protection settings", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("启用隐私保护")).toBeTruthy();
    expect(screen.getByText("显示 Cookie 风险评估")).toBeTruthy();
    expect(screen.getByText("警告第三方 Cookie")).toBeTruthy();
  });

  it("should render advanced cleanup settings", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("清理本地存储")).toBeTruthy();
    expect(screen.getByText("清理索引数据库")).toBeTruthy();
    expect(screen.getByText("清理缓存")).toBeTruthy();
  });

  it("should call onMessage when checkbox is toggled", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const firstCheckbox = checkboxes[0];
    fireEvent.click(firstCheckbox);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should show custom theme settings when custom theme is selected", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    expect(screen.getByText("主色调")).toBeTruthy();
    expect(screen.getByText("成功色")).toBeTruthy();
    expect(screen.getByText("警告色")).toBeTruthy();
    expect(screen.getByText("危险色")).toBeTruthy();
  });

  it("should call onMessage when radio option is selected", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const blacklistRadio = screen.getByLabelText("黑名单模式：仅黑名单内网站执行清理");
    fireEvent.click(blacklistRadio);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });
});
