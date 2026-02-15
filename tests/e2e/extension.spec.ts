import { test, expect, Page, BrowserContext } from "@playwright/test";

async function getExtensionId(context: BrowserContext): Promise<string> {
  const background =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker", { timeout: 30000 }));
  const url = background.url();
  const id = url.split("/")[2];
  return id;
}

async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  return popup;
}

test.describe("Cookie Manager Pro Extension", () => {
  test("should have extension loaded", async ({ browser }) => {
    const contexts = browser.contexts();
    expect(contexts.length).toBeGreaterThanOrEqual(1);
  });

  test("should be able to navigate to test page", async ({ page }) => {
    await page.goto("https://example.com");
    await expect(page).toHaveTitle(/Example Domain/);
  });
});

test.describe("Extension Popup Loading Tests", () => {
  test("should open popup successfully", async ({ context }) => {
    const extensionId = await getExtensionId(context);
    expect(extensionId).toBeTruthy();

    const popup = await openPopup(context, extensionId);
    await expect(popup.locator("h1")).toContainText("Cookie Manager Pro");
    await popup.close();
  });

  test("should display correct popup title", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);
    const title = popup.locator("h1");
    await expect(title).toBeVisible();
    await expect(title).toContainText("Cookie Manager Pro");
    await popup.close();
  });

  test("should display all tabs", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.getByRole("tab", { name: /管理/ })).toBeVisible();
    await expect(popup.getByRole("tab", { name: /白名单|黑名单/ })).toBeVisible();
    await expect(popup.getByRole("tab", { name: /设置/ })).toBeVisible();
    await expect(popup.getByRole("tab", { name: /日志/ })).toBeVisible();

    await popup.close();
  });

  test("should switch to settings tab", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    await expect(popup.getByRole("tabpanel")).toContainText("工作模式");

    await popup.close();
  });

  test("should switch to log tab", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const logTab = popup.getByRole("tab", { name: /日志/ });
    await logTab.click();

    await expect(popup.getByRole("tabpanel")).toContainText("清除日志");

    await popup.close();
  });

  test("should switch to domain list tab", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    await expect(popup.getByRole("tabpanel")).toContainText(/白名单域名|黑名单域名/);

    await popup.close();
  });

  test("should have correct tab aria attributes", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const manageTab = popup.getByRole("tab", { name: /管理/ });
    await expect(manageTab).toHaveAttribute("aria-selected", "true");
    await expect(manageTab).toHaveAttribute("tabindex", "0");

    await popup.close();
  });

  test("should update aria-selected when tab changes", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const manageTab = popup.getByRole("tab", { name: /管理/ });
    const settingsTab = popup.getByRole("tab", { name: /设置/ });

    await expect(manageTab).toHaveAttribute("aria-selected", "true");

    await settingsTab.click();

    await expect(settingsTab).toHaveAttribute("aria-selected", "true");
    await expect(manageTab).toHaveAttribute("aria-selected", "false");

    await popup.close();
  });
});

