import { useEffect, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { DomainManager } from "~components/DomainManager"
import { Settings } from "~components/Settings"
import { ClearLog } from "~components/ClearLog"
import { CookieList } from "~components/CookieList"
import { WHITELIST_KEY, BLACKLIST_KEY, SETTINGS_KEY, CLEAR_LOG_KEY, DEFAULT_SETTINGS } from "~store"
import type { DomainList, CookieStats, Settings as SettingsType, ClearLog as ClearLogType, Cookie } from "~types"
import { CookieClearType, ThemeMode, LogRetention, ModeType } from "~types"
import "./style.css"

function IndexPopup() {
  const [currentDomain, setCurrentDomain] = useState("")
  const [activeTab, setActiveTab] = useState("manage")
  const [message, setMessage] = useState({ text: "", isError: false, visible: false })
  const [stats, setStats] = useState<CookieStats>({ total: 0, current: 0, session: 0, persistent: 0 })
  const [currentCookies, setCurrentCookies] = useState<Cookie[]>([])
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.AUTO)

  const [whitelist, setWhitelist] = useStorage<DomainList>(WHITELIST_KEY, [])
  const [blacklist, setBlacklist] = useStorage<DomainList>(BLACKLIST_KEY, [])
  const [settings] = useStorage<SettingsType>(SETTINGS_KEY, DEFAULT_SETTINGS)
  const [logs, setLogs] = useStorage<ClearLogType[]>(CLEAR_LOG_KEY, [])

  useEffect(() => {
    async function init() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url) {
        try {
          const url = new URL(tab.url)
          setCurrentDomain(url.hostname)
        } catch (e) {
          setCurrentDomain("")
        }
      }
      updateStats()
      applyTheme()
      
      if (settings.cleanupOnStartup) {
        await cleanupStartup()
      }
      
      if (settings.cleanupExpiredCookies) {
        await cleanupExpiredCookies()
      }
    }
    init()

    if (activeTab === "whitelist" && settings.mode === ModeType.BLACKLIST) {
      setActiveTab("manage")
    } else if (activeTab === "blacklist" && settings.mode === ModeType.WHITELIST) {
      setActiveTab("manage")
    }

    const cookieListener = () => updateStats()
    chrome.cookies.onChanged.addListener(cookieListener)

    return () => {
      chrome.cookies.onChanged.removeListener(cookieListener)
    }
  }, [currentDomain, blacklist, whitelist, settings, activeTab])

  useEffect(() => {
    const handleClearBlacklist = async () => {
      const cookies = await chrome.cookies.getAll({})
      let count = 0
      for (const cookie of cookies) {
        const cookieDomain = cookie.domain.replace(/^\./, '')
        if (blacklist.some(b => cookieDomain.includes(b) || b.includes(cookieDomain))) {
          const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`
          await chrome.cookies.remove({ url, name: cookie.name })
          count++
        }
      }
      if (count > 0) {
        addLog("黑名单清除", CookieClearType.ALL, count)
        showMessage(`已清除黑名单网站的 ${count} 个Cookie`)
        updateStats()
      } else {
        showMessage("黑名单网站暂无Cookie可清除")
      }
    }

    window.addEventListener('clear-blacklist', handleClearBlacklist)
    return () => window.removeEventListener('clear-blacklist', handleClearBlacklist)
  }, [blacklist, logs])

  const applyTheme = () => {
    const themeMode = settings.themeMode
    if (themeMode === ThemeMode.AUTO) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(isDark ? ThemeMode.DARK : ThemeMode.LIGHT)
    } else {
      setTheme(themeMode)
    }
  }

  const updateStats = async () => {
    const cookies = await chrome.cookies.getAll({})
    const currentCookiesList = cookies.filter(c => 
      c.domain.includes(currentDomain) || currentDomain.includes(c.domain.replace(/^\./, ''))
    )
    const sessionCookies = currentCookiesList.filter(c => !c.expirationDate)
    const persistentCookies = currentCookiesList.filter(c => c.expirationDate)
    
    setStats({ 
      total: cookies.length, 
      current: currentCookiesList.length,
      session: sessionCookies.length,
      persistent: persistentCookies.length
    })
    setCurrentCookies(currentCookiesList)
  }

  const showMessage = (text: string, isError = false) => {
    setMessage({ text, isError, visible: true })
    setTimeout(() => setMessage(prev => ({ ...prev, visible: false })), 3000)
  }

  const addLog = (domain: string, cookieType: CookieClearType, count: number) => {
    const newLog: ClearLogType = {
      id: Date.now().toString(),
      domain,
      cookieType,
      count,
      timestamp: Date.now()
    }
    
    const now = Date.now()
    let retentionMs = Infinity
    if (settings.logRetention === LogRetention.ONE_HOUR) {
      retentionMs = 1 * 60 * 60 * 1000
    } else if (settings.logRetention === LogRetention.SIX_HOURS) {
      retentionMs = 6 * 60 * 60 * 1000
    } else if (settings.logRetention === LogRetention.TWELVE_HOURS) {
      retentionMs = 12 * 60 * 60 * 1000
    } else if (settings.logRetention === LogRetention.ONE_DAY) {
      retentionMs = 1 * 24 * 60 * 60 * 1000
    } else if (settings.logRetention === LogRetention.THREE_DAYS) {
      retentionMs = 3 * 24 * 60 * 60 * 1000
    } else if (settings.logRetention === LogRetention.SEVEN_DAYS) {
      retentionMs = 7 * 24 * 60 * 60 * 1000
    } else if (settings.logRetention === LogRetention.TEN_DAYS) {
      retentionMs = 10 * 24 * 60 * 60 * 1000
    } else if (settings.logRetention === LogRetention.THIRTY_DAYS) {
      retentionMs = 30 * 24 * 60 * 60 * 1000
    }
    
    const filteredLogs = logs.filter(log => now - log.timestamp <= retentionMs)
    setLogs([newLog, ...filteredLogs])
  }

  const clearCookies = async (filterFn: (domain: string) => boolean, successMsg: string, logType: CookieClearType) => {
    const cookies = await chrome.cookies.getAll({})
    let count = 0
    let clearedDomains = new Set<string>()

    for (const cookie of cookies) {
      const cookieDomain = cookie.domain.replace(/^\./, '')
      if (filterFn(cookieDomain)) {
        let shouldClear = false
        
        if (settings.mode === ModeType.WHITELIST) {
          // 白名单模式：不是白名单内的网站才清理
          const isWhitelisted = whitelist.some(w => cookieDomain.includes(w) || w.includes(cookieDomain))
          shouldClear = !isWhitelisted
        } else if (settings.mode === ModeType.BLACKLIST) {
          // 黑名单模式：只有黑名单内的网站才清理
          const isBlacklisted = blacklist.some(b => cookieDomain.includes(b) || b.includes(cookieDomain))
          shouldClear = isBlacklisted
        }
        
        if (shouldClear) {
          const isSession = !cookie.expirationDate
          if (logType === CookieClearType.ALL || 
             (logType === CookieClearType.SESSION && isSession) ||
             (logType === CookieClearType.PERSISTENT && !isSession)) {
            
            const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`
            await chrome.cookies.remove({ url, name: cookie.name })
            count++
            clearedDomains.add(cookieDomain)
          }
        }
      }
    }

    if (count > 0) {
      addLog(successMsg.includes("所有") ? "所有网站" : currentDomain, logType, count)
    }

    if (settings.clearCache && currentDomain) {
      try {
        await chrome.browsingData.remove(
          { origins: [`http://${currentDomain}`, `https://${currentDomain}`] },
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

    showMessage(`${successMsg} ${count} 个Cookie`)
    updateStats()
  }

  const cleanupStartup = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url) {
      try {
        const url = new URL(tab.url)
        const domain = url.hostname
        
        const cookies = await chrome.cookies.getAll({})
        let count = 0
        for (const cookie of cookies) {
          const cookieDomain = cookie.domain.replace(/^\./, '')
          if (cookieDomain.includes(domain) || domain.includes(cookieDomain)) {
            const cookieUrl = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`
            await chrome.cookies.remove({ url: cookieUrl, name: cookie.name })
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
        
        if (count > 0) {
          addLog("启动清理", CookieClearType.ALL, count)
        }
      } catch (e) {
        console.error("Failed to cleanup on startup:", e)
      }
    }
  }

  const cleanupExpiredCookies = async () => {
    const cookies = await chrome.cookies.getAll({})
    const now = Date.now()
    let count = 0
    
    for (const cookie of cookies) {
      if (cookie.expirationDate && cookie.expirationDate * 1000 < now) {
        const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`
        await chrome.cookies.remove({ url, name: cookie.name })
        count++
      }
    }
    
    if (count > 0) {
      addLog("过期 Cookie 清理", CookieClearType.ALL, count)
      showMessage(`已清理 ${count} 个过期 Cookie`)
    } else {
      showMessage("没有找到过期的 Cookie")
    }
    
    updateStats()
  }

  const quickAddToWhitelist = () => {
    if (currentDomain && !whitelist.includes(currentDomain)) {
      setWhitelist([...whitelist, currentDomain])
      showMessage(`已添加 ${currentDomain} 到白名单`)
    } else if (currentDomain) {
      showMessage(`${currentDomain} 已在白名单中`)
    }
  }

  const quickAddToBlacklist = () => {
    if (currentDomain && !blacklist.includes(currentDomain)) {
      setBlacklist([...blacklist, currentDomain])
      showMessage(`已添加 ${currentDomain} 到黑名单`)
    } else if (currentDomain) {
      showMessage(`${currentDomain} 已在黑名单中`)
    }
  }

  const quickClearCurrent = () => {
    if (confirm(`确定要清除 ${currentDomain} 的Cookie吗？`)) {
      clearCookies(
        d => d.includes(currentDomain) || currentDomain.includes(d),
        `已清除 ${currentDomain}`,
        settings.clearType
      )
    }
  }

  const quickClearAll = () => {
    if (confirm("确定要清除所有Cookie吗？（白名单除外）")) {
      clearCookies(() => true, "已清除", settings.clearType)
    }
  }

  return (
    <div className={`container theme-${theme}`}>
      <header>
        <h1>🍪 Cookie Manager Pro</h1>
      </header>

      <div className="tabs">
        {["manage", settings.mode === ModeType.WHITELIST ? "whitelist" : "blacklist", "settings", "log"].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}>
            {tab === "manage" ? "管理" : tab === "whitelist" ? "白名单" : tab === "blacklist" ? "黑名单" : tab === "settings" ? "设置" : "日志"}
          </button>
        ))}
      </div>

      {activeTab === "manage" && (
        <div className="tab-content">
          <div className="section">
            <h3>当前网站</h3>
            <div className="domain-info">{currentDomain || "无法获取域名"}</div>
          </div>

          <div className="section">
            <h3>Cookie统计</h3>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">总数:</span>
                <span className="stat-value">{stats.total}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">当前网站:</span>
                <span className="stat-value">{stats.current}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">会话:</span>
                <span className="stat-value">{stats.session}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">持久:</span>
                <span className="stat-value">{stats.persistent}</span>
              </div>
            </div>
          </div>

          <div className="section">
            <h3>快速操作</h3>
            <div className="button-group">
              <button onClick={quickAddToWhitelist} className="btn btn-primary">
                添加到白名单
              </button>
              <button onClick={quickAddToBlacklist} className="btn btn-secondary">
                添加到黑名单
              </button>
              <button onClick={quickClearCurrent} className="btn btn-warning">
                清除当前网站
              </button>
              <button onClick={quickClearAll} className="btn btn-danger">
                清除所有Cookie
              </button>
            </div>
          </div>

          <CookieList cookies={currentCookies} />
        </div>
      )}

      {activeTab === "whitelist" && (
        <div className="tab-content">
          <DomainManager
            type="whitelist"
            currentDomain={currentDomain}
            onMessage={showMessage}
          />
        </div>
      )}

      {activeTab === "blacklist" && (
        <div className="tab-content">
          <DomainManager
            type="blacklist"
            currentDomain={currentDomain}
            onMessage={showMessage}
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

      {message.visible && (
        <div className={`message ${message.isError ? "error" : ""}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}

export default IndexPopup
