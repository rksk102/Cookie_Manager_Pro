import { useStorage } from "@plasmohq/storage/hook";
import { SETTINGS_KEY, DEFAULT_SETTINGS, DEFAULT_CUSTOM_THEME } from "~store";
import type { Settings as SettingsType, CustomTheme } from "~types";
import { CookieClearType, LogRetention, ThemeMode, ModeType, ScheduleInterval } from "~types";
import { RadioGroup } from "~components/RadioGroup";
import { CheckboxGroup } from "~components/CheckboxGroup";
import { useState } from "react";

interface Props {
  onMessage: (msg: string) => void;
}

export const Settings = ({ onMessage }: Props) => {
  const [settings, setSettings] = useStorage<SettingsType>(SETTINGS_KEY, DEFAULT_SETTINGS);
  const [showCustomTheme, setShowCustomTheme] = useState(false);

  const updateSetting = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    setSettings({ ...settings, [key]: value });
    onMessage("设置已保存");
  };

  const updateCustomTheme = (key: keyof CustomTheme, value: string) => {
    const newCustomTheme = {
      ...(settings.customTheme || DEFAULT_CUSTOM_THEME),
      [key]: value,
    };
    updateSetting("customTheme", newCustomTheme);
  };

  return (
    <div className="settings-container">
      <div className="section">
        <h3>工作模式</h3>
        <p className="setting-description">
          控制 Cookie 清理的应用范围，根据您的需求选择合适的保护策略
        </p>
        <RadioGroup
          name="mode"
          value={settings.mode}
          onChange={(value) => updateSetting("mode", value)}
          options={[
            { value: ModeType.WHITELIST, label: "白名单模式：仅白名单内网站不执行清理" },
            { value: ModeType.BLACKLIST, label: "黑名单模式：仅黑名单内网站执行清理" },
          ]}
        />
      </div>

      <div className="section">
        <h3>Cookie清除类型</h3>
        <p className="setting-description">
          选择要清除的 Cookie 类型，会话 Cookie 在关闭浏览器后会自动失效
        </p>
        <RadioGroup
          name="clearType"
          value={settings.clearType}
          onChange={(value) => updateSetting("clearType", value)}
          options={[
            { value: CookieClearType.SESSION, label: "仅清除会话Cookie" },
            { value: CookieClearType.PERSISTENT, label: "仅清除持久Cookie" },
            { value: CookieClearType.ALL, label: "清除所有Cookie" },
          ]}
        />
      </div>

      <div className="section">
        <h3>定时清理</h3>
        <p className="setting-description">设置自动清理的时间间隔，确保您的隐私得到持续保护</p>
        <RadioGroup
          name="scheduleInterval"
          value={settings.scheduleInterval}
          onChange={(value) => updateSetting("scheduleInterval", value)}
          options={[
            { value: ScheduleInterval.DISABLED, label: "禁用" },
            { value: ScheduleInterval.HOURLY, label: "每小时" },
            { value: ScheduleInterval.DAILY, label: "每天" },
            { value: ScheduleInterval.WEEKLY, label: "每周" },
          ]}
        />
      </div>

      <div className="section">
        <h3>日志保留时长</h3>
        <p className="setting-description">控制操作日志的保存时间，过长时间的日志会占用存储空间</p>
        <select
          className="select-input"
          value={settings.logRetention}
          onChange={(e) => updateSetting("logRetention", e.target.value as LogRetention)}
        >
          <option value={LogRetention.ONE_HOUR}>1小时</option>
          <option value={LogRetention.SIX_HOURS}>6小时</option>
          <option value={LogRetention.TWELVE_HOURS}>12小时</option>
          <option value={LogRetention.ONE_DAY}>1天</option>
          <option value={LogRetention.THREE_DAYS}>3天</option>
          <option value={LogRetention.SEVEN_DAYS}>7天</option>
          <option value={LogRetention.TEN_DAYS}>10天</option>
          <option value={LogRetention.THIRTY_DAYS}>30天</option>
          <option value={LogRetention.FOREVER}>永久</option>
        </select>
      </div>

      <div className="section">
        <h3>主题模式</h3>
        <p className="setting-description">
          选择您喜欢的界面主题，自定义主题可以让您完全掌控视觉效果
        </p>
        <RadioGroup
          name="themeMode"
          value={settings.themeMode}
          onChange={(value) => {
            updateSetting("themeMode", value);
            setShowCustomTheme(value === ThemeMode.CUSTOM);
          }}
          options={[
            { value: ThemeMode.AUTO, label: "跟随浏览器" },
            { value: ThemeMode.LIGHT, label: "亮色" },
            { value: ThemeMode.DARK, label: "暗色" },
            { value: ThemeMode.CUSTOM, label: "自定义" },
          ]}
        />

        {showCustomTheme && (
          <div className="custom-theme-settings">
            <div className="color-input-group">
              <label className="color-label">主色调</label>
              <input
                type="color"
                value={settings.customTheme?.primary || DEFAULT_CUSTOM_THEME.primary}
                onChange={(e) => updateCustomTheme("primary", e.target.value)}
              />
            </div>
            <div className="color-input-group">
              <label className="color-label">成功色</label>
              <input
                type="color"
                value={settings.customTheme?.success || DEFAULT_CUSTOM_THEME.success}
                onChange={(e) => updateCustomTheme("success", e.target.value)}
              />
            </div>
            <div className="color-input-group">
              <label className="color-label">警告色</label>
              <input
                type="color"
                value={settings.customTheme?.warning || DEFAULT_CUSTOM_THEME.warning}
                onChange={(e) => updateCustomTheme("warning", e.target.value)}
              />
            </div>
            <div className="color-input-group">
              <label className="color-label">危险色</label>
              <input
                type="color"
                value={settings.customTheme?.danger || DEFAULT_CUSTOM_THEME.danger}
                onChange={(e) => updateCustomTheme("danger", e.target.value)}
              />
            </div>
            <div className="color-input-group">
              <label className="color-label">主背景</label>
              <input
                type="color"
                value={settings.customTheme?.bgPrimary || DEFAULT_CUSTOM_THEME.bgPrimary}
                onChange={(e) => updateCustomTheme("bgPrimary", e.target.value)}
              />
            </div>
            <div className="color-input-group">
              <label className="color-label">次背景</label>
              <input
                type="color"
                value={settings.customTheme?.bgSecondary || DEFAULT_CUSTOM_THEME.bgSecondary}
                onChange={(e) => updateCustomTheme("bgSecondary", e.target.value)}
              />
            </div>
            <div className="color-input-group">
              <label className="color-label">主文字</label>
              <input
                type="color"
                value={settings.customTheme?.textPrimary || DEFAULT_CUSTOM_THEME.textPrimary}
                onChange={(e) => updateCustomTheme("textPrimary", e.target.value)}
              />
            </div>
            <div className="color-input-group">
              <label className="color-label">次文字</label>
              <input
                type="color"
                value={settings.customTheme?.textSecondary || DEFAULT_CUSTOM_THEME.textSecondary}
                onChange={(e) => updateCustomTheme("textSecondary", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <h3>自动清理</h3>
        <p className="setting-description">配置不同场景下的自动清理行为，减少手动操作的繁琐</p>
        <CheckboxGroup
          options={[
            {
              checked: settings.enableAutoCleanup,
              label: "启用自动清理",
              onChange: (checked) => updateSetting("enableAutoCleanup", checked),
            },
            {
              checked: settings.cleanupOnTabDiscard,
              label: "启用已丢弃/未加载标签的清理",
              onChange: (checked) => updateSetting("cleanupOnTabDiscard", checked),
            },
            {
              checked: settings.cleanupOnStartup,
              label: "启动时清理打开标签页的 Cookie",
              onChange: (checked) => updateSetting("cleanupOnStartup", checked),
            },
            {
              checked: settings.cleanupExpiredCookies,
              label: "清理所有过期的 Cookie",
              onChange: (checked) => updateSetting("cleanupExpiredCookies", checked),
            },
          ]}
        />
      </div>

      <div className="section">
        <h3>隐私保护</h3>
        <p className="setting-description">增强您的在线隐私保护，识别并警示潜在的追踪行为</p>
        <CheckboxGroup
          options={[
            {
              checked: settings.showCookieRisk,
              label: "显示 Cookie 风险评估",
              onChange: (checked) => updateSetting("showCookieRisk", checked),
            },
          ]}
        />
      </div>

      <div className="section">
        <h3>高级清理</h3>
        <p className="setting-description">
          除了 Cookie 外，还可以清理其他可能存储您数据的浏览器存储
        </p>
        <CheckboxGroup
          options={[
            {
              checked: settings.clearLocalStorage,
              label: "清理本地存储",
              onChange: (checked) => updateSetting("clearLocalStorage", checked),
            },
            {
              checked: settings.clearIndexedDB,
              label: "清理索引数据库",
              onChange: (checked) => updateSetting("clearIndexedDB", checked),
            },
            {
              checked: settings.clearCache,
              label: "清理缓存",
              onChange: (checked) => updateSetting("clearCache", checked),
            },
          ]}
        />
      </div>
    </div>
  );
};