test.describe("Cookie Operations Tests", () => {
  test("should display cookie statistics section", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.locator(".section").filter({ hasText: "Cookie统计" })).toBeVisible();

    await popup.close();
  });

  test("should display stat items", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.locator(".stat-item")).toHaveCount(6);

    const statLabels = popup.locator(".stat-label");
    await expect(statLabels.nth(0)).toContainText("总数");
    await expect(statLabels.nth(1)).toContainText("当前网站");
    await expect(statLabels.nth(2)).toContainText("会话");
    await expect(statLabels.nth(3)).toContainText("持久");
    await expect(statLabels.nth(4)).toContainText("第三方");
    await expect(statLabels.nth(5)).toContainText("追踪");

    await popup.close();
  });

  test("should display quick actions section", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.locator(".section").filter({ hasText: "快速操作" })).toBeVisible();

    await popup.close();
  });

  test("should display quick action buttons", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.getByRole("button", { name: /添加到白名单/ })).toBeVisible();
    await expect(popup.getByRole("button", { name: /添加到黑名单/ })).toBeVisible();
    await expect(popup.getByRole("button", { name: /清除当前网站/ })).toBeVisible();
    await expect(popup.getByRole("button", { name: /清除所有Cookie/ })).toBeVisible();

    await popup.close();
  });

  test("should display cookie list section", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.locator(".cookie-list-container")).toBeVisible();

    await popup.close();
  });

  test("should show confirm dialog when clear current site clicked", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const clearCurrentBtn = popup.getByRole("button", { name: /清除当前网站/ });
    await clearCurrentBtn.click();

    await expect(popup.locator(".confirm-dialog")).toBeVisible();
    await expect(popup.getByText("清除确认")).toBeVisible();

    await popup.close();
  });

  test("should show confirm dialog when clear all clicked", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const clearAllBtn = popup.getByRole("button", { name: /清除所有Cookie/ });
    await clearAllBtn.click();

    await expect(popup.locator(".confirm-dialog")).toBeVisible();
    await expect(popup.getByText("清除确认")).toBeVisible();

    await popup.close();
  });

  test("should close confirm dialog when cancel clicked", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const clearCurrentBtn = popup.getByRole("button", { name: /清除当前网站/ });
    await clearCurrentBtn.click();

    await expect(popup.locator(".confirm-dialog")).toBeVisible();

    const cancelBtn = popup.getByRole("button", { name: "取消" });
    await cancelBtn.click();

    await expect(popup.locator(".confirm-dialog")).not.toBeVisible();

    await popup.close();
  });

  test("should display current domain section", async ({ context, page }) => {
    await page.goto("https://example.com");

    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.locator(".section").filter({ hasText: "当前网站" })).toBeVisible();

    await popup.close();
  });

  test("should show domain info or error message", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainInfo = popup.locator(".domain-info");
    await expect(domainInfo).toBeVisible();

    await popup.close();
  });
});

test.describe("Settings Tests", () => {
  test("should display settings panel", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    await expect(popup.locator(".settings-container")).toBeVisible();

    await popup.close();
  });

  test("should display all settings sections", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    await expect(popup.getByText("工作模式")).toBeVisible();
    await expect(popup.getByText("Cookie清除类型")).toBeVisible();
    await expect(popup.getByText("定时清理")).toBeVisible();
    await expect(popup.getByText("日志保留时长")).toBeVisible();
    await expect(popup.getByText("主题模式")).toBeVisible();
    await expect(popup.getByText("自动清理")).toBeVisible();
    await expect(popup.getByText("隐私保护")).toBeVisible();
    await expect(popup.getByText("高级清理")).toBeVisible();

    await popup.close();
  });

  test("should display theme mode options", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    await expect(popup.getByLabel("跟随浏览器")).toBeVisible();
    await expect(popup.getByLabel("亮色")).toBeVisible();
    await expect(popup.getByLabel("暗色")).toBeVisible();
    await expect(popup.getByLabel("自定义")).toBeVisible();

    await popup.close();
  });

  test("should display log retention select", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    const selectInput = popup.locator(".select-input");
    await expect(selectInput).toBeVisible();

    await popup.close();
  });

  test("should display auto cleanup checkboxes", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    await expect(popup.getByLabel("启用自动清理")).toBeVisible();
    await expect(popup.getByLabel("启动时清理打开标签页的 Cookie")).toBeVisible();

    await popup.close();
  });

  test("should display privacy protection checkbox", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    await expect(popup.getByLabel("显示 Cookie 风险评估")).toBeVisible();

    await popup.close();
  });

  test("should display advanced cleanup checkboxes", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    await expect(popup.getByLabel("清理本地存储")).toBeVisible();
    await expect(popup.getByLabel("清理索引数据库")).toBeVisible();
    await expect(popup.getByLabel("清理缓存")).toBeVisible();

    await popup.close();
  });

  test("should apply theme class to container", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const container = popup.locator(".container");
    await expect(container).toHaveClass(/theme-/);

    await popup.close();
  });

  test("should show custom theme settings when custom theme selected", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    const customRadio = popup.getByLabel("自定义");
    await customRadio.click();

    await expect(popup.locator(".custom-theme-settings")).toBeVisible();

    await popup.close();
  });

  test("should display custom theme color inputs", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const settingsTab = popup.getByRole("tab", { name: /设置/ });
    await settingsTab.click();

    const customRadio = popup.getByLabel("自定义");
    await customRadio.click();

    await expect(popup.getByLabel("主色调")).toBeVisible();
    await expect(popup.getByLabel("成功色")).toBeVisible();
    await expect(popup.getByLabel("警告色")).toBeVisible();
    await expect(popup.getByLabel("危险色")).toBeVisible();

    await popup.close();
  });
});

