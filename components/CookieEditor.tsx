import { useState } from "react";
import type { Cookie, SameSite } from "~types";

interface Props {
  isOpen: boolean;
  cookie: Cookie | null;
  onClose: () => void;
  onSave: (cookie: Cookie) => void;
}

const DEFAULT_COOKIE: Cookie = {
  name: "",
  value: "",
  domain: "",
  path: "/",
  secure: false,
  httpOnly: false,
  sameSite: "unspecified",
};

const CookieEditorContent = ({ cookie, onClose, onSave }: Omit<Props, "isOpen">) => {
  const [formData, setFormData] = useState<Cookie>(() =>
    cookie ? { ...cookie } : { ...DEFAULT_COOKIE }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClose();
    }
  };

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="confirm-overlay"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={handleOverlayKeyDown}
    >
      <div
        className="confirm-dialog cookie-editor-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="confirm-title">{cookie ? "编辑 Cookie" : "新建 Cookie"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="cookie-name">
              名称
            </label>
            <input
              id="cookie-name"
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cookie-value">
              值
            </label>
            <textarea
              id="cookie-value"
              className="form-textarea"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cookie-domain">
              域名
            </label>
            <input
              id="cookie-domain"
              type="text"
              className="form-input"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cookie-path">
              路径
            </label>
            <input
              id="cookie-path"
              type="text"
              className="form-input"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cookie-expiration">
              过期时间（Unix 时间戳，可选）
            </label>
            <input
              id="cookie-expiration"
              type="number"
              className="form-input"
              value={formData.expirationDate || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expirationDate: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="留空表示会话 Cookie"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cookie-samesite">
              SameSite
            </label>
            <select
              id="cookie-samesite"
              className="select-input"
              value={formData.sameSite}
              onChange={(e) => setFormData({ ...formData, sameSite: e.target.value as SameSite })}
            >
              <option value="unspecified">未设置</option>
              <option value="strict">Strict</option>
              <option value="lax">Lax</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.secure}
                onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
              />
              <span>Secure（仅 HTTPS）</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.httpOnly}
                onChange={(e) => setFormData({ ...formData, httpOnly: e.target.checked })}
              />
              <span>HttpOnly（禁止 JavaScript 访问）</span>
            </label>
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CookieEditor = ({ isOpen, cookie, onClose, onSave }: Props) => {
  if (!isOpen) return null;

  return (
    <CookieEditorContent
      key={cookie ? `edit-${cookie.domain}-${cookie.name}` : "new"}
      cookie={cookie}
      onClose={onClose}
      onSave={onSave}
    />
  );
};
