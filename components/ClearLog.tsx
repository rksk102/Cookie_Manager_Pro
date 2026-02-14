import { useStorage } from "@plasmohq/storage/hook";
import { CLEAR_LOG_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, LOG_RETENTION_MAP } from "~store";
import type { ClearLogEntry, Settings } from "~types";
import { LogRetention } from "~types";
import { getCookieTypeName, getActionText, getActionColor, formatLogTime } from "~utils";
import { useMemo } from "react";

interface Props {
  onMessage: (msg: string) => void;
}

export const ClearLog = ({ onMessage }: Props) => {
  const [logs, setLogs] = useStorage<ClearLogEntry[]>(CLEAR_LOG_KEY, []);
  const [settings] = useStorage<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);

  const clearAllLogs = () => {
    if (confirm("确定要清除所有日志记录吗？")) {
      setLogs([]);
      onMessage("已清除所有日志");
    }
  };

  const clearOldLogs = () => {
    if (settings.logRetention === LogRetention.FOREVER) {
      onMessage("日志保留设置为永久，无需清理");
      return;
    }

    const now = Date.now();
    const retentionMs = LOG_RETENTION_MAP[settings.logRetention] || 7 * 24 * 60 * 60 * 1000;
    setLogs((prev) => {
      const currentPrev = prev ?? [];
      const filteredLogs = currentPrev.filter((log) => now - log.timestamp <= retentionMs);
      if (filteredLogs.length < currentPrev.length) {
        onMessage(`已清除 ${currentPrev.length - filteredLogs.length} 条过期日志`);
      } else {
        onMessage("没有需要清理的过期日志");
      }
      return filteredLogs;
    });
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cookie-manager-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onMessage("日志已导出");
  };

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => b.timestamp - a.timestamp), [logs]);

  return (
    <div className="log-container">
      <div className="section">
        <div className="log-header">
          <h3>清除日志</h3>
          <div className="log-actions">
            <button onClick={clearOldLogs} className="btn btn-secondary btn-sm">
              清除过期
            </button>
            <button onClick={exportLogs} className="btn btn-primary btn-sm">
              导出日志
            </button>
            <button onClick={clearAllLogs} className="btn btn-danger btn-sm">
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
                  <span
                    className="log-type"
                    style={{ backgroundColor: getActionColor(log.action) }}
                  >
                    {getActionText(log.action)}
                  </span>
                  <span className="log-type">{getCookieTypeName(log.cookieType)}</span>
                  <span className="log-count">{log.count} 个</span>
                  <span className="log-time">{formatLogTime(log.timestamp)}</span>
                </div>
                {log.details && <div className="log-details-text">{log.details}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
