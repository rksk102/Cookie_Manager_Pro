import { Storage } from "@plasmohq/storage"
import { WHITELIST_KEY, BLACKLIST_KEY, SETTINGS_KEY } from "~store"
import type { Settings } from "~types"
import { ModeType, CookieClearType, isInList, isDomainMatch } from "~types"
import { clearBrowserData, clearCookies, type ClearBrowserDataOptions } from "~utils"

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
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings) return

  const whitelist = await storage.get<string[]>(WHITELIST_KEY) || []
  const blacklist = await storage.get<string[]>(BLACKLIST_KEY) || []

  const clearType = options?.clearType ?? settings.clearType
  const clearOptions: ClearBrowserDataOptions = {
    clearCache: options?.clearCache ?? settings.clearCache,
    clearLocalStorage: options?.clearLocalStorage ?? settings.clearLocalStorage,
    clearIndexedDB: options?.clearIndexedDB ?? settings.clearIndexedDB
  }

  let shouldCleanup = false
  
  if (settings.mode === ModeType.WHITELIST) {
    shouldCleanup = !isInList(domain, whitelist)
  } else if (settings.mode === ModeType.BLACKLIST) {
    shouldCleanup = isInList(domain, blacklist)
  }
  
  if (!shouldCleanup) return

  const result = await clearCookies({
    filterFn: (cookieDomain) => isDomainMatch(cookieDomain, domain),
    clearType
  })

  await clearBrowserData(result.clearedDomains, clearOptions)

  return { count: result.count, clearedDomains: Array.from(result.clearedDomains) }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings?.enableAutoCleanup || !settings?.cleanupOnTabDiscard) return

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
