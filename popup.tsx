import { useEffect, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { DomainManager } from "~components/DomainManager"
import { Settings } from "~components/Settings"
import { ClearLog } from "~components/ClearLog"
import { CookieList } from "~components/CookieList"
import { WHITELIST_KEY, BLACKLIST_KEY, SETTINGS_KEY, CLEAR_LOG_KEY, DEFAULT_SETTINGS } from "~store"
import type { DomainList, CookieStats, Settings as SettingsType, ClearLog as ClearLogType, Cookie } from "~types"
import { CookieClearType, ThemeMode, LogRetention, ModeType, isDomainMatch, isInList } from "~types"
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
  }, [currentDomain])

  useEffect(() => {
    const handleClearBlacklist = async () => {
      const cookies = await chrome.cookies.getAll({})
      let count = 0
      let clearedDomains = new Set<string>()
      
      for (const cookie of cookies) {
        const cookieDomain = cookie.domain.replace(/^\./, '')
        if (isInList(cookieDomain, blacklist)) {
          const cleanDomain = cookie.domain.replace(/^\./, '')
          const url = `http${cookie.secure ? 's' : ''}://${cleanDomain}${cookie.path}`
          await chrome.cookies.remove({ url, name: cookie.name })
          count++
          clearedDomains.add(cookieDomain)
        }
      }
      
      if (count > 0) {
        const domainStr = clearedDomains.size === 1 ? Array.from(clearedDomains)[0] : 
                         clearedDomains.size > 1 ? `${Array.from(clearedDomains)[0]} 等${clearedDomains.size}个域名` : 
                         "黑名单网站"
        addLog(domainStr, CookieClearType.ALL, count)
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
    const currentCookiesList = cookies.filter(c => isDomainMatch(c.domain, currentDomain))
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

  const showSuccess = (text: string) => showMessage(text, false)
  const showError = (text: string) => showMessage(text, true)

  const addLog = (domain: string, cookieType: CookieClearType, count: number) => {
    const newLog: ClearLogType = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      domain,
      cookieType,
      count,
      timestamp: Date.now()
    }
    
    if (settings.logRetention === LogRetention.FOREVER) {
      setLogs([newLog, ...logs])
      return
    }
    
    const now = Date.now()
    const retentionMap: Record<string, number> = {
      [LogRetention.ONE_HOUR]: 1 * 60 * 60 * 1000,
      [LogRetention.SIX_HOURS]: 6 * 60 * 60 * 1000,
      [LogRetention.TWELVE_HOURS]: 12 * 60 * 60 * 1000,
      [LogRetention.ONE_DAY]: 1 * 24 * 60 * 60 * 1000,
      [LogRetention.THREE_DAYS]: 3 * 24 * 60 * 60 * 1000,
      [LogRetention.SEVEN_DAYS]: 7 * 24 * 60 * 60 * 1000,
      [LogRetention.TEN_DAYS]: 10 * 24 * 60 * 60 * 1000,
      [LogRetention.THIRTY_DAYS]: 30 * 24 * 60 * 60 * 1000
    }
    
    const retentionMs = retentionMap[settings.logRetention] || 7 * 24 * 60 * 60 * 1000
    const filteredLogs = logs.filter(log => now - log.timestamp <= retentionMs)
    setLogs([newLog, ...filteredLogs])
  }

  const clearCookies = async (filterFn: (domain: string) => boolean, successMsg: string, logType: CookieClearType) => {
    const cookies = await chrome.cookies.getAll({})
    let count = 0
    let clearedDomains = new Set<string>()

    for (const cookie of cookies) {
      const cookieDomain = cookie.domain.replace(/^\./, '')
      if (!filterFn(cookieDomain)) continue

      let shouldClear = false
      if (settings.mode === ModeType.WHITELIST) {
        shouldClear = !isInList(cookieDomain, whitelist)
      } else if (settings.mode === ModeType.BLACKLIST) {
        shouldClear = isInList(cookieDomain, blacklist)
      }
      
      if (!shouldClear) continue

      const isSession = !cookie.expirationDate
      if (logType === CookieClearType.ALL || 
          (logType === CookieClearType.SESSION && isSession) ||
          (logType === CookieClearType.PERSISTENT && !isSession)) {
        
        const cleanDomain = cookie.domain.replace(/^\./, '')
        const url = `http${cookie.secure ? 's' : ''}://${cleanDomain}${cookie.path}`
        await chrome.cookies.remove({ url, name: cookie.name })
        count++
        clearedDomains.add(cookieDomain)
      }
    }

    if (count > 0) {
      const domainStr = clearedDomains.size === 1 ? Array.from(clearedDomains)[0] : 
                       clearedDomains.size > 1 ? `${Array.from(clearedDomains)[0]} 等${clearedDomains.size}个域名` : 
                       successMsg.includes("所有") ? "所有网站" : currentDomain
      addLog(domainStr, logType, count)
    }

    if (settings.clearCache && clearedDomains.size > 0) {
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

    if (settings.clearLocalStorage && clearedDomains.size > 0) {
      try {
        const origins: string[] = []
        clearedDomains.forEach(d => {
          origins.push(`http://${d}`, `https://${d}`)
        })
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

    if (settings.clearIndexedDB && clearedDomains.size > 0) {
      try {
        const origins: string[] = []
        clearedDomains.forEach(d => {
          origins.push(`http://${d}`, `https://${d}`)
        })
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

    showMessage(`${successMsg} ${count} 个Cookie`)
    updateStats()
  }

  const cleanupStartup = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url) {
      try {
        const url = new URL(tab.url)
        const domain = url.hostname
        
        if (settings.mode === ModeType.WHITELIST && isInList(domain, whitelist)) {
          return
        }
        if (settings.mode === ModeType.BLACKLIST && !isInList(domain, blacklist)) {
          return
        }
        
        const cookies = await chrome.cookies.getAll({})
        let count = 0
        let clearedDomains = new Set<string>()
        
        for (const cookie of cookies) {
          if (!isDomainMatch(cookie.domain, domain)) continue

          const isSession = !cookie.expirationDate
          if (settings.clearType === CookieClearType.SESSION && !isSession) continue
          if (settings.clearType === CookieClearType.PERSISTENT && isSession) continue

          const cleanDomain = cookie.domain.replace(/^\./, '')
          const cookieUrl = `http${cookie.secure ? 's' : ''}://${cleanDomain}${cookie.path}`
          await chrome.cookies.remove({ url: cookieUrl, name: cookie.name })
          count++
          clearedDomains.add(cleanDomain)
        }
        
        if (settings.clearCache && clearedDomains.size > 0) {
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
        
        if (count > 0) {
          addLog("启动清理", settings.clearType, count)
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
        d => isDomainMatch(d, currentDomain),
        `已清除 ${currentDomain}`,
        settings.clearType
      )
    }
  }

  const quickClearAll = () => {
    if (confirm("确定要清除所有Cookie吗？（白名单除外）")) {
      clearCookies(() => true, "已清除所有网站", settings.clearType)
    }
  }

  return (
    <div className={`container theme-${theme}`}>
      <header>
        <h1>🍪 Cookie Manager Pro</h1>
      </header>

      <div className="tabs">
        {[
          { id: "manage", label: "管理", icon: "🏠" },
          { id: settings.mode === ModeType.WHITELIST ? "whitelist" : "blacklist", 
            label: settings.mode === ModeType.WHITELIST ? "白名单" : "黑名单", 
            icon: "📝" },
          { id: "settings", label: "设置", icon: "⚙️" },
          { id: "log", label: "日志", icon: "📋" }
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}>
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "manage" && (
        <div className="tab-content">
          <div className="section">
            <h3><span className="section-icon">🌐</span>当前网站</h3>
            <div className="domain-info">{currentDomain || "无法获取域名"}</div>
          </div>

          <div className="section">
            <h3><span className="section-icon">📊</span>Cookie统计</h3>
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
            <h3><span className="section-icon">⚡</span>快速操作</h3>
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

      <div className={`message ${message.isError ? "error" : ""} ${message.visible ? "visible" : ""}`}>
        {message.text}
      </div>
    </div>
  )
}

export default IndexPopup
