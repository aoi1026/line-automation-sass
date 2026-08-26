import type { MessageKind } from "@prisma/client";
import {
  BarChart3,
  CalendarCheck,
  JapaneseYen,
  Repeat,
  Scissors,
  Send,
  Star,
  Ticket,
  UserPlus,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { AUTOMATION_KINDS, MESSAGE_KIND_LABELS } from "@/lib/constants";
import {
  addDays,
  formatJstDate,
  jstDaysBetween,
  jstParts,
  jstStartOfDay,
} from "@/lib/jst";
import { cn, formatNumber, formatPercent, formatYen } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MessageKindChart } from "./_components/message-kind-chart";
import { PERIOD_LABELS, PeriodTabs, type PeriodDays } from "./_components/period-tabs";
import { VisitsChart, type VisitsChartPoint } from "./_components/visits-chart";
import { VisitsTrendChart } from "./_components/visits-trend-chart";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await requireSession();
  const storeId = session.storeId;

  const sp = await searchParams;
  const days: PeriodDays = sp.days === "30" ? 30 : sp.days === "365" ? 365 : 90;

  const now = new Date();
  const todayStart = jstStartOfDay(now);
  const periodEnd = addDays(todayStart, 1); // 本日を含む（翌日0:00 JSTまで）
  const periodStart = addDays(todayStart, -(days - 1));

  const [
    completed,
    newCustomerCount,
    messageKindGroups,
    couponIssuedCount,
    couponUsedCount,
    ratingAgg,
    ratingGroups,
  ] = await Promise.all([
    // 期間内の来店済み予約
    prisma.reservation.findMany({
      where: { storeId, status: "COMPLETED", startAt: { gte: periodStart, lt: periodEnd } },
      select: {
        startAt: true,
        customerId: true,
        price: true,
        serviceId: true,
        service: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    // 期間内に登録された新規顧客
    prisma.customer.count({
      where: { storeId, createdAt: { gte: periodStart, lt: periodEnd } },
    }),
    // 種別ごとの配信実績（送信済み）
    prisma.messageLog.groupBy({
      by: ["kind"],
      where: { storeId, status: "SENT", sentAt: { gte: periodStart, lt: periodEnd } },
      _count: { _all: true },
    }),
    // クーポン発行・利用
    prisma.couponIssue.count({
      where: { coupon: { storeId }, issuedAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.couponIssue.count({
      where: { coupon: { storeId }, usedAt: { gte: periodStart, lt: periodEnd } },
    }),
    // アンケート評価
    prisma.surveyResponse.aggregate({
      where: {
        survey: { storeId },
        createdAt: { gte: periodStart, lt: periodEnd },
        rating: { not: null },
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.surveyResponse.groupBy({
      by: ["rating"],
      where: {
        survey: { storeId },
        createdAt: { gte: periodStart, lt: periodEnd },
        rating: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  // ===== リピート率・新規/リピーター判定（顧客ごとの生涯来店を集計） =====
  const periodCustomerIds = [...new Set(completed.map((r) => r.customerId))];
  const lifetimeGroups =
    periodCustomerIds.length > 0
      ? await prisma.reservation.groupBy({
          by: ["customerId"],
          where: { storeId, status: "COMPLETED", customerId: { in: periodCustomerIds } },
          _min: { startAt: true },
          _count: { _all: true },
        })
      : [];
  const firstVisitByCustomer = new Map<string, number>();
  let repeaterCount = 0;
  for (const g of lifetimeGroups) {
    if (g._min.startAt) firstVisitByCustomer.set(g.customerId, g._min.startAt.getTime());
    if (g._count._all >= 2) repeaterCount++;
  }
  const repeatRate =
    periodCustomerIds.length > 0 ? repeaterCount / periodCustomerIds.length : null;

  // ===== KPI =====
  const visitCount = completed.length;
  const revenue = completed.reduce((sum, r) => sum + r.price, 0);
  const avgPrice = visitCount > 0 ? Math.round(revenue / visitCount) : null;

  // ===== 期間バケット（30日=日別 / 90日・1年=週別） =====
  const bucketDays = days === 30 ? 1 : 7;
  const bucketCount = Math.ceil(days / bucketDays);
  const buckets: VisitsChartPoint[] = Array.from({ length: bucketCount }, (_, i) => {
    const start = addDays(periodStart, i * bucketDays);
    const endInclusive =
      i === bucketCount - 1 ? todayStart : addDays(start, bucketDays - 1);
    const s = jstParts(start);
    const e = jstParts(endInclusive);
    return {
      label: `${s.month}/${s.day}`,
      fullLabel:
        bucketDays === 1
          ? formatJstDate(start)
          : `${s.month}月${s.day}日〜${e.month}月${e.day}日`,
      newCount: 0,
      repeatCount: 0,
    };
  });
  for (const r of completed) {
    const idx = Math.min(
      Math.floor(jstDaysBetween(periodStart, r.startAt) / bucketDays),
      bucketCount - 1
    );
    if (idx < 0) continue;
    const firstVisit = firstVisitByCustomer.get(r.customerId);
    if (firstVisit !== undefined && r.startAt.getTime() === firstVisit) {
      buckets[idx].newCount++;
    } else {
      buckets[idx].repeatCount++;
    }
  }
  const trendData = buckets.map((b) => ({
    label: b.label,
    fullLabel: b.fullLabel,
    count: b.newCount + b.repeatCount,
  }));
  const bucketUnitLabel = bucketDays === 1 ? "日別" : "週別";

  // ===== メッセージ配信実績 =====
  const kindOrder: MessageKind[] = [...AUTOMATION_KINDS, "CAMPAIGN", "MANUAL"];
  const kindCounts = new Map(messageKindGroups.map((g) => [g.kind, g._count._all]));
  const messageData = kindOrder
    .filter((k) => (kindCounts.get(k) ?? 0) > 0)
    .map((k) => ({ label: MESSAGE_KIND_LABELS[k], count: kindCounts.get(k) ?? 0 }));
  const totalSentCount = messageData.reduce((sum, d) => sum + d.count, 0);

  // ===== クーポン利用 =====
  const couponUsageRate =
    couponIssuedCount > 0 ? couponUsedCount / couponIssuedCount : null;

  // ===== アンケート満足度 =====
  const avgRating = ratingAgg._avg.rating;
  const responseCount = ratingAgg._count._all;
  const ratingDist = new Map<number, number>();
  for (const g of ratingGroups) {
    if (g.rating !== null) ratingDist.set(g.rating, g._count._all);
  }
  const maxRatingCount = Math.max(1, ...[1, 2, 3, 4, 5].map((r) => ratingDist.get(r) ?? 0));
  const roundedRating = avgRating === null ? 0 : Math.round(avgRating);

  // ===== 人気メニュー =====
  const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const r of completed) {
    if (!r.serviceId || !r.service) continue;
    const entry = serviceMap.get(r.serviceId) ?? { name: r.service.name, count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += r.price;
    serviceMap.set(r.serviceId, entry);
  }
  const topServices = [...serviceMap.values()]
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
    .slice(0, 5);
  const maxServiceCount = Math.max(1, ...topServices.map((s) => s.count));

  const periodLabel = PERIOD_LABELS[days];

  return (
    <>
      <PageHeader
        title="分析レポート"
        description="来店・配信・クーポンの実績を期間別に確認できます。"
        actions={<PeriodTabs days={days} />}
      />

      <div className="space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="来店数"
            value={`${formatNumber(visitCount)}件`}
            sub={`${periodLabel}の来店済み件数`}
            icon={<CalendarCheck />}
          />
          <StatCard
            label="リピート率"
            value={repeatRate === null ? "—" : formatPercent(repeatRate)}
            sub={
              repeatRate === null
                ? "期間内の来店がありません"
                : `来店顧客${formatNumber(periodCustomerIds.length)}人中 ${formatNumber(repeaterCount)}人が2回以上来店`
            }
            icon={<Repeat />}
          />
          <StatCard
            label="新規顧客"
            value={`${formatNumber(newCustomerCount)}人`}
            sub={`${periodLabel}に登録された顧客数`}
            icon={<UserPlus />}
          />
          <StatCard
            label="客単価"
            value={avgPrice === null ? "—" : formatYen(avgPrice)}
            sub={
              avgPrice === null
                ? "期間内の来店がありません"
                : `売上合計 ${formatYen(revenue)}`
            }
            icon={<JapaneseYen />}
          />
        </div>

        {/* 来店数の推移 */}
        <Card>
          <CardHeader>
            <CardTitle>来店数の推移</CardTitle>
            <CardDescription>
              {periodLabel}の来店済み件数を{bucketUnitLabel}で表示しています。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visitCount === 0 ? (
              <EmptyState
                icon={<BarChart3 />}
                title="期間内の来店データがありません"
                description="予約を来店済みにすると、推移がここに表示されます。"
              />
            ) : (
              <VisitsTrendChart data={trendData} />
            )}
          </CardContent>
        </Card>

        {/* 新規・リピーター */}
        <Card>
          <CardHeader>
            <CardTitle>新規・リピーターの内訳</CardTitle>
            <CardDescription>
              初来店のお客様とリピーターのお客様の来店数を{bucketUnitLabel}で比較できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visitCount === 0 ? (
              <EmptyState
                icon={<BarChart3 />}
                title="期間内の来店データがありません"
                description="予約を来店済みにすると、内訳がここに表示されます。"
              />
            ) : (
              <VisitsChart data={buckets} />
            )}
          </CardContent>
        </Card>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* メッセージ配信実績 */}
          <Card>
            <CardHeader>
              <CardTitle>メッセージ配信実績</CardTitle>
              <CardDescription>
                {periodLabel}に送信されたメッセージ {formatNumber(totalSentCount)}件の内訳です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messageData.length === 0 ? (
                <EmptyState
                  icon={<Send />}
                  title="期間内の配信はありません"
                  description="自動配信やキャンペーンを配信すると、実績がここに表示されます。"
                />
              ) : (
                <MessageKindChart data={messageData} />
              )}
            </CardContent>
          </Card>

          {/* 人気メニュー */}
          <Card>
            <CardHeader>
              <CardTitle>人気メニュー</CardTitle>
              <CardDescription>
                {periodLabel}の来店数が多いメニューの上位5件です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topServices.length === 0 ? (
                <EmptyState
                  icon={<Scissors />}
                  title="期間内の実績がありません"
                  description="メニュー付きの予約が来店済みになると、ここに表示されます。"
                />
              ) : (
                <div className="space-y-4">
                  {topServices.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          i === 0 ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {s.name}
                          </p>
                          <p className="shrink-0 text-xs tabular-nums text-gray-500">
                            {formatNumber(s.count)}件 ・ {formatYen(s.revenue)}
                          </p>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${(s.count / maxServiceCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* クーポン利用 */}
          <Card>
            <CardHeader>
              <CardTitle>クーポン利用</CardTitle>
              <CardDescription>
                {periodLabel}のクーポンの発行・利用の実績です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/50 py-4 text-center">
                <div>
                  <p className="text-xs font-medium text-gray-500">発行数</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                    {formatNumber(couponIssuedCount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">利用数</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                    {formatNumber(couponUsedCount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">利用率</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-brand-dark">
                    {couponUsageRate === null ? "—" : formatPercent(couponUsageRate)}
                  </p>
                </div>
              </div>
              {couponUsageRate !== null && (
                <div className="mt-4">
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.min(100, couponUsageRate * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    発行されたクーポンのうち{formatPercent(couponUsageRate)}が利用されています。
                  </p>
                </div>
              )}
              {couponIssuedCount === 0 && (
                <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                  <Ticket className="h-4 w-4 shrink-0 text-gray-400" />
                  期間内に発行されたクーポンはありません。
                </p>
              )}
            </CardContent>
          </Card>

          {/* アンケート満足度 */}
          <Card>
            <CardHeader>
              <CardTitle>アンケート満足度</CardTitle>
              <CardDescription>
                {periodLabel}に回答されたアンケートの評価です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responseCount === 0 || avgRating === null ? (
                <EmptyState
                  icon={<Star />}
                  title="期間内の回答はありません"
                  description="アンケートに回答が集まると、評価がここに表示されます。"
                />
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <p className="text-3xl font-bold tabular-nums text-gray-900">
                      {avgRating.toFixed(1)}
                    </p>
                    <div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-5 w-5",
                              i <= roundedRating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-gray-200 text-gray-200"
                            )}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        平均評価 ・ 回答数 {formatNumber(responseCount)}件
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = ratingDist.get(rating) ?? 0;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <span className="w-8 shrink-0 text-xs font-medium text-gray-600">
                            ★{rating}
                          </span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${(count / maxRatingCount) * 100}%` }}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-gray-600">
                            {formatNumber(count)}件
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