test.describe("Domain Management Tests", () => {
  test("should display domain list tab", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    await expect(popup.getByRole("tabpanel")).toBeVisible();

    await popup.close();
  });

  test("should display domain management header", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    await expect(popup.getByText(/白名单域名|黑名单域名/)).toBeVisible();

    await popup.close();
  });

  test("should display domain input field", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    const input = popup.locator('input[placeholder="例如: google.com"]');
    await expect(input).toBeVisible();

    await popup.close();
  });

  test("should display add domain button", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    const addButton = popup.getByRole("button", { name: "添加" });
    await expect(addButton).toBeVisible();

    await popup.close();
  });

  test("should display add current site button", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    const addCurrentBtn = popup.getByRole("button", { name: "添加当前网站" });
    await expect(addCurrentBtn).toBeVisible();

    await popup.close();
  });

  test("should display help text for domain list", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    await expect(popup.locator(".help-text")).toBeVisible();

    await popup.close();
  });

  test("should display domain list container", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    await expect(popup.locator(".domain-list")).toBeVisible();

    await popup.close();
  });

  test("should show message when adding empty domain", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    const addButton = popup.getByRole("button", { name: "添加" });
    await addButton.click();

    await expect(popup.locator(".message")).toBeVisible();

    await popup.close();
  });

  test("should show message when adding invalid domain", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const domainTab = popup.getByRole("tab", { name: /白名单|黑名单/ });
    await domainTab.click();

    const input = popup.locator('input[placeholder="例如: google.com"]');
    await input.fill("invalid domain with spaces");

    const addButton = popup.getByRole("button", { name: "添加" });
    await addButton.click();

    await expect(popup.locator(".message")).toBeVisible();

    await popup.close();
  });
});

test.describe("Clear Log Tests", () => {
  test("should display log tab", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const logTab = popup.getByRole("tab", { name: /日志/ });
    await logTab.click();

    await expect(popup.getByRole("tabpanel")).toBeVisible();

    await popup.close();
  });

  test("should display clear log header", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const logTab = popup.getByRole("tab", { name: /日志/ });
    await logTab.click();

    await expect(popup.getByText("清除日志")).toBeVisible();

    await popup.close();
  });

  test("should display log container", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const logTab = popup.getByRole("tab", { name: /日志/ });
    await logTab.click();

    await expect(popup.locator(".log-container")).toBeVisible();

    await popup.close();
  });

  test("should display clear all logs button", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const logTab = popup.getByRole("tab", { name: /日志/ });
    await logTab.click();

    const clearBtn = popup.getByRole("button", { name: /清除全部/ });
    await expect(clearBtn).toBeVisible();

    await popup.close();
  });
});

