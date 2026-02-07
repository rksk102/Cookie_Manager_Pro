import { buildOrigins } from "~utils/domain"
import type { CookieClearType } from "~types"

export interface ClearBrowserDataOptions {
  clearCache?: boolean;
  clearLocalStorage?: boolean;
  clearIndexedDB?: boolean;
}

export interface ClearCookiesOptions {
  domains?: Set<string>
  clearType?: CookieClearType
  filterFn?: (domain: string) => boolean
}

export const clearCookies = async (options: ClearCookiesOptions = {}) => {
  const { domains, clearType, filterFn } = options
  const cookies = await chrome.cookies.getAll({})
  let count = 0
  const clearedDomains = new Set<string>()

  for (const cookie of cookies) {
    try {
      const cleanedDomain = cookie.domain.replace(/^\./, '')
      
      if (filterFn && !filterFn(cleanedDomain)) continue

      if (clearType) {
        const isSession = !cookie.expirationDate
        if (clearType === 'session' && !isSession) continue
        if (clearType === 'persistent' && isSession) continue
      }

      const url = `http${cookie.secure ? 's' : ''}://${cleanedDomain}${cookie.path}`
      await chrome.cookies.remove({ url, name: cookie.name })
      count++
      clearedDomains.add(cleanedDomain)
    } catch (e) {
      console.error(`Failed to clear cookie ${cookie.name}:`, e)
    }
  }

  return { count, clearedDomains }
}

export const clearBrowserData = async (domains: Set<string>, options: ClearBrowserDataOptions) => {
  const { clearCache, clearLocalStorage, clearIndexedDB } = options

  if (clearCache && domains.size > 0) {
    try {
      const origins = buildOrigins(domains)
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

  if (clearLocalStorage && domains.size > 0) {
    try {
      const origins = buildOrigins(domains)
      await chrome.browsingData.remove(
        { origins },
        {
          localStorage: true
        }
      )
    } catch (e) {
      console.error("Failed to clear localStorage:", e)
    }
  }

  if (clearIndexedDB && domains.size > 0) {
    try {
      const origins = buildOrigins(domains)
      await chrome.browsingData.remove(
        { origins },
        {
          indexedDB: true
        }
      )
    } catch (e) {
      console.error("Failed to clear IndexedDB:", e)
    }
  }
}
