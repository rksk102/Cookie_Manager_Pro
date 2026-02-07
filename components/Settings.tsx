import { useStorage } from "@plasmohq/storage/hook"
import { SETTINGS_KEY } from "~store"
import type { Settings } from "~types"
import { CookieClearType, LogRetention, ThemeMode, ModeType } from "~types"

interface Props {
  onMessage: (msg: string) => void
}

export const Settings = ({ onMessage }: Props) => {
  const [settings, setSettings] = useStorage<Settings>(SETTINGS_KEY, {
    clearType: CookieClearType.ALL,
    logRetention: LogRetention.SEVEN_DAYS,
    themeMode: ThemeMode.AUTO,
    mode: ModeType.WHITELIST,
    clearLocalStorage: false,
    clearIndexedDB: false,
    clearCache: false,
    enableAutoCleanup: false,
    cleanupOnTabDiscard: false,
    cleanupOnStartup: false,
    cleanupExpiredCookies: false
  })

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings({ ...settings, [key]: value })
    onMessage("设置已保存")
  }

  return (
    <div className="settings-container">
      <div className="section">
        <h3>工作模式</h3>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="mode"
              checked={settings.mode === ModeType.WHITELIST}
              onChange={() => updateSetting("mode", ModeType.WHITELIST)}
            />
            <span>白名单模式：仅白名单内网站不执行清理</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="mode"
              checked={settings.mode === ModeType.BLACKLIST}
              onChange={() => updateSetting("mode", ModeType.BLACKLIST)}
            />
            <span>黑名单模式：仅黑名单内网站执行清理</span>
          </label>
        </div>
      </div>

      <div className="section">
        <h3>Cookie清除类型</h3>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="clearType"
              checked={settings.clearType === CookieClearType.SESSION}
              onChange={() => updateSetting("clearType", CookieClearType.SESSION)}
            />
            <span>仅清除会话Cookie</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="clearType"
              checked={settings.clearType === CookieClearType.PERSISTENT}
              onChange={() => updateSetting("clearType", CookieClearType.PERSISTENT)}
            />
            <span>仅清除持久Cookie</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="clearType"
              checked={settings.clearType === CookieClearType.ALL}
              onChange={() => updateSetting("clearType", CookieClearType.ALL)}
            />
            <span>清除所有Cookie</span>
          </label>
        </div>
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
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="themeMode"
              checked={settings.themeMode === ThemeMode.AUTO}
              onChange={() => updateSetting("themeMode", ThemeMode.AUTO)}
            />
            <span>跟随浏览器</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="themeMode"
              checked={settings.themeMode === ThemeMode.LIGHT}
              onChange={() => updateSetting("themeMode", ThemeMode.LIGHT)}
            />
            <span>亮色</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="themeMode"
              checked={settings.themeMode === ThemeMode.DARK}
              onChange={() => updateSetting("themeMode", ThemeMode.DARK)}
            />
            <span>暗色</span>
          </label>
        </div>
      </div>

      <div className="section">
        <h3>自动清理</h3>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="checkbox"
              checked={settings.enableAutoCleanup}
              onChange={(e) => updateSetting("enableAutoCleanup", e.target.checked)}
            />
            <span>启用自动清理</span>
          </label>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={settings.cleanupOnTabDiscard}
              onChange={(e) => updateSetting("cleanupOnTabDiscard", e.target.checked)}
            />
            <span>启用已丢弃/未加载标签的清理</span>
          </label>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={settings.cleanupOnStartup}
              onChange={(e) => updateSetting("cleanupOnStartup", e.target.checked)}
            />
            <span>启动时清理打开标签页的 Cookie</span>
          </label>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={settings.cleanupExpiredCookies}
              onChange={(e) => updateSetting("cleanupExpiredCookies", e.target.checked)}
            />
            <span>清理所有过期的 Cookie</span>
          </label>
        </div>
      </div>

      <div className="section">
        <h3>高级清理</h3>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="checkbox"
              checked={settings.clearLocalStorage}
              onChange={(e) => updateSetting("clearLocalStorage", e.target.checked)}
            />
            <span>清理本地存储</span>
          </label>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={settings.clearIndexedDB}
              onChange={(e) => updateSetting("clearIndexedDB", e.target.checked)}
            />
            <span>清理索引数据库</span>
          </label>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={settings.clearCache}
              onChange={(e) => updateSetting("clearCache", e.target.checked)}
            />
            <span>清理缓存</span>
          </label>
        </div>
      </div>
    </div>
  )
}