import { fromJst, jstParts } from "@/lib/jst";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO日時（またはDate）→ datetime-local入力値（JST基準） */
export function isoToJstInput(value: string | Date): string {
  const p = jstParts(typeof value === "string" ? new Date(value) : value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** datetime-local入力値（JST解釈）→ ISO文字列。パースできなければ null */
export function jstInputToIso(value: string): string | null {
  if (!value || value.length < 16) return null;
  const d = fromJst(value.slice(0, 10), value.slice(11, 16));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** 現在時刻（JST）の datetime-local入力値 */
export function nowJstInput(): string {
  return isoToJstInput(new Date());
}
