import { useState, memo, useMemo } from "react";
import type { Cookie } from "~types";
import { COOKIE_VALUE_MASK } from "~constants";
import {
  assessCookieRisk,
  getRiskLevelColor,
  getRiskLevelText,
  clearSingleCookie,
  editCookie,
  normalizeDomain,
  maskCookieValue,
  getCookieKey,
  toggleSetValue,
} from "~utils";
import { CookieEditor } from "./CookieEditor";

interface Props {
  cookies: Cookie[];
  currentDomain?: string;
  onUpdate?: () => void;
  onMessage?: (msg: string, isError?: boolean) => void;
}

export const CookieList = memo(({ cookies, currentDomain, onUpdate, onMessage }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [selectedCookies, setSelectedCookies] = useState<Set<string>>(new Set());
  const [showEditor, setShowEditor] = useState(false);
  const [editingCookie, setEditingCookie] = useState<Cookie | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const groupedCookies = useMemo(() => {
    const grouped = new Map<string, Cookie[]>();
    for (const cookie of cookies) {
      const domain = normalizeDomain(cookie.domain);
      if (!grouped.has(domain)) {
        grouped.set(domain, []);
      }
      const domainCookies = grouped.get(domain);
      if (domainCookies) {
        domainCookies.push(cookie);
      }
    }
    return grouped;
  }, [cookies]);

  const toggleValueVisibility = (key: string) => {
    setVisibleValues((prev) => toggleSetValue(prev, key));
  };

  const toggleCookieSelection = (key: string) => {
    setSelectedCookies((prev) => toggleSetValue(prev, key));
  };

  const toggleDomainExpansion = (domain: string) => {
    setExpandedDomains((prev) => toggleSetValue(prev, domain));
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedCookies(new Set());
    } else {
      const allKeys = new Set<string>();
      for (const cookie of cookies) {
        allKeys.add(getCookieKey(cookie.name, cookie.domain));
      }
      setSelectedCookies(allKeys);
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteCookie = async (cookie: Cookie, _index: number) => {
    try {
      const cleanedDomain = cookie.domain.replace(/^\./, "");
      const success = await clearSingleCookie(
        cookie as unknown as chrome.cookies.Cookie,
        cleanedDomain
      );
      if (success) {
        onMessage?.(`已删除 Cookie: ${cookie.name}`);
        onUpdate?.();
      } else {
        onMessage?.("删除 Cookie 失败", true);
      }
    } catch (e) {
      console.error("Failed to delete cookie:", e);
      onMessage?.("删除 Cookie 失败", true);
    }
  };

  const handleEditCookie = (cookie: Cookie) => {
    setEditingCookie(cookie);
    setShowEditor(true);
  };

  const handleSaveCookie = async (updatedCookie: Cookie) => {
    try {
      if (editingCookie) {
        const success = await editCookie(
          editingCookie as unknown as chrome.cookies.Cookie,
          updatedCookie as Partial<chrome.cookies.Cookie>
        );
        if (success) {
          onMessage?.("Cookie 已更新");
          onUpdate?.();
        } else {
          onMessage?.("更新 Cookie 失败", true);
        }
      }
    } catch (e) {
      console.error("Failed to save cookie:", e);
      onMessage?.("更新 Cookie 失败", true);
    }
  };

  const handleDeleteSelected = async () => {
    let deleted = 0;
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const key = getCookieKey(cookie.name, cookie.domain);
      if (selectedCookies.has(key)) {
        try {
          const cleanedDomain = cookie.domain.replace(/^\./, "");
          const success = await clearSingleCookie(
            cookie as unknown as chrome.cookies.Cookie,
            cleanedDomain
          );
          if (success) deleted++;
        } catch (e) {
          console.error("Failed to delete cookie:", e);
        }
      }
    }
    if (deleted > 0) {
      onMessage?.(`已删除 ${deleted} 个 Cookie`);
      setSelectedCookies(new Set());
      setSelectAll(false);
      onUpdate?.();
    }
  };

  const handleAddToWhitelist = () => {
    const domains = new Set<string>();
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const key = getCookieKey(cookie.name, cookie.domain);
      if (selectedCookies.has(key)) {
        domains.add(normalizeDomain(cookie.domain));
      }
    }
    onMessage?.(`准备添加 ${domains.size} 个域名到白名单`);
  };

  const handleAddToBlacklist = () => {
    const domains = new Set<string>();
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const key = getCookieKey(cookie.name, cookie.domain);
      if (selectedCookies.has(key)) {
        domains.add(normalizeDomain(cookie.domain));
      }
    }
    onMessage?.(`准备添加 ${domains.size} 个域名到黑名单`);
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
        <h3>
          <span aria-hidden="true">🍪</span> Cookie 详情 ({cookies.length})
        </h3>
        <span className={`expand-icon ${isExpanded ? "expanded" : ""}`} aria-hidden="true">
          ▼
        </span>
      </button>

      {isExpanded && (
        <>
          {selectedCookies.size > 0 && (
            <div className="batch-actions">
              <span className="batch-count">{selectedCookies.size} 个已选中</span>
              <div className="batch-buttons">
                <button onClick={handleDeleteSelected} className="btn btn-danger btn-sm">
                  删除选中
                </button>
                <button onClick={handleAddToWhitelist} className="btn btn-success btn-sm">
                  加入白名单
                </button>
                <button onClick={handleAddToBlacklist} className="btn btn-secondary btn-sm">
                  加入黑名单
                </button>
              </div>
            </div>
          )}

          <div className="select-all-row">
            <label className="checkbox-label">
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              <span>全选</span>
            </label>
          </div>

          <div className="cookie-list">
            {Array.from(groupedCookies.entries()).map(([domain, domainCookies]) => (
              <div key={domain} className="cookie-domain-group">
                <button
                  type="button"
                  className="domain-group-header"
                  onClick={() => toggleDomainExpansion(domain)}
                >
                  <span className="domain-name">🌐 {domain}</span>
                  <span className="domain-count">({domainCookies.length})</span>
                  <span className={`expand-icon ${expandedDomains.has(domain) ? "expanded" : ""}`}>
                    ▼
                  </span>
                </button>

                {expandedDomains.has(domain) && (
                  <div className="domain-cookies">
                    {domainCookies.map((cookie, _index) => {
                      const key = getCookieKey(cookie.name, cookie.domain);
                      const isVisible = visibleValues.has(key);
                      const displayValue = isVisible
                        ? cookie.value
                        : maskCookieValue(cookie.value, COOKIE_VALUE_MASK);
                      const risk = assessCookieRisk(cookie, currentDomain);
                      const isSelected = selectedCookies.has(key);

                      return (
                        <div key={key} className={`cookie-item ${isSelected ? "selected" : ""}`}>
                          <div className="cookie-header">
                            <label className="checkbox-label cookie-checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCookieSelection(key)}
                              />
                            </label>
                            <div className="cookie-name">
                              <strong>{cookie.name}</strong>
                              <span className="cookie-domain">{cookie.domain}</span>
                            </div>
                            <div className="cookie-actions">
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => handleEditCookie(cookie)}
                                aria-label="编辑"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="action-btn action-btn-danger"
                                onClick={() => handleDeleteCookie(cookie, cookies.indexOf(cookie))}
                                aria-label="删除"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <div
                            className="risk-badge"
                            style={{ borderLeftColor: getRiskLevelColor(risk.level) }}
                          >
                            <span
                              className="risk-level"
                              style={{ color: getRiskLevelColor(risk.level) }}
                            >
                              {getRiskLevelText(risk.level)}
                            </span>
                            <span className="risk-reason">{risk.reason}</span>
                          </div>

                          <div className="cookie-details">
                            <div className="cookie-detail-row">
                              <span className="detail-label">值:</span>
                              <span className="detail-value">
                                {displayValue}
                                <button
                                  type="button"
                                  className="value-toggle-btn"
                                  onClick={() => toggleValueVisibility(key)}
                                  aria-label={isVisible ? "隐藏" : "显示"}
                                >
                                  {isVisible ? "👁️" : "👁️‍🗨️"}
                                </button>
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
            ))}
          </div>
        </>
      )}

      <CookieEditor
        isOpen={showEditor}
        cookie={editingCookie}
        onClose={() => setShowEditor(false)}
        onSave={handleSaveCookie}
      />
    </div>
  );
});

CookieList.displayName = "CookieList";
