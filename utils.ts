import { CookieClearType } from "~types";

export { CookieClearType };

export const normalizeDomain = (domain: string): string => {
  return domain.replace(/^\./, "").toLowerCase();
};

export const isDomainMatch = (cookieDomain: string, targetDomain: string): boolean => {
  const normalizedCookie = normalizeDomain(cookieDomain);
  const normalizedTarget = normalizeDomain(targetDomain);

  if (normalizedCookie === normalizedTarget) return true;
  if (normalizedTarget.endsWith("." + normalizedCookie)) return true;
  if (normalizedCookie.endsWith("." + normalizedTarget)) return true;

  return false;
};

export const isInList = (domain: string, list: string[]): boolean => {
  const normalizedDomain = normalizeDomain(domain);
  return list.some((item) => {
    const normalizedItem = normalizeDomain(item);
    return (
      normalizedDomain === normalizedItem ||
      normalizedDomain.endsWith("." + normalizedItem) ||
      normalizedItem.endsWith("." + normalizedDomain)
    );
  });
};

export const getCookieTypeName = (type: string): string => {
  switch (type) {
    case "session":
      return "会话Cookie";
    case "persistent":
      return "持久Cookie";
    default:
      return "所有Cookie";
  }
};

export const buildOrigins = (domains: Set<string>): string[] => {
  const origins: string[] = [];
  domains.forEach((d) => {
    origins.push(`https://${d}`);
  });
  return origins;
};

export interface ClearBrowserDataOptions {
  clearCache?: boolean;
  clearLocalStorage?: boolean;
  clearIndexedDB?: boolean;
}

export interface ClearCookiesOptions {
  clearType?: CookieClearType;
  filterFn?: (domain: string) => boolean;
}

const shouldClearCookieByType = (
  cookie: chrome.cookies.Cookie,
  clearType: CookieClearType
): boolean => {
  const isSession = !cookie.expirationDate;
  if (clearType === CookieClearType.SESSION && !isSession) return false;
  if (clearType === CookieClearType.PERSISTENT && isSession) return false;
  return true;
};

const shouldClearCookieByFilter = (
  domain: string,
  filterFn?: (domain: string) => boolean
): boolean => {
  if (filterFn && !filterFn(domain)) return false;
  return true;
};

const buildCookieUrl = (cookie: chrome.cookies.Cookie, cleanedDomain: string): string => {
  return `http${cookie.secure ? "s" : ""}://${cleanedDomain}${cookie.path}`;
};

const clearSingleCookie = async (
  cookie: chrome.cookies.Cookie,
  cleanedDomain: string
): Promise<boolean> => {
  try {
    const url = buildCookieUrl(cookie, cleanedDomain);
    await chrome.cookies.remove({ url, name: cookie.name });
    return true;
  } catch (e) {
    console.error(`Failed to clear cookie ${cookie.name}:`, e);
    return false;
  }
};

export const clearCookies = async (options: ClearCookiesOptions = {}) => {
  const { clearType, filterFn } = options;
  const cookies = await chrome.cookies.getAll({});
  let count = 0;
  const clearedDomains = new Set<string>();

  for (const cookie of cookies) {
    const cleanedDomain = cookie.domain.replace(/^\./, "");

    if (!shouldClearCookieByFilter(cleanedDomain, filterFn)) continue;

    if (clearType && !shouldClearCookieByType(cookie, clearType)) continue;

    const cleared = await clearSingleCookie(cookie, cleanedDomain);
    if (cleared) {
      count++;
      clearedDomains.add(cleanedDomain);
    }
  }

  return { count, clearedDomains };
};

export const clearBrowserData = async (domains: Set<string>, options: ClearBrowserDataOptions) => {
  const { clearCache, clearLocalStorage, clearIndexedDB } = options;

  if (clearCache && domains.size > 0) {
    try {
      const origins = buildOrigins(domains);
      await chrome.browsingData.remove(
        { origins },
        {
          cacheStorage: true,
          fileSystems: true,
          serviceWorkers: true,
        }
      );
    } catch (e) {
      console.error("Failed to clear cache:", e);
    }
  }

  if (clearLocalStorage && domains.size > 0) {
    try {
      const origins = buildOrigins(domains);
      await chrome.browsingData.remove(
        { origins },
        {
          localStorage: true,
        }
      );
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
    }
  }

  if (clearIndexedDB && domains.size > 0) {
    try {
      const origins = buildOrigins(domains);
      await chrome.browsingData.remove(
        { origins },
        {
          indexedDB: true,
        }
      );
    } catch (e) {
      console.error("Failed to clear IndexedDB:", e);
    }
  }
};
