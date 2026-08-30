import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Customer, Reservation, Service, StaffMember, Store } from "@prisma/client";
import { buildCustomerVars, buildReservationVars, renderTemplate } from "@/lib/templates";
import { DEFAULT_TEMPLATES } from "@/lib/constants";
import { fromJst } from "@/lib/jst";

// getAppUrl() の結果を決定的にするため、テスト中は APP_URL を固定する
const ORIGINAL_APP_URL = process.env.APP_URL;
beforeAll(() => {
  process.env.APP_URL = "https://repinavi.example";
});
afterAll(() => {
  if (ORIGINAL_APP_URL === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = ORIGINAL_APP_URL;
});

describe("renderTemplate", () => {
  it("プレースホルダーを変数で置換する", () => {
    expect(renderTemplate("こんにちは、{お客様名}様", { "お客様名": "田中" })).toBe(
      "こんにちは、田中様"
    );
  });

  it("未提供のプレースホルダーは空文字になる", () => {
    expect(renderTemplate("{お客様名}様 {クーポンリンク}", { "お客様名": "田中" })).toBe(
      "田中様 "
    );
  });

  it("同じプレースホルダーが複数回出現してもすべて置換される", () => {
    expect(
      renderTemplate("{店舗名}です。{店舗名}をよろしくお願いします。", { "店舗名": "サロンA" })
    ).toBe("サロンAです。サロンAをよろしくお願いします。");
  });

  it("プレースホルダーの無い文面はそのまま返る", () => {
    const content = "本日はご来店ありがとうございました。";
    expect(renderTemplate(content, { "お客様名": "田中" })).toBe(content);
  });

  it("空文字の変数値も置換される（キー提供済みなら空文字）", () => {
    expect(renderTemplate("担当: {担当者名}", { "担当者名": "" })).toBe("担当: ");
  });

  it("改行を含む波括弧はプレースホルダー扱いされない", () => {
    const content = "{お客様\n名}";
    expect(renderTemplate(content, { "お客様名": "田中" })).toBe(content);
  });

  it("複数のプレースホルダーを一度に置換できる", () => {
    expect(
      renderTemplate("{お客様名}様、{店舗名}です。", {
        "お客様名": "山田",
        "店舗名": "サロンB",
      })
    ).toBe("山田様、サロンBです。");
  });
});

const store = { name: "サロンリピナビ", slug: "salon-repinavi" } as Store;

describe("buildCustomerVars", () => {
  it("基本の変数（お客様名・店舗名・予約リンク）を構築する", () => {
    const customer = { name: "山田花子", lastVisitAt: null } as Customer;
    const vars = buildCustomerVars(store, customer);
    expect(vars["お客様名"]).toBe("山田花子");
    expect(vars["店舗名"]).toBe("サロンリピナビ");
    expect(vars["予約リンク"]).toBe("https://repinavi.example/r/salon-repinavi");
  });

  it("最終来店日が無い場合は前回来店日・経過日数を含まない", () => {
    const customer = { name: "山田花子", lastVisitAt: null } as Customer;
    const vars = buildCustomerVars(store, customer);
    expect("前回来店日" in vars).toBe(false);
    expect("経過日数" in vars).toBe(false);
  });

  it("最終来店日がある場合は前回来店日（JST表記）と経過日数を含む", () => {
    const customer = {
      name: "山田花子",
      lastVisitAt: fromJst("2026-08-01", "11:00"),
    } as Customer;
    const now = fromJst("2026-08-26", "09:00");
    const vars = buildCustomerVars(store, customer, now);
    expect(vars["前回来店日"]).toBe("2026年8月1日(土)");
    expect(vars["経過日数"]).toBe("25");
  });

  it("経過日数はJSTの日付境界ベースで計算される", () => {
    const customer = {
      name: "山田花子",
      // JST 2026-08-25 23:59
      lastVisitAt: fromJst("2026-08-25", "23:59"),
    } as Customer;
    // JST 2026-08-26 00:01 → 時刻差は2分でも日付が変わるので1日
    const vars = buildCustomerVars(store, customer, fromJst("2026-08-26", "00:01"));
    expect(vars["経過日数"]).toBe("1");
  });
});

describe("buildReservationVars", () => {
  const customer = { name: "佐藤太郎", lastVisitAt: null } as Customer;
  const service = { name: "カット＋カラー" } as Service;
  const staff = { name: "鈴木" } as StaffMember;

  it("予約関連の変数を構築する（顧客・店舗の変数も含む）", () => {
    const reservation = {
      startAt: fromJst("2026-09-01", "14:30"),
      publicToken: "tok123",
      service,
      staff,
    } as Reservation & { service?: Service | null; staff?: StaffMember | null };

    const vars = buildReservationVars(store, customer, reservation);
    expect(vars["予約日時"]).toBe("2026年9月1日(火) 14:30");
    expect(vars["メニュー名"]).toBe("カット＋カラー");
    expect(vars["担当者名"]).toBe("鈴木");
    expect(vars["予約確認リンク"]).toBe("https://repinavi.example/v/tok123");
    // 顧客・店舗の変数も含まれる
    expect(vars["お客様名"]).toBe("佐藤太郎");
    expect(vars["店舗名"]).toBe("サロンリピナビ");
    expect(vars["予約リンク"]).toBe("https://repinavi.example/r/salon-repinavi");
  });

  it("メニュー・担当者が未設定ならフォールバック文言になる", () => {
    const reservation = {
      startAt: fromJst("2026-09-01", "14:30"),
      publicToken: "tok456",
      service: null,
      staff: null,
    } as Reservation & { service?: Service | null; staff?: StaffMember | null };

    const vars = buildReservationVars(store, customer, reservation);
    expect(vars["メニュー名"]).toBe("ご指定のメニュー");
    expect(vars["担当者名"]).toBe("指名なし");
  });

  it("予約日時はUTC保存の日時をJSTで表記する", () => {
    const reservation = {
      // UTC 2026-08-31T15:00 = JST 2026-09-01 00:00（火）
      startAt: new Date("2026-08-31T15:00:00Z"),
      publicToken: "tok789",
      service: null,
      staff: null,
    } as Reservation & { service?: Service | null; staff?: StaffMember | null };

    const vars = buildReservationVars(store, customer, reservation);
    expect(vars["予約日時"]).toBe("2026年9月1日(火) 00:00");
  });
});

describe("条件ブロック（設定されていない項目の出し分け）", () => {
  it("値があるときはブロックの中身を残す", () => {
    const out = renderTemplate(
      "こんにちは\n\n{{#クーポンリンク}}クーポンです\n{クーポンリンク}\n{{/クーポンリンク}}\nまたお越しください",
      { "クーポンリンク": "https://example.com/c/abc" }
    );
    expect(out).toContain("クーポンです");
    expect(out).toContain("https://example.com/c/abc");
  });

  it("値が無いときはブロックごと消す（空リンクの文面を送らない）", () => {
    const out = renderTemplate(
      "こんにちは\n\n{{#クーポンリンク}}クーポンです\n{クーポンリンク}\n{{/クーポンリンク}}\nまたお越しください",
      {}
    );
    expect(out).not.toContain("クーポンです");
    expect(out).not.toContain("{クーポンリンク}");
    expect(out).toContain("こんにちは");
    expect(out).toContain("またお越しください");
  });

  it("空文字の値も「無い」として扱う", () => {
    const out = renderTemplate("{{#アンケートリンク}}回答はこちら{アンケートリンク}{{/アンケートリンク}}", {
      "アンケートリンク": "   ",
    });
    expect(out).toBe("");
  });

  it("複数のブロックをそれぞれ独立して判定する", () => {
    const tpl =
      "本文\n{{#アンケートリンク}}アンケート{アンケートリンク}\n{{/アンケートリンク}}{{#クーポンリンク}}クーポン{クーポンリンク}\n{{/クーポンリンク}}締め";
    const out = renderTemplate(tpl, { "クーポンリンク": "https://example.com/c/x" });
    expect(out).not.toContain("アンケート");
    expect(out).toContain("クーポン");
    expect(out).toContain("締め");
  });

  it("出し分けで生じた余分な空行を残さない", () => {
    const out = renderTemplate(
      "一行目\n\n{{#クーポンリンク}}クーポン\n{{/クーポンリンク}}\n\n最終行",
      {}
    );
    expect(out).not.toMatch(/\n{3,}/);
  });
});

describe("標準テンプレートが未設定時に壊れないこと", () => {
  it("来店お礼: アンケートもクーポンも未設定なら、それらの文が残らない", () => {
    const tpl = DEFAULT_TEMPLATES.find((t) => t.kind === "THANKS")!;
    const out = renderTemplate(tpl.content, {
      "お客様名": "山田 花子",
      "店舗名": "サロン ルミエール",
    });
    expect(out).not.toContain("アンケート");
    expect(out).not.toContain("クーポン");
    expect(out).not.toMatch(/\{[^}]+\}/); // 未解決のプレースホルダーが残らない
    expect(out).toContain("本日はご来店いただき");
  });

  it("来店お礼: クーポンを添付したときはリンクが本文に入る", () => {
    const tpl = DEFAULT_TEMPLATES.find((t) => t.kind === "THANKS")!;
    const out = renderTemplate(tpl.content, {
      "お客様名": "山田 花子",
      "店舗名": "サロン ルミエール",
      "クーポンリンク": "https://example.com/c/token",
    });
    expect(out).toContain("https://example.com/c/token");
  });

  it("再来店リマインド: クーポンを添付したときはリンクが本文に入る", () => {
    const tpl = DEFAULT_TEMPLATES.find((t) => t.kind === "REBOOKING")!;
    const out = renderTemplate(tpl.content, {
      "お客様名": "山田 花子",
      "店舗名": "サロン ルミエール",
      "前回来店日": "2026年7月1日(水)",
      "経過日数": "45",
      "予約リンク": "https://example.com/r/demo",
      "クーポンリンク": "https://example.com/c/token",
    });
    expect(out).toContain("https://example.com/c/token");
  });

  it("誕生日: クーポン未設定でも文面が壊れない", () => {
    const tpl = DEFAULT_TEMPLATES.find((t) => t.kind === "BIRTHDAY")!;
    const out = renderTemplate(tpl.content, {
      "お客様名": "山田 花子",
      "店舗名": "サロン ルミエール",
    });
    expect(out).not.toContain("クーポン");
    expect(out).not.toMatch(/\{[^}]+\}/);
    expect(out).toContain("お誕生日おめでとうございます");
  });
});
