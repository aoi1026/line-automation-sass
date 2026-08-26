import {
  BarChart3, CalendarDays, ClipboardList, FileText, Filter,
  LayoutDashboard, Megaphone, MessageSquareText, Settings, Ticket, Users, Zap,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

/** サイドバー全メニュー（表示順） */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/dashboard/reservations", label: "予約管理", icon: CalendarDays },
  { href: "/dashboard/customers", label: "顧客管理", icon: Users },
  { href: "/dashboard/messages", label: "メッセージ履歴", icon: MessageSquareText },
  { href: "/dashboard/automations", label: "自動配信設定", icon: Zap },
  { href: "/dashboard/templates", label: "テンプレート", icon: FileText },
  { href: "/dashboard/segments", label: "セグメント", icon: Filter },
  { href: "/dashboard/campaigns", label: "キャンペーン", icon: Megaphone },
  { href: "/dashboard/coupons", label: "クーポン", icon: Ticket },
  { href: "/dashboard/surveys", label: "アンケート", icon: ClipboardList },
  { href: "/dashboard/analytics", label: "分析レポート", icon: BarChart3 },
  { href: "/dashboard/settings", label: "設定", icon: Settings },
];

/** モバイル下部ナビ（5項目） */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ホーム", icon: LayoutDashboard },
  { href: "/dashboard/reservations", label: "予約", icon: CalendarDays },
  { href: "/dashboard/customers", label: "顧客", icon: Users },
  { href: "/dashboard/messages", label: "履歴", icon: MessageSquareText },
  { href: "/dashboard/analytics", label: "分析", icon: BarChart3 },
];
