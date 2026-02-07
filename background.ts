import { Storage } from "@plasmohq/storage"
import { WHITELIST_KEY, BLACKLIST_KEY, SETTINGS_KEY } from "~store"
import type { Settings } from "~types"
import { ModeType } from "~types"

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

const performCleanup = async (domain: string) => {
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings) return

  const whitelist = await storage.get<string[]>(WHITELIST_KEY) || []
  const blacklist = await storage.get<string[]>(BLACKLIST_KEY) || []

  let shouldCleanup = false
  
  if (settings.mode === ModeType.WHITELIST) {
    const isWhitelisted = whitelist.some(w => domain.includes(w) || w.includes(domain))
    shouldCleanup = !isWhitelisted
  } else if (settings.mode === ModeType.BLACKLIST) {
    const isBlacklisted = blacklist.some(b => domain.includes(b) || b.includes(domain))
    shouldCleanup = isBlacklisted
  }
  
  if (!shouldCleanup) return

  const cookies = await chrome.cookies.getAll({})
  let count = 0

  for (const cookie of cookies) {
    const cookieDomain = cookie.domain.replace(/^\./, '')
    if (cookieDomain.includes(domain) || domain.includes(cookieDomain)) {
      const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`
      await chrome.cookies.remove({ url, name: cookie.name })
      count++
    }
  }

  if (settings.clearCache) {
    try {
      await chrome.browsingData.remove(
        { origins: [`http://${domain}`, `https://${domain}`] },
        {
          cacheStorage: true,
          fileSystems: true,
          serviceWorkers: true
        }
      )
    } catch (e) {
      console.error("Failed to clear cache:", e)
    }
  }
}

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings?.enableAutoCleanup || !settings?.cleanupOnTabDiscard) return
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings?.enableAutoCleanup || !settings?.cleanupOnTabDiscard) return

  if (changeInfo.url && tab.url) {
    try {
      const url = new URL(tab.url)
      await performCleanup(url.hostname)
    } catch (e) {
      console.error("Failed to cleanup on tab update:", e)
    }
  }
})

chrome.runtime.onStartup.addListener(async () => {
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings?.enableAutoCleanup || !settings?.cleanupOnStartup) return

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.url) {
    try {
      const url = new URL(tab.url)
      await performCleanup(url.hostname)
    } catch (e) {
      console.error("Failed to cleanup on startup:", e)
    }
  }
})
