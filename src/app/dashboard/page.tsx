import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  MessageCircle,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  MESSAGE_KIND_LABELS,
  MESSAGE_STATUS_COLORS,
  MESSAGE_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import {
  addDays,
  formatJstDateShort,
  formatJstDateTimeShort,
  formatJstTime,
  fromJst,
  jstParts,
  jstStartOfDay,
} from "@/lib/jst";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "./_components/onboarding-checklist";

export const metadata: Metadata = { title: "ダッシュボード" };

export default async function DashboardHomePage() {
  const session = await requireSession();
  const storeId = session.storeId;

  const now = new Date();
  const todayStart = jstStartOfDay(now);
  const todayEnd = addDays(todayStart, 1);

  // 今月（JST）の開始と翌月の開始
  const { year, month } = jstParts(now);
  const monthStart = fromJst(`${year}-${String(month).padStart(2, "0")}-01`);
  const nextMonthStart =
    month === 12
      ? fromJst(`${year + 1}-01-01`)
      : fromJst(`${year}-${String(month + 1).padStart(2, "0")}-01`);

  const [
    todayReservations,
    monthVisitCount,
    monthMessageCount,
    monthAutoMessageCount,
    lineLinkedCount,
    customerCount,
    pendingWebCount,
    recentLogs,
    store,
    activeServiceCount,
    activeStaffCount,
    enabledAutomationCount,
  ] = await Promise.all([
    // 本日の予約（PENDING / CONFIRMED / COMPLETED）
    prisma.reservation.findMany({
      where: {
        storeId,
        startAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
      },
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    // 今月の来店（来店済み）
    prisma.reservation.count({
      where: {
        storeId,
        status: "COMPLETED",
        startAt: { gte: monthStart, lt: nextMonthStart },
      },
    }),
    // 今月の配信（全種別）
    prisma.messageLog.count({
      where: { storeId, sentAt: { gte: monthStart, lt: nextMonthStart } },
    }),
    // うち自動配信（キャンペーン・手動送信を除く）
    prisma.messageLog.count({
      where: {
        storeId,
        sentAt: { gte: monthStart, lt: nextMonthStart },
        kind: { notIn: ["CAMPAIGN", "MANUAL"] },
      },
    }),
    // LINE連携済みの顧客数
    prisma.customer.count({ where: { storeId, lineUserId: { not: null } } }),
    prisma.customer.count({ where: { storeId } }),
    // 未確定のWeb予約
    prisma.reservation.count({ where: { storeId, status: "PENDING" } }),
    // 最近の配信
    prisma.messageLog.findMany({
      where: { storeId },
      include: { customer: { select: { name: true } } },
      orderBy: { sentAt: "desc" },
      take: 5,
    }),
    // セットアップガイドの判定用
    prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { phone: true, address: true, lineChannelAccessToken: true },
    }),
    prisma.service.count({ where: { storeId, active: true } }),
    prisma.staffMember.count({ where: { storeId, active: true } }),
    prisma.automationSetting.count({ where: { storeId, enabled: true } }),
  ]);

  // 初期セットアップの進捗（すべて完了していれば非表示）
  const onboardingSteps: OnboardingStep[] = [
    {
      key: "store",
      title: "店舗情報を登録する",
      description: "電話番号と住所を登録すると、Web予約ページやメッセージに正しく表示されます。",
      href: "/dashboard/settings",
      actionLabel: "登録する",
      done: store.phone.trim() !== "" && store.address.trim() !== "",
    },
    {
      key: "services",
      title: "メニューを登録する",
      description: "施術メニューと所要時間・料金を登録すると、Web予約を受け付けられます。",
      href: "/dashboard/settings?tab=services",
      actionLabel: "登録する",
      done: activeServiceCount > 0,
    },
    {
      key: "staff",
      title: "スタッフを登録する",
      description: "担当者を登録すると、予約ごとに担当を割り当てられます。",
      href: "/dashboard/settings?tab=staff",
      actionLabel: "登録する",
      done: activeStaffCount > 0,
    },
    {
      key: "line",
      title: "LINE公式アカウントを接続する",
      description: "接続すると、メッセージが実際にお客様のLINEへ届くようになります。",
      href: "/dashboard/settings?tab=line",
      actionLabel: "接続する",
      done: store.lineChannelAccessToken.trim() !== "",
    },
    {
      key: "automations",
      title: "自動配信をオンにする",
      description: "リマインダーや来店お礼などを、自動でお届けできるようになります。",
      href: "/dashboard/automations",
      actionLabel: "設定する",
      done: enabledAutomationCount > 0,
    },
    {
      key: "customers",
      title: "お客様を登録する",
      description: "既存のお客様を登録すると、すぐにメッセージをお届けできます。",
      href: "/dashboard/customers",
      actionLabel: "登録する",
      done: customerCount > 0,
    },
  ];
  const onboardingCompleted = onboardingSteps.every((step) => step.done);

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description="今日の予約と店舗の状況をひと目で確認できます。"
      />

      <div className="space-y-6">
        {/* セットアップガイド（すべて完了すると表示されない） */}
        {!onboardingCompleted && <OnboardingChecklist steps={onboardingSteps} />}

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="今日の予約"
            value={`${formatNumber(todayReservations.length)}件`}
            sub={formatJstDateShort(now)}
            icon={<CalendarDays />}
          />
          <StatCard
            label="今月の来店"
            value={`${formatNumber(monthVisitCount)}件`}
            sub={`${month}月の来店済み件数`}
            icon={<Sparkles />}
          />
          <StatCard
            label="今月の配信"
            value={`${formatNumber(monthMessageCount)}件`}
            sub={`内訳: 自動 ${formatNumber(monthAutoMessageCount)}件`}
            icon={<Send />}
          />
          <StatCard
            label="LINE連携済み"
            value={`${formatNumber(lineLinkedCount)}人`}
            sub={`全顧客${formatNumber(customerCount)}人中`}
            icon={<MessageCircle />}
          />
        </div>

        {/* 未確定のWeb予約アラート */}
        {pendingWebCount > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <TriangleAlert className="h-5 w-5 shrink-0 text-amber-500" />
                <p className="text-sm text-amber-900">
                  未確定のWeb予約が
                  <span className="mx-1 font-bold tabular-nums">
                    {formatNumber(pendingWebCount)}件
                  </span>
                  あります。内容をご確認のうえ、確定してください。
                </p>
              </div>
              <Link href="/dashboard/reservations?status=PENDING" className="shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                >
                  予約を確認
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* 本日の予約 */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>本日の予約</CardTitle>
              <Link
                href="/dashboard/reservations"
                className="text-sm font-medium text-brand-dark hover:underline"
              >
                すべて見る
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {todayReservations.length === 0 ? (
                <div className="p-5 pt-0">
                  <EmptyState
                    icon={<CalendarDays />}
                    title="本日の予約はありません"
                    description="新しい予約は予約管理ページから登録できます。"
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {todayReservations.map((r) => (
                    <Link
                      key={r.id}
                      href="/dashboard/reservations"
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="w-12 shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                        {formatJstTime(r.startAt)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {r.customer.name} 様
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {r.service?.name ?? "メニュー未設定"}
                          {r.staff ? ` ・ 担当: ${r.staff.name}` : ""}
                        </p>
                      </div>
                      <Badge className={RESERVATION_STATUS_COLORS[r.status]}>
                        {RESERVATION_STATUS_LABELS[r.status]}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最近の配信 */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>最近の配信</CardTitle>
              <Link
                href="/dashboard/messages"
                className="text-sm font-medium text-brand-dark hover:underline"
              >
                すべて見る
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentLogs.length === 0 ? (
                <div className="p-5 pt-0">
                  <EmptyState
                    icon={<Send />}
                    title="配信履歴はまだありません"
                    description="自動配信やキャンペーンを配信すると、履歴がここに表示されます。"
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                      <Badge variant="secondary" className="shrink-0">
                        {MESSAGE_KIND_LABELS[log.kind]}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {log.customer ? `${log.customer.name} 様` : "宛先なし"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {formatJstDateTimeShort(log.sentAt)}
                        </p>
                      </div>
                      <Badge className={MESSAGE_STATUS_COLORS[log.status]}>
                        {MESSAGE_STATUS_LABELS[log.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
