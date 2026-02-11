import { useStorage } from "@plasmohq/storage/hook";
import { CLEAR_LOG_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, LOG_RETENTION_MAP } from "~store";
import type { ClearLogEntry, Settings } from "~types";
import { LogRetention } from "~types";
import { getCookieTypeName } from "~utils";
import { useMemo } from "react";

interface Props {
  onMessage: (msg: string) => void;
}

export const ClearLog = ({ onMessage }: Props) => {
  const [logs, setLogs] = useStorage<ClearLogEntry[]>(CLEAR_LOG_KEY, []);
  const [settings] = useStorage<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => b.timestamp - a.timestamp), [logs]);

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
  );
};
