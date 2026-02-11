export interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

export const TABS: TabConfig[] = [
  { id: "manage", label: "管理", icon: "🏠" },
  { id: "whitelist", label: "白名单", icon: "📝" },
  { id: "blacklist", label: "黑名单", icon: "📝" },
  { id: "settings", label: "设置", icon: "⚙️" },
  { id: "log", label: "日志", icon: "📋" },
];
