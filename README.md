# 🍪 Cookie Manager Pro

<div align="center">
  <img src="./assets/icon.png" alt="Cookie Manager Pro" width="120" height="120" />

  <p align="center">
    <strong>高级 Cookie 管理扩展</strong><br>
    智能白名单/黑名单管理，精准控制 Cookie 生命周期<br>
    基于 Plasmo 框架构建，完美兼容 Chrome/Edge 浏览器
  </p>

  <p align="center">
    <a href="#核心功能">核心功能</a> •
    <a href="#快速开始">快速开始</a> •
    <a href="#使用指南">使用指南</a> •
    <a href="#项目结构">项目结构</a> •
    <a href="#技术栈">技术栈</a>
  </p>
</div>

---

## ✨ 核心功能

### 🛡️ 双模式智能管理

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **白名单模式** | 仅白名单内网站保留 Cookie，其他自动清理 | 保护常用网站登录状态 |
| **黑名单模式** | 仅黑名单内网站清理 Cookie，其他保留 | 针对性清理特定网站 |

### 🍪 Cookie 精准控制

- **实时统计**：总数、当前网站、会话 Cookie、持久 Cookie 一目了然
- **详细信息**：查看 Cookie 名称、值、域名、路径、过期时间、安全属性
- **选择性清理**：全部 Cookie / 仅会话 Cookie / 仅持久 Cookie
- **过期清理**：一键清理所有已过期的 Cookie

### 🤖 自动化清理

- **标签页丢弃**：当标签页被丢弃时自动清理对应 Cookie
- **启动清理**：浏览器启动时自动清理当前标签页 Cookie
- **过期检测**：自动识别并清理过期 Cookie

### 🎨 个性化体验

- **三主题支持**：跟随系统 / 亮色模式 / 暗色模式
- **清理日志**：完整记录清理历史，支持按时间筛选
- **操作反馈**：即时消息提示，操作结果清晰可见

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 加载扩展

1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 启用「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `build/chrome-mv3-dev` 文件夹

### 构建发布

```bash
npm run build
npm run package
```

---

## 📁 项目结构

```
Cookie_Manager_Pro/
├── assets/                 # 静态资源
│   └── icon.png           # 扩展图标
├── components/            # React 组件
│   ├── ClearLog.tsx      # 清理日志
│   ├── CookieList.tsx    # Cookie 列表
│   ├── DomainManager.tsx # 域名管理
│   └── Settings.tsx      # 设置面板
├── types/                 # TypeScript 类型
│   └── index.ts          # 类型定义
├── background.ts          # Service Worker
├── popup.tsx             # 弹出窗口
├── store.ts              # 存储管理
├── style.css             # 全局样式
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 项目说明
```

---

## 🛠️ 技术栈

- **框架**: [Plasmo](https://www.plasmo.com/) - 现代浏览器扩展框架
- **前端**: React 18 + TypeScript
- **样式**: CSS Variables + 自定义设计系统
- **存储**: @plasmohq/storage
- **规范**: Manifest V3

---

## 🔒 权限说明

| 权限 | 用途 |
|------|------|
| `cookies` | 读取和管理浏览器 Cookie |
| `storage` | 存储设置和名单数据 |
| `tabs` | 获取当前标签页信息 |
| `browsingData` | 清理浏览器缓存数据 |

---

## 🌐 浏览器支持

- Chrome 90+
- Edge 90+

---

## ⚠️ 隐私声明

- 所有数据处理均在本地完成
- 不会收集或上传任何用户数据
- 严格遵循隐私优先原则

---

## 📄 许可证

MIT License

---

<div align="center">
  <p>Made with ❤️ for privacy-conscious users</p>
</div>
