/**
 * 分析レポートの集計ロジック（純関数）。
 * page.tsx（サーバーコンポーネント）から呼び出し、整形済みデータだけを
 * クライアントコンポーネントへ渡す。
 * "use client" を持たないモジュールに置くことで、型定義をサーバー・クライアント
 * 双方から安全に参照できる。
 */
import { DEFAULT_BUSINESS_HOURS, type BusinessHours, type BusinessHoursDay } from "@/lib/constants";
import { DAY_KEYS, DAY_LABELS_JA, jstDaysBetween, jstParts } from "@/lib/jst";

// ========== スタッフ別実績 ==========

/** 担当者が設定されていない予約をまとめる行のキー */
export const UNASSIGNED_STAFF_KEY = "__unassigned__";

export type StaffPerformanceRow = {
  key: string;
  name: string;
  /** 施術数（来店済み予約の件数） */
  count: number;
  revenue: number;
  avgPrice: number;
  /** 期間内の全施術数に占める割合（構成比） */
  share: number;
  /** 「指名なし」行かどうか */
  isUnassigned: boolean;
};

type CompletedReservation = {
  staffId: string | null;
  staff: { name: string } | null;
  price: number;
};

/**
 * 来店済み予約を担当スタッフ別に集計する。
 * 担当者未設定の予約は「指名なし」1行にまとめ、常に末尾に並べる。
 */
export function buildStaffPerformance(
  reservations: CompletedReservation[]
): StaffPerformanceRow[] {
  const map = new Map<string, { key: string; name: string; count: number; revenue: number }>();

  for (const r of reservations) {
    const key = r.staffId ?? UNASSIGNED_STAFF_KEY;
    const name = r.staffId ? (r.staff?.name ?? "担当者不明") : "指名なし";
    const entry = map.get(key) ?? { key, name, count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += r.price;
    map.set(key, entry);
  }

  const total = reservations.length;
  const rows: StaffPerformanceRow[] = [...map.values()].map((v) => ({
    ...v,
    avgPrice: v.count > 0 ? Math.round(v.revenue / v.count) : 0,
    share: total > 0 ? v.count / total : 0,
    isUnassigned: v.key === UNASSIGNED_STAFF_KEY,
  }));

  rows.sort((a, b) => {
    if (a.isUnassigned !== b.isUnassigned) return a.isUnassigned ? 1 : -1;
    return b.revenue - a.revenue || b.count - a.count || a.name.localeCompare(b.name, "ja");
  });
  return rows;
}

export type StaffRevenuePoint = {
  /** 軸ラベル（担当者名） */
  label: string;
  revenue: number;
};

/** 売上上位のスタッフを横棒チャート用に整形する */
export function toStaffRevenueChartData(
  rows: StaffPerformanceRow[],
  limit = 8
): StaffRevenuePoint[] {
  return [...rows]
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((r) => ({ label: r.name, revenue: r.revenue }));
}

// ========== 曜日 × 時間帯ヒートマップ ==========

export type HeatmapRow = {
  /** 曜日ラベル（「月」〜「日」） */
  dayLabel: string;
  /** hours と同じ並びの件数 */
  counts: number[];
};

export type HeatmapData = {
  /** 表示する時間帯（例: [10, 11, ... 18]） */
  hours: number[];
  /** 月曜始まりの7行 */
  rows: HeatmapRow[];
  maxCount: number;
  total: number;
  /** 最も件数が多いセル（データが無ければ null） */
  peak: { dayLabel: string; hour: number; count: number } | null;
};

function isBusinessHoursDay(v: unknown): v is BusinessHoursDay {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as BusinessHoursDay).open === "string" &&
    typeof (v as BusinessHoursDay).close === "string" &&
    typeof (v as BusinessHoursDay).closed === "boolean"
  );
}

/** store.businessHours(Json) を安全にパースし、欠損はデフォルトで補完する */
export function resolveBusinessHours(raw: unknown): BusinessHours {
  const merged: BusinessHours = { ...DEFAULT_BUSINESS_HOURS };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const key of DAY_KEYS) {
      const v = obj[key];
      if (isBusinessHoursDay(v)) merged[key] = v;
    }
  }
  return merged;
}

/** "10:30" → 10（開始時刻は切り捨て） */
function openHourOf(hm: string): number | null {
  const hour = Number(hm.split(":")[0]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 24 ? hour : null;
}

/** "19:30" → 20（終了時刻は切り上げ。19:00 は 19） */
function closeHourOf(hm: string): number | null {
  const [h, m] = hm.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isInteger(hour) || hour < 0 || hour > 24) return null;
  const extra = Number.isInteger(minute) && minute > 0 ? 1 : 0;
  return Math.min(24, hour + extra);
}

/**
 * 予約の開始日時（UTC）を JST の 曜日 × 時間帯 で集計する。
 * 時間帯の範囲は営業時間から決め、営業時間外の予約があればその分だけ広げる。
 */
