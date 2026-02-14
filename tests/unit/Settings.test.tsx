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

  it("should call onMessage when clear type is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const sessionRadio = screen.getByLabelText("仅清除会话Cookie");
    fireEvent.click(sessionRadio);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when schedule interval is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const hourlyRadio = screen.getByLabelText("每小时");
    fireEvent.click(hourlyRadio);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when theme mode is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const darkRadio = screen.getByLabelText("暗色");
    fireEvent.click(darkRadio);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when light theme is selected", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const lightRadio = screen.getByLabelText("亮色");
    fireEvent.click(lightRadio);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should render all log retention options", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");
    expect(options.length).toBeGreaterThan(0);
  });

  it("should handle multiple checkbox toggles", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const checkboxes = screen.getAllByRole("checkbox");

    fireEvent.click(checkboxes[0]);
    expect(mockOnMessage).toHaveBeenCalledTimes(1);

    fireEvent.click(checkboxes[1]);
    expect(mockOnMessage).toHaveBeenCalledTimes(2);
  });

  it("should show custom theme color inputs", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    expect(colorInputs.length).toBeGreaterThan(0);
  });

  it("should handle log retention change to forever", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.FOREVER } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle daily schedule interval", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const dailyRadio = screen.getByLabelText("每天");
    fireEvent.click(dailyRadio);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle weekly schedule interval", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const weeklyRadio = screen.getByLabelText("每周");
    fireEvent.click(weeklyRadio);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should show all custom theme color inputs when custom theme is selected", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    expect(screen.getByText("主色调")).toBeTruthy();
    expect(screen.getByText("成功色")).toBeTruthy();
    expect(screen.getByText("警告色")).toBeTruthy();
    expect(screen.getByText("危险色")).toBeTruthy();
    expect(screen.getByText("主背景")).toBeTruthy();
    expect(screen.getByText("次背景")).toBeTruthy();
    expect(screen.getByText("主文字")).toBeTruthy();
    expect(screen.getByText("次文字")).toBeTruthy();
  });

  it("should call onMessage when custom theme color is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    const primaryColorInput = colorInputs[0] as HTMLInputElement;
    fireEvent.change(primaryColorInput, { target: { value: "#ff0000" } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when success color is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    const successColorInput = colorInputs[1] as HTMLInputElement;
    fireEvent.change(successColorInput, { target: { value: "#00ff00" } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when warning color is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    const warningColorInput = colorInputs[2] as HTMLInputElement;
    fireEvent.change(warningColorInput, { target: { value: "#ffff00" } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when danger color is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    const dangerColorInput = colorInputs[3] as HTMLInputElement;
    fireEvent.change(dangerColorInput, { target: { value: "#ff0000" } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when bgPrimary color is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    const bgPrimaryInput = colorInputs[4] as HTMLInputElement;
    fireEvent.change(bgPrimaryInput, { target: { value: "#ffffff" } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when bgSecondary color is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    const bgSecondaryInput = colorInputs[5] as HTMLInputElement;
    fireEvent.change(bgSecondaryInput, { target: { value: "#f0f0f0" } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when textPrimary color is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    const textPrimaryInput = colorInputs[6] as HTMLInputElement;
    fireEvent.change(textPrimaryInput, { target: { value: "#000000" } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should call onMessage when textSecondary color is changed", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    const textSecondaryInput = colorInputs[7] as HTMLInputElement;
    fireEvent.change(textSecondaryInput, { target: { value: "#666666" } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should render setting descriptions", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(
      screen.getByText("控制 Cookie 清理的应用范围，根据您的需求选择合适的保护策略")
    ).toBeTruthy();
    expect(
      screen.getByText("选择要清除的 Cookie 类型，会话 Cookie 在关闭浏览器后会自动失效")
    ).toBeTruthy();
    expect(screen.getByText("设置自动清理的时间间隔，确保您的隐私得到持续保护")).toBeTruthy();
  });

  it("should render auto cleanup description", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("配置不同场景下的自动清理行为，减少手动操作的繁琐")).toBeTruthy();
  });

  it("should render privacy protection description", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("增强您的在线隐私保护，识别并警示潜在的追踪行为")).toBeTruthy();
  });

  it("should render advanced cleanup description", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(
      screen.getByText("除了 Cookie 外，还可以清理其他可能存储您数据的浏览器存储")
    ).toBeTruthy();
  });

  it("should handle log retention change to one hour", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.ONE_HOUR } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle log retention change to seven days", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.SEVEN_DAYS } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle all checkboxes in auto cleanup section", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const checkboxes = screen.getAllByRole("checkbox");

    fireEvent.click(checkboxes[0]);
    expect(mockOnMessage).toHaveBeenCalledTimes(1);

    fireEvent.click(checkboxes[1]);
    expect(mockOnMessage).toHaveBeenCalledTimes(2);

    fireEvent.click(checkboxes[2]);
    expect(mockOnMessage).toHaveBeenCalledTimes(3);

    fireEvent.click(checkboxes[3]);
    expect(mockOnMessage).toHaveBeenCalledTimes(4);
  });

  it("should handle all checkboxes in privacy protection section", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const checkboxes = screen.getAllByRole("checkbox");

    fireEvent.click(checkboxes[4]);
    expect(mockOnMessage).toHaveBeenCalledTimes(1);

    fireEvent.click(checkboxes[5]);
    expect(mockOnMessage).toHaveBeenCalledTimes(2);

    fireEvent.click(checkboxes[6]);
    expect(mockOnMessage).toHaveBeenCalledTimes(3);
  });

  it("should handle all checkboxes in advanced cleanup section", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const checkboxes = screen.getAllByRole("checkbox");

    fireEvent.click(checkboxes[7]);
    expect(mockOnMessage).toHaveBeenCalledTimes(1);

    fireEvent.click(checkboxes[8]);
    expect(mockOnMessage).toHaveBeenCalledTimes(2);

    fireEvent.click(checkboxes[9]);
    expect(mockOnMessage).toHaveBeenCalledTimes(3);
  });

  it("should hide custom theme settings when switching away from custom theme", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);
    expect(screen.getByText("主色调")).toBeTruthy();

    const darkRadio = screen.getByLabelText("暗色");
    fireEvent.click(darkRadio);

    expect(screen.queryByText("主色调")).toBeNull();
  });

  it("should hide custom theme settings when selecting light theme after custom", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);
    expect(screen.getByText("主色调")).toBeTruthy();

    const lightRadio = screen.getByLabelText("亮色");
    fireEvent.click(lightRadio);

    expect(screen.queryByText("主色调")).toBeNull();
  });

  it("should hide custom theme settings when selecting auto theme after custom", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const customRadio = screen.getByLabelText("自定义");
    fireEvent.click(customRadio);
    expect(screen.getByText("主色调")).toBeTruthy();

    const autoRadio = screen.getByLabelText("跟随浏览器");
    fireEvent.click(autoRadio);

    expect(screen.queryByText("主色调")).toBeNull();
  });

  it("should not show custom theme settings initially", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.queryByText("主色调")).toBeNull();
    expect(screen.queryByText("成功色")).toBeNull();
  });

  it("should render log retention description", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(screen.getByText("控制操作日志的保存时间，过长时间的日志会占用存储空间")).toBeTruthy();
  });

  it("should render theme mode description", () => {
    render(<Settings onMessage={mockOnMessage} />);

    expect(
      screen.getByText("选择您喜欢的界面主题，自定义主题可以让您完全掌控视觉效果")
    ).toBeTruthy();
  });

  it("should handle log retention change to six hours", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.SIX_HOURS } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle log retention change to twelve hours", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.TWELVE_HOURS } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle log retention change to three days", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.THREE_DAYS } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle log retention change to ten days", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.TEN_DAYS } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle log retention change to thirty days", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: LogRetention.THIRTY_DAYS } });

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should handle clear type change to persistent", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const persistentRadio = screen.getByLabelText("仅清除持久Cookie");
    fireEvent.click(persistentRadio);

    expect(mockOnMessage).toHaveBeenCalledWith("设置已保存");
  });

  it("should render settings container with correct class", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const container = document.querySelector(".settings-container");
    expect(container).toBeTruthy();
  });

  it("should render all sections", () => {
    render(<Settings onMessage={mockOnMessage} />);

    const sections = document.querySelectorAll(".section");
    expect(sections.length).toBe(8);
  });
});
