import { Storage } from "@plasmohq/storage"
import { WHITELIST_KEY, BLACKLIST_KEY, SETTINGS_KEY } from "~store"
import type { Settings } from "~types"
import { ModeType, CookieClearType, isInList, isDomainMatch } from "~types"

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

const performCleanup = async (domain: string, options?: { clearType?: CookieClearType, clearCache?: boolean }) => {
  const settings = await storage.get<Settings>(SETTINGS_KEY)
  if (!settings) return

  const whitelist = await storage.get<string[]>(WHITELIST_KEY) || []
  const blacklist = await storage.get<string[]>(BLACKLIST_KEY) || []

  const clearType = options?.clearType ?? settings.clearType
  const shouldClearCache = options?.clearCache ?? settings.clearCache

  let shouldCleanup = false
  
  if (settings.mode === ModeType.WHITELIST) {
    shouldCleanup = !isInList(domain, whitelist)
  } else if (settings.mode === ModeType.BLACKLIST) {
    shouldCleanup = isInList(domain, blacklist)
  }
  
  if (!shouldCleanup) return

  const cookies = await chrome.cookies.getAll({})
  let count = 0
  const clearedDomains = new Set<string>()

  for (const cookie of cookies) {
    if (!isDomainMatch(cookie.domain, domain)) continue

    const isSession = !cookie.expirationDate
    if (clearType === CookieClearType.SESSION && !isSession) continue
    if (clearType === CookieClearType.PERSISTENT && isSession) continue

    const cleanDomain = cookie.domain.replace(/^\./, '')
    const url = `http${cookie.secure ? 's' : ''}://${cleanDomain}${cookie.path}`
    await chrome.cookies.remove({ url, name: cookie.name })
    count++
    clearedDomains.add(cleanDomain)
  }

  if (shouldClearCache && clearedDomains.size > 0) {
    try {
      const origins: string[] = []
      clearedDomains.forEach(d => {
        origins.push(`http://${d}`, `https://${d}`)
      })
      await chrome.browsingData.remove(
        { origins },
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

  return { count, clearedDomains: Array.from(clearedDomains) }
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
