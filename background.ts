import { Storage } from "@plasmohq/storage"
import { WHITELIST_KEY, BLACKLIST_KEY, SETTINGS_KEY } from "~store"
import type { Settings } from "~types"
import { ModeType, CookieClearType, isInList, isDomainMatch } from "~types"
import { clearBrowserData, type ClearBrowserDataOptions } from "~utils"
import { cleanDomain } from "~utils/domain"

const storage = new Storage()

chrome.runtime.onInstalled.addListener(async () => {
  const whitelist = await storage.get(WHITELIST_KEY)
  const blacklist = await storage.get(BLACKLIST_KEY)

  if (whitelist === undefined) {
    await storage.set(WHITELIST_KEY, [])
  }

  if (blacklist === undefined) {
    await storage.set(BLACKLIST_KEY, [])
  }
})

const performCleanup = async (domain: string, options?: { clearType?: CookieClearType, clearCache?: boolean, clearLocalStorage?: boolean, clearIndexedDB?: boolean }) => {
  // 获取设置
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings) return

  // 获取白名单和黑名单
  const whitelist = await storage.get<string[]>(WHITELIST_KEY) || []
  const blacklist = await storage.get<string[]>(BLACKLIST_KEY) || []

  // 处理清理选项
  const clearType = options?.clearType ?? settings.clearType
  const clearOptions: ClearBrowserDataOptions = {
    clearCache: options?.clearCache ?? settings.clearCache,
    clearLocalStorage: options?.clearLocalStorage ?? settings.clearLocalStorage,
    clearIndexedDB: options?.clearIndexedDB ?? settings.clearIndexedDB
  }

  // 检查是否应该清理
  let shouldCleanup = false
  
  if (settings.mode === ModeType.WHITELIST) {
    shouldCleanup = !isInList(domain, whitelist)
  } else if (settings.mode === ModeType.BLACKLIST) {
    shouldCleanup = isInList(domain, blacklist)
  }
  
  if (!shouldCleanup) return

  // 清理 Cookie
  const cookies = await chrome.cookies.getAll({})
  let count = 0
  const clearedDomains = new Set<string>()

  for (const cookie of cookies) {
    if (!isDomainMatch(cookie.domain, domain)) continue

    // 检查清理类型
    const isSession = !cookie.expirationDate
    if (clearType === CookieClearType.SESSION && !isSession) continue
    if (clearType === CookieClearType.PERSISTENT && isSession) continue

    // 清理 Cookie
    const cleanedDomain = cleanDomain(cookie.domain)
      const url = `http${cookie.secure ? 's' : ''}://${cleanedDomain}${cookie.path}`
      await chrome.cookies.remove({ url, name: cookie.name })
      count++
      clearedDomains.add(cleanedDomain)
  }

  // 清理浏览器数据
  await clearBrowserData(clearedDomains, clearOptions)

  return { count, clearedDomains: Array.from(clearedDomains) }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 获取设置
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings?.enableAutoCleanup || !settings?.cleanupOnTabDiscard) return

  // 当标签页被丢弃时清理
  if (changeInfo.discarded && tab.url) {
    try {
      const url = new URL(tab.url)
      await performCleanup(url.hostname)
    } catch (e) {
      console.error("Failed to cleanup on tab discard:", e)
    }
  }
})

chrome.runtime.onStartup.addListener(async () => {
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings?.enableAutoCleanup || !settings?.cleanupOnStartup) return

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    if (activeTab?.url) {
      try {
        const url = new URL(activeTab.url)
        await performCleanup(url.hostname)
      } catch (e) {
        console.error("Failed to cleanup active tab on startup:", e)
      }
    } else {
      // Fallback: cleanup all tabs' cookies
      const allTabs = await chrome.tabs.query({})
      for (const tab of allTabs) {
        if (tab?.url) {
          try {
            const url = new URL(tab.url)
            await performCleanup(url.hostname)
          } catch (e) {
            console.error(`Failed to cleanup tab ${tab.id} on startup:`, e)
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to cleanup on startup:", e)
  }
})
