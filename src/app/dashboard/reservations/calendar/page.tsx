import Link from "next/link";
import { List } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { jstYmd } from "@/lib/jst";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarView } from "./_components/calendar-view";
import { loadCalendarData, normalizeDate, normalizeView } from "./_components/calendar-data";

export default async function ReservationCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; staffId?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const now = new Date();
  const todayYmd = jstYmd(now);
  const view = normalizeView(params.view);
  const date = normalizeDate(params.date, todayYmd);

  const [data, customers, services] = await Promise.all([
    loadCalendarData({ storeId: session.storeId, view, date, now }),
    prisma.customer.findMany({
      where: { storeId: session.storeId },
      select: { id: true, name: true, kana: true },
      orderBy: [{ kana: "asc" }, { name: "asc" }],
    }),
    prisma.service.findMany({
      where: { storeId: session.storeId, active: true },
      select: { id: true, name: true, price: true, durationMin: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  // 他店舗のスタッフIDが指定された場合は絞り込みなしとして扱う
  const staffId =
    params.staffId && data.staff.some((s) => s.id === params.staffId) ? params.staffId : null;

  return (
    <>
      <PageHeader
        title="予約カレンダー"
        description="スタッフ別のタイムグリッドで、予約の埋まり具合と空き枠を確認できます。"
        actions={
          <Link
            href={`/dashboard/reservations?date=${date}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <List />
            一覧に戻る
          </Link>
        }
      />
      <CalendarView data={data} staffId={staffId} customers={customers} services={services} />
    </>
  );
}
