export type DomainList = string[];

export interface StorageData {
  whitelist: DomainList;
  blacklist: DomainList;
}

export type SameSite = 'strict' | 'lax' | 'none' | 'unspecified' | 'no_restriction'

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSite;
  expirationDate?: number;
  storeId?: string;
}

export const normalizeDomain = (domain: string): string => {
  return domain.replace(/^\./, '').toLowerCase();
};

export const isDomainMatch = (cookieDomain: string, targetDomain: string): boolean => {
  const normalizedCookie = normalizeDomain(cookieDomain);
  const normalizedTarget = normalizeDomain(targetDomain);
  
  if (normalizedCookie === normalizedTarget) return true;
  if (normalizedTarget.endsWith('.' + normalizedCookie)) return true;
  if (normalizedCookie.endsWith('.' + normalizedTarget)) return true;
  
  return false;
};

export const isInList = (domain: string, list: string[]): boolean => {
  const normalizedDomain = normalizeDomain(domain);
  return list.some(item => {
    const normalizedItem = normalizeDomain(item);
    return normalizedDomain === normalizedItem ||
           normalizedDomain.endsWith('.' + normalizedItem) ||
           normalizedItem.endsWith('.' + normalizedDomain);
  });
};

export const getCookieTypeName = (type: string): string => {
  switch (type) {
    case 'session':
      return '会话Cookie';
    case 'persistent':
      return '持久Cookie';
    default:
      return '所有Cookie';
  }
};

export interface CookieStats {
  total: number;
  current: number;
  session: number;
  persistent: number;
}

export enum CookieClearType {
  SESSION = "session",
  PERSISTENT = "persistent",
  ALL = "all"
}

export enum LogRetention {
  ONE_HOUR = "1hour",
  SIX_HOURS = "6hours",
  TWELVE_HOURS = "12hours",
  ONE_DAY = "1day",
  THREE_DAYS = "3days",
  SEVEN_DAYS = "7days",
  TEN_DAYS = "10days",
  THIRTY_DAYS = "30days",
  FOREVER = "forever"
}

export enum ThemeMode {
  AUTO = "auto",
  LIGHT = "light",
  DARK = "dark"
}

export enum ModeType {
  WHITELIST = "whitelist",
  BLACKLIST = "blacklist"
}

export interface Settings {
  clearType: CookieClearType;
  logRetention: LogRetention;
  themeMode: ThemeMode;
  mode: ModeType;
  clearLocalStorage: boolean;
  clearIndexedDB: boolean;
  clearCache: boolean;
  enableAutoCleanup: boolean;
  cleanupOnTabDiscard: boolean;
  cleanupOnStartup: boolean;
  cleanupExpiredCookies: boolean;
}

export interface ClearLog {
  id: string;
  domain: string;
  cookieType: CookieClearType;
  count: number;
  timestamp: number;
}
