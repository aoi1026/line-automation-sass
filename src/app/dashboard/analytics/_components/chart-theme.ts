/**
 * 分析レポートのチャート共通カラー。
 * プライマリ系列はブランドグリーン（#06C755）、セカンダリ系列はグレー。
 * 2系列の組み合わせは色覚多様性（CVD ΔE >= 8）・通常視の分離（ΔE >= 15）を
 * バリデーター検証済み。グレー系列は凡例・ツールチップ・白フチの
 * 補助エンコーディングと併用する。
 */
export const CHART_GREEN = "#06C755"; // ブランドグリーン（プライマリ系列）
export const CHART_GRAY = "#64748b"; // セカンダリ系列（スレートグレー）
export const CHART_GRID = "#f3f4f6";
export const CHART_TICK = "#6b7280";
export const CHART_CURSOR_FILL = "rgba(17, 24, 39, 0.04)";
