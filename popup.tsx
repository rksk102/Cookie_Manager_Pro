import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useStorage } from "@plasmohq/storage/hook";
import { DomainManager } from "~components/DomainManager";
import { Settings } from "~components/Settings";
import { ClearLog } from "~components/ClearLog";
import { CookieList } from "~components/CookieList";
import { ErrorBoundary } from "~components/ErrorBoundary";
import { ConfirmDialog } from "~components/ConfirmDialog";
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
import { isDomainMatch, isInList, isTrackingCookie, isThirdPartyCookie } from "~utils";
import {
  performCleanupWithFilter,
  cleanupExpiredCookies as cleanupExpiredCookiesUtil,
  performCleanup,
} from "~utils/cleanup";
import { MESSAGE_DURATION } from "~constants";
import "./style.css";

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: "danger" | "warning";
  onConfirm: () => void;
}

function IndexPopup() {
  const [currentDomain, setCurrentDomain] = useState("");
  const [activeTab, setActiveTab] = useState("manage");
  const [message, setMessage] = useState({ text: "", isError: false, visible: false });
  const [stats, setStats] = useState<CookieStats>({
    total: 0,
    current: 0,
    session: 0,
    persistent: 0,
    thirdParty: 0,
    tracking: 0,
  });
  const [currentCookies, setCurrentCookies] = useState<Cookie[]>([]);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    variant: "warning",
    onConfirm: () => {},
  });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [whitelist, setWhitelist] = useStorage<DomainList>(WHITELIST_KEY, []);
  const [blacklist, setBlacklist] = useStorage<DomainList>(BLACKLIST_KEY, []);
  const [settings] = useStorage<SettingsType>(SETTINGS_KEY, DEFAULT_SETTINGS);
  const [_logs, setLogs] = useStorage<ClearLogEntry[]>(CLEAR_LOG_KEY, []);

  const theme = useMemo(() => {
    const themeMode = settings.themeMode;
    if (themeMode === ThemeMode.AUTO) {
      return systemTheme === "dark" ? ThemeMode.DARK : ThemeMode.LIGHT;
    }
    return themeMode;
  }, [settings.themeMode, systemTheme]);

  const showMessage = useCallback((text: string, isError = false) => {
    setMessage({ text, isError, visible: true });
    setTimeout(() => setMessage((prev) => ({ ...prev, visible: false })), MESSAGE_DURATION);
  }, []);

  const updateStats = useCallback(async () => {
    try {
      const allCookies = await chrome.cookies.getAll({});
      const currentCookiesList = allCookies.filter((c) =>
        currentDomain ? isDomainMatch(c.domain, currentDomain) : false
      );
      const sessionCookies = currentCookiesList.filter((c) => !c.expirationDate);
      const persistentCookies = currentCookiesList.filter((c) => c.expirationDate);

      const thirdPartyCookies = currentCookiesList.filter((c) =>
        isThirdPartyCookie(c.domain, currentDomain)
      );
      const trackingCookies = currentCookiesList.filter((c) => isTrackingCookie(c));

      setStats({
        total: allCookies.length,
        current: currentCookiesList.length,
        session: sessionCookies.length,
        persistent: persistentCookies.length,
        thirdParty: thirdPartyCookies.length,
        tracking: trackingCookies.length,
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
  }, [currentDomain, showMessage]);

  const addLog = useCallback(
    (
      domain: string,
      cookieType: CookieClearType,
      count: number,
      action: "clear" | "edit" | "delete" | "import" | "export" = "clear",
      details?: string
    ) => {
      const newLog: ClearLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        domain,
        cookieType,
        count,
        timestamp: Date.now(),
        action,
        details,
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

  const showConfirm = useCallback(
    (title: string, message: string, variant: "danger" | "warning", onConfirm: () => void) => {
      setConfirmState({ isOpen: true, title, message, variant, onConfirm });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    confirmState.onConfirm();
    closeConfirm();
  }, [confirmState, closeConfirm]);

  const quickClearCurrent = useCallback(() => {
    showConfirm("清除确认", `确定要清除 ${currentDomain} 的Cookie吗？`, "warning", () => {
      clearCookies(
        (d) => isDomainMatch(d, currentDomain),
        `已清除 ${currentDomain}`,
        settings.clearType
      );
    });
  }, [currentDomain, clearCookies, settings.clearType, showConfirm]);

  const quickClearAll = useCallback(() => {
    showConfirm("清除确认", "确定要清除所有Cookie吗？（白名单除外）", "danger", () => {
      clearCookies(() => true, "已清除所有网站", settings.clearType);
    });
  }, [clearCookies, settings.clearType, showConfirm]);

  useEffect(() => {
    const cookieListener = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        updateStats();
      }, 300);
    };

    chrome.cookies.onChanged.addListener(cookieListener);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      chrome.cookies.onChanged.removeListener(cookieListener);
    };
  }, [updateStats]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

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
    cleanupStartup,
    cleanupExpiredCookies,
  ]);

  return (
    <ErrorBoundary>
      <div className={`container theme-${theme}`}>
        <header>
          <h1>
            <span aria-hidden="true">🍪</span> Cookie Manager Pro
          </h1>
        </header>

        <div className="tabs" role="tablist">
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
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              tabIndex={activeTab === tab.id ? 0 : -1}
            >
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "manage" && (
          <div className="tab-content" role="tabpanel" id="manage-panel">
            <div className="section">
              <h3>
                <span className="section-icon" aria-hidden="true">
                  🌐
                </span>
                当前网站
              </h3>
              <div className="domain-info">{currentDomain || "无法获取域名"}</div>
            </div>

            <div className="section">
              <h3>
                <span className="section-icon" aria-hidden="true">
                  📊
                </span>
                Cookie统计
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
                <div className="stat-item">
                  <span className="stat-label">第三方</span>
                  <span className="stat-value">{stats.thirdParty}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">追踪</span>
                  <span className="stat-value">{stats.tracking}</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>
                <span className="section-icon" aria-hidden="true">
                  ⚡
                </span>
                快速操作
              </h3>
              <div className="button-group">
                <button onClick={quickAddToWhitelist} className="btn btn-success">
                  <span className="btn-icon" aria-hidden="true">
                    ✓
                  </span>
                  添加到白名单
                </button>
                <button onClick={quickAddToBlacklist} className="btn btn-secondary">
                  <span className="btn-icon" aria-hidden="true">
                    ✗
                  </span>
                  添加到黑名单
                </button>
                <button onClick={quickClearCurrent} className="btn btn-warning">
                  <span className="btn-icon" aria-hidden="true">
                    🧹
                  </span>
                  清除当前网站
                </button>
                <button onClick={quickClearAll} className="btn btn-danger">
                  <span className="btn-icon" aria-hidden="true">
                    🔥
                  </span>
                  清除所有Cookie
                </button>
              </div>
            </div>

            <CookieList
              cookies={currentCookies}
              currentDomain={currentDomain}
              onUpdate={updateStats}
              onMessage={(text, isError = false) => showMessage(text, isError)}
            />
          </div>
        )}

        {activeTab === "whitelist" && (
          <div className="tab-content" role="tabpanel" id="whitelist-panel">
            <DomainManager type="whitelist" currentDomain={currentDomain} onMessage={showMessage} />
          </div>
        )}

        {activeTab === "blacklist" && (
          <div className="tab-content" role="tabpanel" id="blacklist-panel">
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
          <div className="tab-content" role="tabpanel" id="settings-panel">
            <Settings onMessage={showMessage} />
          </div>
        )}

        {activeTab === "log" && (
          <div className="tab-content" role="tabpanel" id="log-panel">
            <ClearLog onMessage={showMessage} />
          </div>
        )}

        <div
          className={`message ${message.isError ? "error" : ""} ${message.visible ? "visible" : ""}`}
        >
          {message.text}
        </div>

        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
        />
      </div>
    </ErrorBoundary>
  );
}

export default IndexPopup;
