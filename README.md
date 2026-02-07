# Cookie Manager Pro

高级 Cookie 管理扩展，支持白名单/黑名单功能和选择性 Cookie 清除，基于 Plasmo 框架构建。

## 项目结构

```
Cookie_Manager_Pro/
├── assets/              # 资源文件
│   └── icon.png         # 扩展图标
├── components/          # React 组件
│   ├── ClearLog.tsx     # 清理日志组件
│   ├── CookieList.tsx   # Cookie 列表组件
│   ├── DomainManager.tsx # 域名管理组件
│   └── Settings.tsx     # 设置组件
├── types/               # TypeScript 类型定义
│   └── index.ts         # 共享类型
├── background.ts        # 后台服务 worker
├── popup.tsx            # 主弹出窗口 UI
├── store.ts             # 存储层（使用 @plasmohq/storage）
├── style.css            # 全局样式
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript 配置
└── README.md            # 项目说明
```

## 安装说明

1. **安装依赖**：
```bash
npm install
```

2. **启动开发服务器**：
```bash
npm run dev
```

3. **在 Chrome/Edge 中加载扩展**：
   - 打开 `chrome://extensions/` 或 `edge://extensions/`
   - 启用开发者模式
   - 点击「加载已解压的扩展程序」
   - 选择 `build/chrome-mv3-dev` 文件夹

## 核心功能

### 1. 双模式管理
- **白名单模式**：仅白名单内的网站不执行清理操作
- **黑名单模式**：仅黑名单内的网站执行清理操作
- **模式切换**：在设置页面轻松切换工作模式

### 2. Cookie 管理
- **实时统计**：查看当前网站和全局的 Cookie 数量统计
- **Cookie 详情**：查看每个 Cookie 的详细信息，包括名称、值、过期时间等
- **选择性清理**：支持清理所有 Cookie、仅会话 Cookie 或仅持久 Cookie
- **过期 Cookie 清理**：自动检测并清理过期的 Cookie

### 3. 自动清理
- **标签关闭清理**：当标签页关闭时自动清理 Cookie
- **启动清理**：浏览器启动时自动清理打开标签页的 Cookie
- **过期 Cookie 清理**：定期清理过期的 Cookie

### 4. 高级功能
- **本地存储清理**：清理网站的本地存储数据
- **索引数据库清理**：清理网站的 IndexedDB 数据
- **缓存清理**：清理网站的缓存数据

### 5. 界面与体验
- **主题切换**：支持自动、亮色和暗色三种主题模式
- **清理日志**：记录 Cookie 清理操作，支持按时间筛选和清理
- **响应式设计**：适配不同屏幕尺寸
- **流畅动画**：现代、响应式的用户界面，带有平滑的动画效果

## 技术特性

- **基于 Plasmo 框架**：使用现代的 Plasmo 框架开发，简化扩展开发流程
- **Manifest V3 兼容**：符合 Chrome 扩展 Manifest V3 规范
- **TypeScript 开发**：使用 TypeScript 确保类型安全
- **React 组件化**：采用 React 组件化设计，代码结构清晰
- **Chrome/Edge 兼容**：同时支持 Chrome 和 Edge 浏览器

## 开发命令

- `npm run dev` - 启动开发模式（支持热重载）
- `npm run build` - 构建生产版本
- `npm run package` - 打包扩展（生成 zip 文件）

## 权限说明

扩展需要以下权限：
- `cookies`：读取和管理浏览器 Cookie
- `storage`：存储扩展设置和黑名单/白名单数据
- `tabs`：检测当前活动标签页和标签页状态变化
- `browsingData`：清理浏览器缓存数据

## 浏览器兼容性

- **Chrome**：版本 90+
- **Edge**：版本 90+

## 注意事项

- 扩展严格遵循隐私优先原则，所有数据处理都在本地进行
- 不会收集或上传用户的任何数据
- 仅用于管理浏览器中的 Cookie 数据，保护用户隐私安全

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。
