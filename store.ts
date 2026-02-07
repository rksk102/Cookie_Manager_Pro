import { Storage } from "@plasmohq/storage"
import { CookieClearType, LogRetention, ThemeMode, ModeType } from "~types"
import type { Settings } from "~types"

export const storage = new Storage()

export const WHITELIST_KEY = "whitelist"
export const BLACKLIST_KEY = "blacklist"
export const SETTINGS_KEY = "settings"
export const CLEAR_LOG_KEY = "clearLog"

export const LOG_RETENTION_MAP: Record<string, number> = {
  [LogRetention.ONE_HOUR]: 1 * 60 * 60 * 1000,
  [LogRetention.SIX_HOURS]: 6 * 60 * 60 * 1000,
  [LogRetention.TWELVE_HOURS]: 12 * 60 * 60 * 1000,
  [LogRetention.ONE_DAY]: 1 * 24 * 60 * 60 * 1000,
  [LogRetention.THREE_DAYS]: 3 * 24 * 60 * 60 * 1000,
  [LogRetention.SEVEN_DAYS]: 7 * 24 * 60 * 60 * 1000,
  [LogRetention.TEN_DAYS]: 10 * 24 * 60 * 60 * 1000,
  [LogRetention.THIRTY_DAYS]: 30 * 24 * 60 * 60 * 1000
}

export const DEFAULT_SETTINGS: Settings = {
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
