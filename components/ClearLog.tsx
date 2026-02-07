import { useStorage } from "@plasmohq/storage/hook"
import { CLEAR_LOG_KEY, SETTINGS_KEY } from "~store"
import type { ClearLog, Settings } from "~types"
import { CookieClearType, LogRetention, ThemeMode, ModeType } from "~types"

interface Props {
  onMessage: (msg: string) => void
}

export const ClearLog = ({ onMessage }: Props) => {
  const [logs, setLogs] = useStorage<ClearLog[]>(CLEAR_LOG_KEY, [])
  const [settings] = useStorage<Settings>(SETTINGS_KEY, {
    clearType: CookieClearType.ALL,
    logRetention: LogRetention.SEVEN_DAYS,
    themeMode: ThemeMode.AUTO,
    mode: ModeType.WHITELIST,
    clearLocalStorage: false,
    clearIndexedDB: false,
    clearCache: false,
    enableAutoCleanup: false,
    cleanupOnTabDiscard: false,
    cleanupOnStartup: false,
    cleanupExpiredCookies: false
  })

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCookieTypeName = (type: string) => {
    switch (type) {
      case 'session':
        return '会话Cookie'
      case 'persistent':
        return '持久Cookie'
      default:
        return '所有Cookie'
    }
  }

  const clearAllLogs = () => {
    if (confirm("确定要清除所有日志记录吗？")) {
      setLogs([])
      onMessage("已清除所有日志")
    }
  }

  const clearOldLogs = () => {
    const now = Date.now()
    let retentionMs: number
    switch (settings.logRetention) {
      case '1hour':
        retentionMs = 1 * 60 * 60 * 1000
        break
      case '6hours':
        retentionMs = 6 * 60 * 60 * 1000
        break
      case '12hours':
        retentionMs = 12 * 60 * 60 * 1000
        break
      case '1day':
        retentionMs = 1 * 24 * 60 * 60 * 1000
        break
      case '3days':
        retentionMs = 3 * 24 * 60 * 60 * 1000
        break
      case '7days':
        retentionMs = 7 * 24 * 60 * 60 * 1000
        break
      case '10days':
        retentionMs = 10 * 24 * 60 * 60 * 1000
        break
      case '30days':
        retentionMs = 30 * 24 * 60 * 60 * 1000
        break
      default:
        return
    }
    const filteredLogs = logs.filter(log => now - log.timestamp <= retentionMs)
    if (filteredLogs.length < logs.length) {
      setLogs(filteredLogs)
      onMessage(`已清除 ${logs.length - filteredLogs.length} 条过期日志`)
    }
  }

  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="log-container">
      <div className="section">
        <div className="log-header">
          <h3>清除日志</h3>
          <div className="log-actions">
            <button onClick={clearOldLogs} className="btn btn-secondary">
              清除过期
            </button>
            <button onClick={clearAllLogs} className="btn btn-danger">
              清除全部
            </button>
          </div>
        </div>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="empty-log">
          <p>暂无清除日志记录</p>
        </div>
      ) : (
        <ul className="log-list">
          {sortedLogs.map((log) => (
            <li key={log.id} className="log-item">
              <div className="log-info">
                <div className="log-domain">{log.domain}</div>
                <div className="log-details">
                  <span className="log-type">{getCookieTypeName(log.cookieType)}</span>
                  <span className="log-count">{log.count} 个</span>
                  <span className="log-time">{formatTime(log.timestamp)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}