import type { ReservationSource, ReservationStatus } from "@prisma/client";

/** カレンダーの表示単位 */
export type CalendarView = "day" | "week";

/** 休業の種類（定休日 / 臨時休業日） */
export type DayOffKind = "closed" | "holiday";

/**
 * タイムグリッドに配置する予約1件。
 * 時刻はすべて「その日のJST 00:00からの経過分」で保持し、
 * クライアント側での再計算（タイムゾーン依存）を不要にする。
 */
export type CalendarBlock = {
  id: string;
  /** 開始日（JST "YYYY-MM-DD"） */
  ymd: string;
  /** 開始位置（JST 00:00 からの分） */
  startMin: number;
  /** 終了位置（JST 00:00 からの分。日をまたぐ場合は1440を超える） */
  endMin: number;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  staffId: string | null;
  staffName: string;
  price: number;
  status: ReservationStatus;
  source: ReservationSource;
  note: string;
};

/** グリッドに表示する1日分の営業情報 */
export type CalendarDay = {
  /** JST "YYYY-MM-DD" */
  ymd: string;
  /** 「8/26」 */
  dateLabel: string;
  /** 「水」 */
  dayLabel: string;
  /** 営業開始（JST 00:00からの分）。休業日は null */
  openMin: number | null;
  /** 営業終了（JST 00:00からの分）。休業日は null */
  closeMin: number | null;
  /** 休業の種類。営業日は null */
  offKind: DayOffKind | null;
  /** 臨時休業の理由（未設定なら空文字） */
  offReason: string;
};

export type CalendarStaff = { id: string; name: string; title: string };

/** カレンダー1画面分のデータ（APIレスポンスと同一） */
export type CalendarData = {
  view: CalendarView;
  /** 基準日（JST "YYYY-MM-DD"） */
  date: string;
  /** 今日（JST "YYYY-MM-DD"） */
  todayYmd: string;
  /** 「2026年8月26日(水)」/「8月25日(月)〜8月31日(日)」 */
  rangeLabel: string;
  days: CalendarDay[];
  staff: CalendarStaff[];
  blocks: CalendarBlock[];
  /** 時間軸の開始（JST 00:00からの分） */
  axisStartMin: number;
  /** 時間軸の終了（JST 00:00からの分） */
  axisEndMin: number;
  /** 時間軸の刻み（分） */
  slotIntervalMin: number;
};

/** 新規予約ダイアログの選択肢 */
export type CustomerOption = { id: string; name: string; kana: string };
export type ServiceOption = { id: string; name: string; price: number; durationMin: number };
export type StaffOption = { id: string; name: string };

/** 空きセルをクリックしたときの初期値 */
export type NewSlotTarget = { ymd: string; time: string; staffId: string | null };

/** "HH:mm" → 0:00からの分 */
export function hmToMin(hm: string): number {
  const [h, m] = hm.split(":");
  return Number(h) * 60 + Number(m);
}

/** 0:00からの分 → "HH:mm"（24時以降は 24:30 のように続けて表示） */
export function minToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 時刻選択肢（0:00〜23:xx を刻み幅ごとに） */
export function buildTimeOptions(intervalMin: number): string[] {
  const step = Math.max(5, intervalMin);
  const options: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) options.push(minToHm(m));
  return options;
}

/** 重なり合う予約を横並びにするためのレーン割り当て */
export type PositionedBlock = { block: CalendarBlock; lane: number; lanes: number };

/**
 * 同一列内で時間が重なる予約を検出し、横に分割して配置するためのレーンを割り当てる。
 * 重なりが連続するかたまり（クラスタ）ごとに列数をそろえる。
 */
export function layoutColumnBlocks(blocks: CalendarBlock[]): PositionedBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.id.localeCompare(b.id)
  );
  const positioned: PositionedBlock[] = [];

  let cluster: { block: CalendarBlock; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = 0;

  function flush() {
    const lanes = Math.max(1, laneEnds.length);
    for (const item of cluster) {
      positioned.push({ block: item.block, lane: item.lane, lanes });
    }
    cluster = [];
    laneEnds = [];
    clusterEnd = 0;
  }

  for (const block of sorted) {
    if (cluster.length > 0 && block.startMin >= clusterEnd) flush();

    let lane = laneEnds.findIndex((end) => end <= block.startMin);
    if (lane === -1) {
      laneEnds.push(block.endMin);
      lane = laneEnds.length - 1;
    } else {
      laneEnds[lane] = block.endMin;
    }
    cluster.push({ block, lane });
    clusterEnd = Math.max(clusterEnd, block.endMin);
  }
  if (cluster.length > 0) flush();

  return positioned;
}
