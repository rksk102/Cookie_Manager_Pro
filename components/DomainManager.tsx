import { useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { WHITELIST_KEY, BLACKLIST_KEY } from "~store"
import type { DomainList } from "~types"

interface Props {
  type: "whitelist" | "blacklist"
  currentDomain: string
  onMessage: (msg: string) => void
}

export const DomainManager = ({ type, currentDomain, onMessage }: Props) => {
  const [inputValue, setInputValue] = useState("")
  const [list, setList] = useStorage<DomainList>(
    type === "whitelist" ? WHITELIST_KEY : BLACKLIST_KEY,
    []
  )

  const addDomain = (domain: string) => {
    const trimmed = domain.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
      setInputValue("")
      onMessage(`已添加到${type === "whitelist" ? "白名单" : "黑名单"}`)
    }
  }

  const removeDomain = (domain: string) => {
    setList(list.filter((d) => d !== domain))
    onMessage("已删除")
  }

  return (
    <div className="section">
      <h3>{type === "whitelist" ? "白名单域名" : "黑名单域名"}</h3>
      <p className="help-text">
        {type === "whitelist" 
          ? "白名单中的域名Cookie不会被清除" 
          : "黑名单中的域名Cookie将被优先清除"}
      </p>
      <div className="input-group">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="例如: google.com"
        />
        <button onClick={() => addDomain(inputValue)} className="btn btn-primary">
          添加
        </button>
      </div>
      <button
        onClick={() => addDomain(currentDomain)}
        className="btn btn-secondary"
        disabled={!currentDomain}>
        添加当前网站
      </button>
      {type === "blacklist" && (
        <button 
          onClick={() => {
            // 这里需要调用清除黑名单的逻辑，可以通过 props 传递或使用自定义事件
            const event = new CustomEvent('clear-blacklist');
            window.dispatchEvent(event);
          }}
          className="btn btn-danger" 
          style={{ marginTop: '8px' }}>
          清除黑名单Cookie
        </button>
      )}
      <ul className="domain-list">
        {list.map((domain) => (
          <li key={domain}>
            <span>{domain}</span>
            <button
              className="remove-btn"
              onClick={() => removeDomain(domain)}>
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
