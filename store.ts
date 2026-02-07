import { Storage } from "@plasmohq/storage"
import { CookieClearType, LogRetention, ThemeMode, ModeType } from "~types"

export const storage = new Storage()

export const WHITELIST_KEY = "whitelist"
export const BLACKLIST_KEY = "blacklist"
export const SETTINGS_KEY = "settings"
export const CLEAR_LOG_KEY = "clearLog"

export const DEFAULT_SETTINGS = {
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
}
