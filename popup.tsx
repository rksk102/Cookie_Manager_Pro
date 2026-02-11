import { useEffect, useState, useCallback } from "react";
import { useStorage } from "@plasmohq/storage/hook";
import { DomainManager } from "~components/DomainManager";
import { Settings } from "~components/Settings";
import { ClearLog } from "~components/ClearLog";
import { CookieList } from "~components/CookieList";
import { ErrorBoundary } from "~components/ErrorBoundary";
import {
  WHITELIST_KEY,
  BLACKLIST_KEY,
  SETTINGS_KEY,
  CLEAR_LOG_KEY,
  DEFAULT_SETTINGS,
  LOG_RETENTION_MAP,
} from "~store";
import type {
  DomainList,
  CookieStats,
  Settings as SettingsType,
  ClearLogEntry,
  Cookie,
} from "~types";
import { CookieClearType, ThemeMode, LogRetention, ModeType } from "~types";
import { isDomainMatch, isInList } from "~utils";
import {
  performCleanupWithFilter,
  cleanupExpiredCookies as cleanupExpiredCookiesUtil,
} from "~utils/cleanup";
import { performCleanup } from "~utils/cleanup";
import { MESSAGE_DURATION } from "~constants";
import "./style.css";

function IndexPopup() {
  const [currentDomain, setCurrentDomain] = useState("");
  const [activeTab, setActiveTab] = useState("manage");
  const [message, setMessage] = useState({ text: "", isError: false, visible: false });
  const [stats, setStats] = useState<CookieStats>({
    total: 0,
    current: 0,
    session: 0,
    persistent: 0,
  });
  const [currentCookies, setCurrentCookies] = useState<Cookie[]>([]);
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.AUTO);

  const [whitelist, setWhitelist] = useStorage<DomainList>(WHITELIST_KEY, []);
  const [blacklist, setBlacklist] = useStorage<DomainList>(BLACKLIST_KEY, []);
  const [settings] = useStorage<SettingsType>(SETTINGS_KEY, DEFAULT_SETTINGS);
  const [_logs, setLogs] = useStorage<ClearLogEntry[]>(CLEAR_LOG_KEY, []);

  const applyTheme = useCallback(() => {
    const themeMode = settings.themeMode;
    if (themeMode === ThemeMode.AUTO) {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? ThemeMode.DARK : ThemeMode.LIGHT);
    } else {
      setTheme(themeMode);
    }
  }, [settings.themeMode]);

  const showMessage = useCallback((text: string, isError = false) => {
    setMessage({ text, isError, visible: true });
    setTimeout(() => setMessage((prev) => ({ ...prev, visible: false })), MESSAGE_DURATION);
  }, []);

  const updateStats = useCallback(async () => {
    try {
      const cookies = await chrome.cookies.getAll({ domain: currentDomain });
      const currentCookiesList = cookies.filter((c) => isDomainMatch(c.domain, currentDomain));
      const sessionCookies = currentCookiesList.filter((c) => !c.expirationDate);
      const persistentCookies = currentCookiesList.filter((c) => c.expirationDate);

      const allCookies = await chrome.cookies.getAll({});

      setStats({
        total: allCookies.length,
        current: currentCookiesList.length,
        session: sessionCookies.length,
        persistent: persistentCookies.length,
      });
      setCurrentCookies(
        currentCookiesList.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          expirationDate: c.expirationDate,
          storeId: c.storeId,
        }))
      );
    } catch (e) {
      console.error("Failed to update stats:", e);
      showMessage("更新统计信息失败", true);
    }
  }, [currentDomain, showMessage, setStats]);

  const addLog = useCallback(
    (domain: string, cookieType: CookieClearType, count: number) => {
      const newLog: ClearLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        domain,
        cookieType,
        count,
        timestamp: Date.now(),
      };

      if (settings.logRetention === LogRetention.FOREVER) {
        setLogs((prev) => [newLog, ...(prev ?? [])]);
        return;
      }

      const now = Date.now();
      const retentionMs = LOG_RETENTION_MAP[settings.logRetention] || 7 * 24 * 60 * 60 * 1000;
      setLogs((prev) => {
        const currentPrev = prev ?? [];
        const filteredLogs = currentPrev.filter((log) => now - log.timestamp <= retentionMs);
        return [newLog, ...filteredLogs];
      });
    },
    [settings.logRetention, setLogs]
  );

  const buildDomainString = useCallback(
    (clearedDomains: Set<string>, successMsg: string): string => {
      if (clearedDomains.size === 1) {
        return Array.from(clearedDomains)[0];
      }
      if (clearedDomains.size > 1) {
        return `${Array.from(clearedDomains)[0]} 等${clearedDomains.size}个域名`;
      }
      return successMsg.includes("所有") ? "所有网站" : currentDomain;
    },
    [currentDomain]
  );

  const clearCookies = useCallback(
    async (filterFn: (domain: string) => boolean, successMsg: string, logType: CookieClearType) => {
      try {
        const result = await performCleanupWithFilter(filterFn, {
          clearType: logType,
          clearCache: settings.clearCache,
          clearLocalStorage: settings.clearLocalStorage,
          clearIndexedDB: settings.clearIndexedDB,
        });

        if (result.count > 0) {
          const domainStr = buildDomainString(new Set(result.clearedDomains), successMsg);
          addLog(domainStr, logType, result.count);
        }

        showMessage(`${successMsg} ${result.count} 个Cookie`);
        await updateStats();
      } catch (e) {
        console.error("Failed to clear cookies:", e);
        showMessage("清除Cookie失败", true);
      }
    },
    [
      settings.clearCache,
      settings.clearLocalStorage,
      settings.clearIndexedDB,
      buildDomainString,
      addLog,
      showMessage,
      updateStats,
    ]
  );

  const cleanupStartup = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          const result = await performCleanup({
            domain: url.hostname,
            clearType: settings.clearType,
            clearCache: settings.clearCache,
          });

          if (result && result.count > 0) {
            addLog("启动清理", settings.clearType, result.count);
          }
        } catch (e) {
          console.error("Failed to cleanup on startup:", e);
        }
      }
    } catch (e) {
      console.error("Failed to cleanup on startup:", e);
    }
  }, [settings.clearType, settings.clearCache, addLog]);

  const cleanupExpiredCookies = useCallback(async () => {
    try {
      const count = await cleanupExpiredCookiesUtil();

      if (count > 0) {
        addLog("过期 Cookie 清理", CookieClearType.ALL, count);
        showMessage(`已清理 ${count} 个过期 Cookie`);
      } else {
        showMessage("没有找到过期的 Cookie");
      }

      updateStats();
    } catch (e) {
      console.error("Failed to cleanup expired cookies:", e);
      showMessage("清理过期 Cookie 失败", true);
    }
  }, [addLog, showMessage, updateStats]);

  const quickAddToWhitelist = useCallback(() => {
    if (currentDomain && !whitelist.includes(currentDomain)) {
      setWhitelist([...whitelist, currentDomain]);
      showMessage(`已添加 ${currentDomain} 到白名单`);
    } else if (currentDomain) {
      showMessage(`${currentDomain} 已在白名单中`);
    }
  }, [currentDomain, whitelist, setWhitelist, showMessage]);

  const quickAddToBlacklist = useCallback(() => {
    if (currentDomain && !blacklist.includes(currentDomain)) {
      setBlacklist([...blacklist, currentDomain]);
      showMessage(`已添加 ${currentDomain} 到黑名单`);
    } else if (currentDomain) {
      showMessage(`${currentDomain} 已在黑名单中`);
    }
  }, [currentDomain, blacklist, setBlacklist, showMessage]);

  const quickClearCurrent = useCallback(() => {
    if (confirm(`确定要清除 ${currentDomain} 的Cookie吗？`)) {
      clearCookies(
        (d) => isDomainMatch(d, currentDomain),
        `已清除 ${currentDomain}`,
        settings.clearType
      );
    }
  }, [currentDomain, clearCookies, settings.clearType]);

  const quickClearAll = useCallback(() => {
    if (confirm("确定要清除所有Cookie吗？（白名单除外）")) {
      clearCookies(() => true, "已清除所有网站", settings.clearType);
    }
  }, [clearCookies, settings.clearType]);

  useEffect(() => {
    const cookieListener = () => updateStats();
    chrome.cookies.onChanged.addListener(cookieListener);

    return () => {
      chrome.cookies.onChanged.removeListener(cookieListener);
    };
  }, [updateStats]);

  useEffect(() => {
    async function init() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          setCurrentDomain(url.hostname);
        } catch {
          setCurrentDomain("");
        }
      }
      updateStats();
      applyTheme();

      if (settings.cleanupOnStartup) {
        await cleanupStartup();
      }

      if (settings.cleanupExpiredCookies) {
        await cleanupExpiredCookies();
      }
    }
    init();
  }, [
    settings.mode,
    settings.cleanupOnStartup,
    settings.cleanupExpiredCookies,
    updateStats,
    applyTheme,
    cleanupStartup,
    cleanupExpiredCookies,
  ]);

  return (
    <ErrorBoundary>
      <div className={`container theme-${theme}`}>
        <header>
          <h1>🍪 Cookie Manager Pro</h1>
        </header>

        <div className="tabs">
          {[
            { id: "manage", label: "管理", icon: "🏠" },
            {
              id: settings.mode === ModeType.WHITELIST ? "whitelist" : "blacklist",
              label: settings.mode === ModeType.WHITELIST ? "白名单" : "黑名单",
              icon: "📝",
            },
            { id: "settings", label: "设置", icon: "⚙️" },
            { id: "log", label: "日志", icon: "📋" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "manage" && (
          <div className="tab-content">
            <div className="section">
              <h3>
                <span className="section-icon">🌐</span>当前网站
              </h3>
              <div className="domain-info">{currentDomain || "无法获取域名"}</div>
            </div>

            <div className="section">
              <h3>
                <span className="section-icon">📊</span>Cookie统计
              </h3>
              <div className="stats">
                <div className="stat-item">
                  <span className="stat-label">总数</span>
                  <span className="stat-value">{stats.total}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">当前网站</span>
                  <span className="stat-value">{stats.current}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">会话</span>
                  <span className="stat-value">{stats.session}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">持久</span>
                  <span className="stat-value">{stats.persistent}</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>
                <span className="section-icon">⚡</span>快速操作
              </h3>
              <div className="button-group">
                <button onClick={quickAddToWhitelist} className="btn btn-success">
                  <span className="btn-icon">✓</span>添加到白名单
                </button>
                <button onClick={quickAddToBlacklist} className="btn btn-secondary">
                  <span className="btn-icon">✗</span>添加到黑名单
                </button>
                <button onClick={quickClearCurrent} className="btn btn-warning">
                  <span className="btn-icon">🧹</span>清除当前网站
                </button>
                <button onClick={quickClearAll} className="btn btn-danger">
                  <span className="btn-icon">🔥</span>清除所有Cookie
                </button>
              </div>
            </div>

            <CookieList cookies={currentCookies} />
          </div>
        )}

        {activeTab === "whitelist" && (
          <div className="tab-content">
            <DomainManager type="whitelist" currentDomain={currentDomain} onMessage={showMessage} />
          </div>
        )}

        {activeTab === "blacklist" && (
          <div className="tab-content">
            <DomainManager
              type="blacklist"
              currentDomain={currentDomain}
              onMessage={showMessage}
              onClearBlacklist={async () => {
                const result = await performCleanupWithFilter(
                  (domain) => isInList(domain, blacklist),
                  {
                    clearType: CookieClearType.ALL,
                  }
                );

                if (result.count > 0) {
                  const domainStr = buildDomainString(new Set(result.clearedDomains), "黑名单网站");
                  addLog(domainStr, CookieClearType.ALL, result.count);
                  showMessage(`已清除黑名单网站的 ${result.count} 个Cookie`);
                  updateStats();
                } else {
                  showMessage("黑名单网站暂无Cookie可清除");
                }
              }}
            />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="tab-content">
            <Settings onMessage={showMessage} />
          </div>
        )}

        {activeTab === "log" && (
          <div className="tab-content">
            <ClearLog onMessage={showMessage} />
          </div>
        )}

        <div
          className={`message ${message.isError ? "error" : ""} ${message.visible ? "visible" : ""}`}
        >
          {message.text}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default IndexPopup;
