import { useState, memo } from "react";
import type { Cookie } from "~types";
import { SENSITIVE_COOKIE_KEYWORDS, COOKIE_VALUE_MASK } from "~constants";

interface Props {
  cookies: Cookie[];
}

const isSensitiveCookie = (cookie: Cookie): boolean => {
  const lowerName = cookie.name.toLowerCase();
  return SENSITIVE_COOKIE_KEYWORDS.some((keyword) => lowerName.includes(keyword));
};

const maskCookieValue = (value: string): string => {
  if (value.length <= 8) return COOKIE_VALUE_MASK;
  return value.substring(0, 4) + COOKIE_VALUE_MASK.substring(4);
};

export const CookieList = memo(({ cookies }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());

  const toggleValueVisibility = (cookieKey: string) => {
    setVisibleValues((prev) => {
      const next = new Set(prev);
      if (next.has(cookieKey)) {
        next.delete(cookieKey);
      } else {
        next.add(cookieKey);
      }
      return next;
    });
  };

  if (cookies.length === 0) {
    return (
      <div className="cookie-list-empty">
        <p>当前网站暂无 Cookie</p>
      </div>
    );
  }

  return (
    <div className="cookie-list-container">
      <button
        type="button"
        className="cookie-list-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <h3>Cookie 详情 ({cookies.length})</h3>
        <span className={`expand-icon ${isExpanded ? "expanded" : ""}`}>▼</span>
      </button>

      {isExpanded && (
        <div className="cookie-list">
          {cookies.map((cookie, index) => {
            const cookieKey = `${cookie.name}-${index}`;
            const isSensitive = isSensitiveCookie(cookie);
            const isVisible = visibleValues.has(cookieKey);
            const displayValue = isVisible ? cookie.value : maskCookieValue(cookie.value);

            return (
              <div key={cookieKey} className="cookie-item">
                <div className="cookie-name">
                  <strong>{cookie.name}</strong>
                  <span className="cookie-domain">{cookie.domain}</span>
                </div>
                <div className="cookie-details">
                  <div className="cookie-detail-row">
                    <span className="detail-label">值:</span>
                    <span className="detail-value">
                      {displayValue}
                      {isSensitive && (
                        <button
                          type="button"
                          className="value-toggle-btn"
                          onClick={() => toggleValueVisibility(cookieKey)}
                          aria-label={isVisible ? "隐藏" : "显示"}
                        >
                          {isVisible ? "👁️" : "👁️‍🗨️"}
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="cookie-detail-row">
                    <span className="detail-label">路径:</span>
                    <span className="detail-value">{cookie.path}</span>
                  </div>
                  <div className="cookie-detail-row">
                    <span className="detail-label">安全:</span>
                    <span className="detail-value">{cookie.secure ? "是" : "否"}</span>
                  </div>
                  <div className="cookie-detail-row">
                    <span className="detail-label">仅 HTTP:</span>
                    <span className="detail-value">{cookie.httpOnly ? "是" : "否"}</span>
                  </div>
                  <div className="cookie-detail-row">
                    <span className="detail-label">SameSite:</span>
                    <span className="detail-value">{cookie.sameSite || "未设置"}</span>
                  </div>
                  {cookie.expirationDate && (
                    <div className="cookie-detail-row">
                      <span className="detail-label">过期时间:</span>
                      <span className="detail-value">
                        {new Date(cookie.expirationDate * 1000).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

CookieList.displayName = "CookieList";
