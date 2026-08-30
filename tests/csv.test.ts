import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvWithLineNumbers, toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("Excelで文字化けしないようBOMを付ける", () => {
    const csv = toCsv(["氏名"], [["山田 花子"]]);
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("カンマ・改行・引用符を含む値をクォートする", () => {
    const csv = toCsv(["メモ"], [['A,B'], ["1\n2"], ['彼は"x"と言った']]);
    expect(csv).toContain('"A,B"');
    expect(csv).toContain('"1\n2"');
    expect(csv).toContain('"彼は""x""と言った"');
  });

  it("数式記号で始まる値はクォートを前置してインジェクションを防ぐ", () => {
    const csv = toCsv(["メモ"], [["=1+1"], ["+80"], ["-5"], ["@cmd"]]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+80");
    expect(csv).toContain("'-5");
    expect(csv).toContain("'@cmd");
  });
});

describe("parseCsv", () => {
  it("クォート内のカンマと改行を1つのセルとして扱う", () => {
    const rows = parseCsv('氏名,メモ\r\n山田,"A,B"\r\n佐藤,"1\n2"\r\n');
    expect(rows[1]).toEqual(["山田", "A,B"]);
    expect(rows[2]).toEqual(["佐藤", "1\n2"]);
  });

  it("書き出したCSVを読み戻すと元の値に戻る（数式対策のクォートが残らない）", () => {
    const original = [["=SUM(A1)"], ["+81 90-1234-5678"], ["通常の値"]];
    const rows = parseCsv(toCsv(["メモ"], original));
    expect(rows[1]).toEqual(["=SUM(A1)"]);
    expect(rows[2]).toEqual(["+81 90-1234-5678"]);
    expect(rows[3]).toEqual(["通常の値"]);
  });

  it("元から ' で始まる値は壊さない", () => {
    const rows = parseCsv("メモ\r\n'普通の文字列\r\n");
    expect(rows[1]).toEqual(["'普通の文字列"]);
  });

  it("先頭のBOMを取り除く", () => {
    expect(parseCsv("﻿氏名\r\n山田\r\n")[0]).toEqual(["氏名"]);
  });
});

describe("parseCsvWithLineNumbers", () => {
  it("空行を飛ばしてもCSVファイル上の実際の行番号を返す", () => {
    // 1:見出し 2:山田 3:空行 4:空行 5:佐藤
    const rows = parseCsvWithLineNumbers("氏名\r\n山田\r\n\r\n\r\n佐藤\r\n");
    expect(rows.map((r) => r.lineNumber)).toEqual([1, 2, 5]);
    expect(rows.map((r) => r.cells[0])).toEqual(["氏名", "山田", "佐藤"]);
  });

  it("クォート内の改行があっても後続の行番号がズレない", () => {
    // 1:見出し 2-3:メモが2行にまたがる 4:次の行
    const rows = parseCsvWithLineNumbers('氏名,メモ\r\n山田,"1\n2"\r\n佐藤,通常\r\n');
    expect(rows.map((r) => r.lineNumber)).toEqual([1, 2, 4]);
    expect(rows[1].cells).toEqual(["山田", "1\n2"]);
    expect(rows[2].cells).toEqual(["佐藤", "通常"]);
  });

  it("parseCsv と同じセル内容を返す", () => {
    const text = '氏名,メモ\r\n山田,"A,B"\r\n\r\n佐藤,C\r\n';
    expect(parseCsvWithLineNumbers(text).map((r) => r.cells)).toEqual(parseCsv(text));
  });
});