export function buildHourHeatmap(
  startAts: Date[],
  businessHours: BusinessHours
): HeatmapData {
  let from = 24;
  let toExclusive = 0;

  for (const key of DAY_KEYS) {
    const day = businessHours[key];
    if (day.closed) continue;
    const open = openHourOf(day.open);
    const close = closeHourOf(day.close);
    if (open === null || close === null || close <= open) continue;
    from = Math.min(from, open);
    toExclusive = Math.max(toExclusive, close);
  }
  // 全曜日が休業・営業時間が不正な場合はデフォルト（10時〜19時）で表示する
  if (from >= toExclusive) {
    from = 10;
    toExclusive = 19;
  }
  for (const at of startAts) {
    const { hour } = jstParts(at);
    from = Math.min(from, hour);
    toExclusive = Math.max(toExclusive, hour + 1);
  }

  const hours = Array.from({ length: toExclusive - from }, (_, i) => from + i);
  const rows: HeatmapRow[] = DAY_KEYS.map((key) => ({
    dayLabel: DAY_LABELS_JA[key],
    counts: hours.map(() => 0),
  }));

  let total = 0;
  for (const at of startAts) {
    const { hour, weekday } = jstParts(at); // weekday: 0=日
    const rowIndex = (weekday + 6) % 7; // 0=月 になるよう変換
    const colIndex = hour - from;
    if (colIndex < 0 || colIndex >= hours.length) continue;
    rows[rowIndex].counts[colIndex]++;
    total++;
  }

  let maxCount = 0;
  let peak: { dayLabel: string; hour: number; count: number } | null = null;
  for (const row of rows) {
    for (let i = 0; i < row.counts.length; i++) {
      const count = row.counts[i];
      if (count > maxCount) {
        maxCount = count;
        peak = { dayLabel: row.dayLabel, hour: hours[i], count };
      }
    }
  }

  return { hours, rows, maxCount, total, peak };
}

// ========== 顧客の定着状況 ==========

export type DistributionBar = {
  label: string;
  count: number;
  /** 「この層に配信」リンクの遷移先 */
  href?: string;
};

const VISIT_COUNT_BUCKETS: { label: string; min: number; max: number | null }[] = [
  { label: "1回", min: 1, max: 1 },
  { label: "2回", min: 2, max: 2 },
  { label: "3〜5回", min: 3, max: 5 },
  { label: "6〜10回", min: 6, max: 10 },
  { label: "11回以上", min: 11, max: null },
];

/** 来店回数の分布（来店実績のある顧客のみ） */
export function buildVisitCountDistribution(customers: { visitCount: number }[]): {
  bars: DistributionBar[];
  total: number;
} {
  const counts = VISIT_COUNT_BUCKETS.map(() => 0);
  let total = 0;
  for (const c of customers) {
    if (c.visitCount < 1) continue;
    const index = VISIT_COUNT_BUCKETS.findIndex(
      (b) => c.visitCount >= b.min && (b.max === null || c.visitCount <= b.max)
    );
    if (index < 0) continue;
    counts[index]++;
    total++;
  }
  return {
    bars: VISIT_COUNT_BUCKETS.map((b, i) => ({ label: b.label, count: counts[i] })),
    total,
  };
}

const RECENCY_BUCKETS: { label: string; min: number; max: number | null }[] = [
  { label: "30日以内", min: 0, max: 30 },
  { label: "31〜60日", min: 31, max: 60 },
  { label: "61〜90日", min: 61, max: 90 },
  { label: "91〜180日", min: 91, max: 180 },
  { label: "181日以上", min: 181, max: null },
];

function campaignHref(min: number, max: number | null): string {
  const params = new URLSearchParams({ lastVisitDaysMin: String(min) });
  if (max !== null) params.set("lastVisitDaysMax", String(max));
  return `/dashboard/campaigns/new?${params.toString()}`;
}

/** 最終来店からの経過日数の分布（来店実績のある顧客のみ） */
export function buildRecencyDistribution(
  customers: { lastVisitAt: Date | null }[],
  now: Date
): { bars: DistributionBar[]; total: number } {
  const counts = RECENCY_BUCKETS.map(() => 0);
  let total = 0;
  for (const c of customers) {
    if (!c.lastVisitAt) continue;
    const days = Math.max(0, jstDaysBetween(c.lastVisitAt, now));
    const index = RECENCY_BUCKETS.findIndex(
      (b) => days >= b.min && (b.max === null || days <= b.max)
    );
    if (index < 0) continue;
    counts[index]++;
    total++;
  }
  return {
    bars: RECENCY_BUCKETS.map((b, i) => ({
      label: b.label,
      count: counts[i],
      href: campaignHref(b.min, b.max),
    })),
    total,
  };
}
