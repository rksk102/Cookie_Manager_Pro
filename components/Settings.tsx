import { useStorage } from "@plasmohq/storage/hook"
import { SETTINGS_KEY, DEFAULT_SETTINGS } from "~store"
import type { Settings as SettingsType } from "~types"
import { CookieClearType, LogRetention, ThemeMode, ModeType } from "~types"
import { RadioGroup } from "~components/RadioGroup"
import { CheckboxGroup } from "~components/CheckboxGroup"

interface Props {
  onMessage: (msg: string) => void
}

export const Settings = ({ onMessage }: Props) => {
  const [settings, setSettings] = useStorage<SettingsType>(SETTINGS_KEY, DEFAULT_SETTINGS)

  const updateSetting = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    setSettings({ ...settings, [key]: value })
    onMessage("设置已保存")
  }

  return (
    <div className="settings-container">
      <div className="section">
        <h3>工作模式</h3>
        <RadioGroup
          name="mode"
          value={settings.mode}
          onChange={(value) => updateSetting("mode", value)}
          options={[
            { value: ModeType.WHITELIST, label: "白名单模式：仅白名单内网站不执行清理" },
            { value: ModeType.BLACKLIST, label: "黑名单模式：仅黑名单内网站执行清理" }
          ]}
        />
      </div>

      <div className="section">
        <h3>Cookie清除类型</h3>
        <RadioGroup
          name="clearType"
          value={settings.clearType}
          onChange={(value) => updateSetting("clearType", value)}
          options={[
            { value: CookieClearType.SESSION, label: "仅清除会话Cookie" },
            { value: CookieClearType.PERSISTENT, label: "仅清除持久Cookie" },
            { value: CookieClearType.ALL, label: "清除所有Cookie" }
          ]}
        />
      </div>

      <div className="section">
        <h3>日志保留时长</h3>
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
        <RadioGroup
          name="themeMode"
          value={settings.themeMode}
          onChange={(value) => updateSetting("themeMode", value)}
          options={[
            { value: ThemeMode.AUTO, label: "跟随浏览器" },
            { value: ThemeMode.LIGHT, label: "亮色" },
            { value: ThemeMode.DARK, label: "暗色" }
          ]}
        />
      </div>

      <div className="section">
        <h3>自动清理</h3>
        <CheckboxGroup
          options={[
            {
              checked: settings.enableAutoCleanup,
              label: "启用自动清理",
              onChange: (checked) => updateSetting("enableAutoCleanup", checked)
            },
            {
              checked: settings.cleanupOnTabDiscard,
              label: "启用已丢弃/未加载标签的清理",
              onChange: (checked) => updateSetting("cleanupOnTabDiscard", checked)
            },
            {
              checked: settings.cleanupOnStartup,
              label: "启动时清理打开标签页的 Cookie",
              onChange: (checked) => updateSetting("cleanupOnStartup", checked)
            },
            {
              checked: settings.cleanupExpiredCookies,
              label: "清理所有过期的 Cookie",
              onChange: (checked) => updateSetting("cleanupExpiredCookies", checked)
            }
          ]}
        />
      </div>

      <div className="section">
        <h3>高级清理</h3>
        <CheckboxGroup
          options={[
            {
              checked: settings.clearLocalStorage,
              label: "清理本地存储",
              onChange: (checked) => updateSetting("clearLocalStorage", checked)
            },
            {
              checked: settings.clearIndexedDB,
              label: "清理索引数据库",
              onChange: (checked) => updateSetting("clearIndexedDB", checked)
            },
            {
              checked: settings.clearCache,
              label: "清理缓存",
              onChange: (checked) => updateSetting("clearCache", checked)
            }
          ]}
        />
      </div>
    </div>
  )
}