import { CookieClearType, CookieRisk } from "./types";
import { TRACKING_COOKIE_KEYWORDS, THIRD_PARTY_TRACKERS } from "./constants";

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

export const isTrackingCookie = (cookie: { name: string; domain: string }): boolean => {
  const lowerName = cookie.name.toLowerCase();
  const lowerDomain = cookie.domain.toLowerCase();

  if (TRACKING_COOKIE_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return true;
  }

  if (THIRD_PARTY_TRACKERS.some((tracker) => lowerDomain.includes(tracker))) {
    return true;
  }

  return false;
};

export const isThirdPartyCookie = (cookieDomain: string, currentDomain?: string): boolean => {
  if (!currentDomain) return false;
  const normalizedCookie = normalizeDomain(cookieDomain);
  const normalizedCurrent = normalizeDomain(currentDomain);
  return !isDomainMatch(normalizedCookie, normalizedCurrent);
};

export const assessCookieRisk = (
  cookie: { name: string; domain: string; httpOnly: boolean; secure?: boolean },
  currentDomain?: string
): CookieRisk => {
  let riskLevel: "low" | "medium" | "high" = "low";
  const reasons: string[] = [];

  const isTracking = isTrackingCookie(cookie);
  const isThirdParty = isThirdPartyCookie(cookie.domain, currentDomain);

  if (isTracking) {
    riskLevel = "high";
    reasons.push("疑似追踪 Cookie");
  }

  if (isThirdParty) {
    if (riskLevel === "low") riskLevel = "medium";
    reasons.push("第三方 Cookie");
  }

  if (!cookie.httpOnly) {
    if (riskLevel === "low") riskLevel = "medium";
    reasons.push("非 HttpOnly（可被 JavaScript 访问）");
  }

  if (!cookie.secure && cookie.domain.startsWith(".")) {
    if (riskLevel === "low") riskLevel = "medium";
    reasons.push("非 Secure（可能在不安全连接中传输）");
  }

  return {
    level: riskLevel,
    reason: reasons.length > 0 ? reasons.join("、") : "低风险",
    isTracking,
    isThirdParty,
  };
};

export const getRiskLevelColor = (level: string): string => {
  switch (level) {
    case "high":
      return "#ef4444";
    case "medium":
      return "#f59e0b";
    default:
      return "#22c55e";
  }
};

export const getRiskLevelText = (level: string): string => {
  switch (level) {
    case "high":
      return "高风险";
    case "medium":
      return "中风险";
    default:
      return "低风险";
  }
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

export const clearSingleCookie = async (
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

export const editCookie = async (
  originalCookie: chrome.cookies.Cookie,
  updates: Partial<chrome.cookies.Cookie>
): Promise<boolean> => {
  try {
    const cleanedDomain = originalCookie.domain.replace(/^\./, "");
    const url = buildCookieUrl(originalCookie, cleanedDomain);

    await chrome.cookies.remove({ url, name: originalCookie.name });

    const newCookie: chrome.cookies.SetDetails = {
      url,
      name: updates.name || originalCookie.name,
      value: updates.value || originalCookie.value,
      domain: originalCookie.domain,
      path: updates.path || originalCookie.path,
      secure: updates.secure ?? originalCookie.secure,
      httpOnly: updates.httpOnly ?? originalCookie.httpOnly,
      sameSite: updates.sameSite || originalCookie.sameSite,
    };

    if (updates.expirationDate || originalCookie.expirationDate) {
      newCookie.expirationDate = updates.expirationDate || originalCookie.expirationDate;
    }

    await chrome.cookies.set(newCookie);
    return true;
  } catch (e) {
    console.error("Failed to edit cookie:", e);
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

export const groupCookiesByDomain = (
  cookies: chrome.cookies.Cookie[]
): Map<string, chrome.cookies.Cookie[]> => {
  const grouped = new Map<string, chrome.cookies.Cookie[]>();
  for (const cookie of cookies) {
    const domain = normalizeDomain(cookie.domain);
    if (!grouped.has(domain)) {
      grouped.set(domain, []);
    }
    grouped.get(domain)!.push(cookie);
  }
  return grouped;
};
