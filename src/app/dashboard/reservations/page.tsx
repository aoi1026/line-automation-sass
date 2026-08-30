import type { Metadata } from "next";
import type { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  DAY_LABELS_JA,
  addDays,
  formatJstDate,
  formatJstDateShort,
  fromJst,
  jstDayKey,
  jstHm,
  jstParts,
  jstStartOfDay,
  jstYmd,
} from "@/lib/jst";
import { PageHeader } from "@/components/ui/page-header";
import { CreateReservationDialog } from "./_components/create-reservation-dialog";
import { ReservationsView } from "./_components/reservations-view";
import {
  STATUS_FILTERS,
  normalizeReservationView,
  type ReservationRow,
  type StatusFilter,
  type WeekDay,
} from "./_components/types";

export const metadata: Metadata = { title: "予約管理" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 「今後の予約」で一度に表示する最大件数（多すぎる読み込みを防ぐ） */
const UPCOMING_LIMIT = 100;

type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: {
    customer: { select: { name: true } };
    service: { select: { name: true } };
    staff: { select: { name: true } };
  };
}>;

function toRow(r: ReservationWithRelations): ReservationRow {
  return {
    id: r.id,
    ymd: jstYmd(r.startAt),
    dateLabel: formatJstDateShort(r.startAt),
    startTime: jstHm(r.startAt),
    endTime: jstHm(r.endAt),
    customerName: r.customer.name,
    serviceName: r.service?.name ?? "メニューなし",
    staffName: r.staff?.name ?? "指名なし",
    price: r.price,
    status: r.status,
    source: r.source,
    note: r.note,
  };
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; view?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const now = new Date();
  const todayYmd = jstYmd(now);
  const date = params.date && DATE_RE.test(params.date) ? params.date : todayYmd;
  const view = normalizeReservationView(params.view);
  const status: StatusFilter = STATUS_FILTERS.includes(params.status as StatusFilter)
    ? (params.status as StatusFilter)
    : "ALL";

  // 表示期間（JST）: 日別=その日 / 週間=その日を含む週（月曜はじまり）
  // 今後の予約=今日以降（終わりを区切らないので、別の日の予約にも到達できる）
  const dayStart = fromJst(date);
  const mondayOffset = (jstParts(dayStart).weekday + 6) % 7;
  const weekStart = addDays(dayStart, -mondayOffset);
  const todayStart = jstStartOfDay(now);
  const rangeStart = view === "upcoming" ? todayStart : view === "week" ? weekStart : dayStart;
  const period: Prisma.DateTimeFilter =
    view === "upcoming"
      ? { gte: todayStart }
      : { gte: rangeStart, lt: addDays(rangeStart, view === "week" ? 7 : 1) };

  const where: Prisma.ReservationWhereInput = {
    storeId: session.storeId,
    startAt: period,
    ...(status !== "ALL" ? { status: status as ReservationStatus } : {}),
  };

  const [reservations, pendingCount, customers, services, staffMembers] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
      ...(view === "upcoming" ? { take: UPCOMING_LIMIT } : {}),
    }),
    prisma.reservation.count({
      where: {
        storeId: session.storeId,
        status: "PENDING",
        startAt: period,
      },
    }),
    prisma.customer.findMany({
      where: { storeId: session.storeId },
      select: { id: true, name: true, kana: true },
      orderBy: [{ kana: "asc" }, { name: "asc" }],
    }),
    prisma.service.findMany({
      where: { storeId: session.storeId, active: true },
      select: { id: true, name: true, price: true, durationMin: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.staffMember.findMany({
      where: { storeId: session.storeId, active: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const rows = reservations.map(toRow);

  // 週間ビュー用に7日分へ振り分け
  const weekDays: WeekDay[] = [];
  if (view === "week") {
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const ymd = jstYmd(d);
      const { month, day } = jstParts(d);
      weekDays.push({
        ymd,
        dayLabel: DAY_LABELS_JA[jstDayKey(d)],
        dateLabel: `${month}/${day}`,
        rows: rows.filter((r) => r.ymd === ymd),
      });
    }
  }

  const dateLabel =
    view === "upcoming"
      ? `${formatJstDate(todayStart)}以降`
      : view === "week"
        ? `${formatJstDateShort(weekStart)}〜${formatJstDateShort(addDays(weekStart, 6))}`
        : formatJstDate(dayStart);

  return (
    <>
      <PageHeader
        title="予約管理"
        description="日別・週間・今後の予約の確認と登録・変更"
        actions={
          <CreateReservationDialog
            key={date}
            customers={customers}
            services={services}
            staffMembers={staffMembers}
            defaultDate={date}
          />
        }
      />
      <ReservationsView
        date={date}
        todayYmd={todayYmd}
        status={status}
        view={view}
        dateLabel={dateLabel}
        pendingCount={pendingCount}
        listRows={view === "week" ? [] : rows}
        listLimited={view === "upcoming" && rows.length === UPCOMING_LIMIT}
        weekDays={weekDays}
        createAction={
          <CreateReservationDialog
            key={`empty-${date}`}
            customers={customers}
            services={services}
            staffMembers={staffMembers}
            defaultDate={date}
          />
        }
      />
    </>
  );
}