test.describe("Cookie List Interaction Tests", () => {
  test("should display cookie list header", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.locator(".cookie-list-header")).toBeVisible();

    await popup.close();
  });

  test("should expand cookie list when clicked", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const header = popup.locator(".cookie-list-header");
    await header.click();

    await expect(popup.locator(".cookie-list")).toBeVisible();

    await popup.close();
  });

  test("should display expand icon", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const expandIcon = popup.locator(".cookie-list-header .expand-icon");
    await expect(expandIcon).toBeVisible();

    await popup.close();
  });

  test("should toggle expand icon state", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const header = popup.locator(".cookie-list-header");
    const expandIcon = popup.locator(".cookie-list-header .expand-icon");

    await header.click();
    await expect(expandIcon).toHaveClass(/expanded/);

    await header.click();
    await expect(expandIcon).not.toHaveClass(/expanded/);

    await popup.close();
  });
});

test.describe("Extension Background Tests", () => {
  test("should have service worker running", async ({ context }) => {
    const extensionId = await getExtensionId(context);
    expect(extensionId).toBeTruthy();
  });

  test("should have extension loaded in browser", async ({ context }) => {
    const extensionId = await getExtensionId(context);
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(0);
  });
});

test.describe("UI Component Tests", () => {
  test("should have proper button styling classes", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.locator(".btn-success")).toBeVisible();
    await expect(popup.locator(".btn-secondary")).toBeVisible();
    await expect(popup.locator(".btn-warning")).toBeVisible();
    await expect(popup.locator(".btn-danger")).toBeVisible();

    await popup.close();
  });

  test("should display section icons", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const sectionIcons = popup.locator(".section-icon");
    const count = await sectionIcons.count();
    expect(count).toBeGreaterThan(0);

    await popup.close();
  });

  test("should display tab icons", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const tabIcons = popup.locator(".tab-icon");
    const count = await tabIcons.count();
    expect(count).toBe(4);

    await popup.close();
  });

  test("should display button icons", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const btnIcons = popup.locator(".btn-icon");
    const count = await btnIcons.count();
    expect(count).toBeGreaterThan(0);

    await popup.close();
  });

  test("should have proper container structure", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    await expect(popup.locator(".container")).toBeVisible();
    await expect(popup.locator("header")).toBeVisible();
    await expect(popup.locator(".tabs")).toBeVisible();

    await popup.close();
  });

  test("should display message component", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const addWhitelistBtn = popup.getByRole("button", { name: /添加到白名单/ });
    await addWhitelistBtn.click();

    await expect(popup.locator(".message")).toBeVisible();

    await popup.close();
  });

  test("should have correct tabpanel structure", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const managePanel = popup.locator("#manage-panel");
    await expect(managePanel).toBeVisible();
    await expect(managePanel).toHaveAttribute("role", "tabpanel");

    await popup.close();
  });
});

test.describe("Accessibility Tests", () => {
  test("should have proper tab role attributes", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const tabs = popup.locator('[role="tab"]');
    const count = await tabs.count();
    expect(count).toBe(4);

    await popup.close();
  });

  test("should have proper tablist role", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const tablist = popup.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    await popup.close();
  });

  test("should have proper tabpanel role", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const tabpanel = popup.locator('[role="tabpanel"]');
    await expect(tabpanel).toBeVisible();

    await popup.close();
  });

  test("should have aria-selected on tabs", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const selectedTab = popup.locator('[role="tab"][aria-selected="true"]');
    await expect(selectedTab).toBeVisible();

    await popup.close();
  });

  test("should have aria-controls on tabs", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const manageTab = popup.getByRole("tab", { name: /管理/ });
    const ariaControls = await manageTab.getAttribute("aria-controls");
    expect(ariaControls).toBe("manage-panel");

    await popup.close();
  });

  test("should have aria-expanded on expandable elements", async ({ context }) => {
    const extensionId = await getExtensionId(context);

    const popup = await openPopup(context, extensionId);

    const cookieListHeader = popup.locator(".cookie-list-header");
    await expect(cookieListHeader).toHaveAttribute("aria-expanded");

    await popup.close();
  });
});
