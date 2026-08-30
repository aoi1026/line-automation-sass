/** セグメント一覧で受け渡す型（サーバー・クライアント共用） */

/** 一覧のダイアログに渡す対象顧客の最大件数（多すぎる読み込みを防ぐ） */
export const SEGMENT_TARGET_PREVIEW_LIMIT = 50;

/** 対象のお客様（表示用に整形済み） */
export type SegmentTarget = {
  id: string;
  name: string;
  kana: string;
  /** 「8月26日(水)」。来店記録がなければ null */
  lastVisitLabel: string | null;
  visitCount: number;
  /** LINE連携済みか */
  linked: boolean;
};
