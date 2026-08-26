"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, MessageCircleHeart, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { MOBILE_NAV_ITEMS, NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardShell({
  storeName,
  userName,
  lineConfigured,
  children,
}: {
  storeName: string;
  userName: string;
  lineConfigured: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("ログアウトしました");
    router.push("/login");
    router.refresh();
  }

  const navList = (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-brand/10 text-brand-dark" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-brand" : "text-gray-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* デスクトップ: サイドバー */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
          <MessageCircleHeart className="h-6 w-6 text-brand" />
          <span className="text-lg font-bold text-gray-900">{APP_NAME}</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">{navList}</div>
        <div className="border-t border-gray-100 p-4">
          <p className="truncate text-sm font-medium text-gray-900">{storeName}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{userName}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      </aside>

      {/* モバイル: ドロワー */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
              <span className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <MessageCircleHeart className="h-6 w-6 text-brand" />
                {APP_NAME}
              </span>
              <button onClick={() => setDrawerOpen(false)} className="rounded-md p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">{navList}</div>
            <div className="border-t border-gray-100 p-4">
              <p className="truncate text-sm font-medium text-gray-900">{storeName}</p>
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:left-60">
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{storeName}</p>
        </div>
        {lineConfigured ? (
          <Badge>LINE連携済み</Badge>
        ) : (
          <Link href="/dashboard/settings/line">
            <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200">デモモード</Badge>
          </Link>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 pb-24 pt-20 sm:px-6 lg:ml-60 lg:pb-10 lg:pt-24">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* モバイル: 下部ナビ */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                active ? "text-brand" : "text-gray-400"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
