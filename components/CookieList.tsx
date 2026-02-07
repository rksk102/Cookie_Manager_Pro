import { useState } from "react"

interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  httpOnly: boolean
  sameSite: string
  expirationDate?: number
  storeId?: string
}

interface Props {
  cookies: Cookie[]
}

export const CookieList = ({ cookies }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (cookies.length === 0) {
    return (
      <div className="cookie-list-empty">
        <p>当前网站暂无 Cookie</p>
      </div>
    )
  }

  return (
    <div className="cookie-list-container">
      <div className="cookie-list-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>Cookie 详情 ({cookies.length})</h3>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="cookie-list">
          {cookies.map((cookie, index) => (
            <div key={`${cookie.name}-${index}`} className="cookie-item">
              <div className="cookie-name">
                <strong>{cookie.name}</strong>
                <span className="cookie-domain">{cookie.domain}</span>
              </div>
              <div className="cookie-details">
                <div className="cookie-detail-row">
                  <span className="detail-label">值:</span>
                  <span className="detail-value">{cookie.value}</span>
                </div>
                <div className="cookie-detail-row">
                  <span className="detail-label">路径:</span>
                  <span className="detail-value">{cookie.path}</span>
                </div>
                <div className="cookie-detail-row">
                  <span className="detail-label">安全:</span>
                  <span className="detail-value">{cookie.secure ? '是' : '否'}</span>
                </div>
                <div className="cookie-detail-row">
                  <span className="detail-label">仅 HTTP:</span>
                  <span className="detail-value">{cookie.httpOnly ? '是' : '否'}</span>
                </div>
                <div className="cookie-detail-row">
                  <span className="detail-label">SameSite:</span>
                  <span className="detail-value">{cookie.sameSite || '未设置'}</span>
                </div>
                {cookie.expirationDate && (
                  <div className="cookie-detail-row">
                    <span className="detail-label">过期时间:</span>
                    <span className="detail-value">
                      {new Date(cookie.expirationDate * 1000).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
