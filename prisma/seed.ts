/**
 * リピナビ デモデータ シードスクリプト
 *
 * 実行: npx tsx prisma/seed.ts
 * 何度実行しても安全（slug "demo-salon" の店舗と demo ユーザーを削除してから作り直す）。
 * 自己完結スクリプト（src/ からの import はしない。tsx はパスエイリアス @ を解決できないため）。
 */

import { PrismaClient } from "@prisma/client";
import type {
  Customer,
  MessageKind,
  Prisma,
  Reservation,
  Service,
  StaffMember,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const STORE_SLUG = "demo-salon";
const DEMO_EMAIL = "demo@repinavi.jp";

// ========== 乱数（順序依存で毎回破綻しないよう、シード固定のPRNGを使用） ==========

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260826);

function randInt(min: number, max: number): number {
  // min〜max（両端含む）
  return min + Math.floor(rand() * (max - min + 1));
}

// ========== JSTユーティリティ（src/lib/jst.ts と同等のロジックを自己完結で定義） ==========

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

function jstParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const t = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    weekday: t.getUTCDay(),
  };
}

function jstYmd(date: Date): string {
  const { year, month, day } = jstParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" + "HH:mm"（JST解釈）→ Date */
function fromJst(ymd: string, hm = "00:00"): Date {
  return new Date(`${ymd}T${hm}:00+09:00`);
}

/** now から dayOffset 日ずらした日の JST hm 時刻 */
function jstAt(now: Date, dayOffset: number, hm: string): Date {
  return fromJst(jstYmd(new Date(now.getTime() + dayOffset * 86400000)), hm);
}

function jstWeekday(date: Date): number {
  return jstParts(date).weekday; // 0=日
}

function formatJstDate(date: Date): string {
  const { year, month, day, weekday } = jstParts(date);
  return `${year}年${month}月${day}日(${WEEKDAY_JA[weekday]})`;
}

function formatJstDateTime(date: Date): string {
  const { hour, minute } = jstParts(date);
  return `${formatJstDate(date)} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function jstDaysBetween(from: Date, to: Date): number {
  const a = fromJst(jstYmd(from)).getTime();
  const b = fromJst(jstYmd(to)).getTime();
  return Math.round((b - a) / 86400000);
}

function addHoursDate(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

function addDaysDate(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

// ========== テンプレート描画（src/lib/templates.ts と同等） ==========

function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{([^{}\n]+)\}/g, (_m, key: string) => vars[key] ?? "");
}

// ========== デフォルトテンプレート（src/lib/constants.ts の DEFAULT_TEMPLATES と同文面） ==========

const DEFAULT_TEMPLATES: { kind: MessageKind; name: string; content: string }[] = [
  {
    kind: "BOOKING_CONFIRMATION",
    name: "予約確認（標準）",
    content:
      "{お客様名}様\n\nご予約ありがとうございます。以下の内容で承りました。\n\n■ 日時：{予約日時}\n■ メニュー：{メニュー名}\n■ 担当：{担当者名}\n\nご予約の確認・キャンセルはこちら\n{予約確認リンク}\n\nご来店を心よりお待ちしております。\n{店舗名}",
  },
  {
    kind: "REMINDER",
    name: "前日リマインダー（標準）",
    content:
      "{お客様名}様\n\nご予約日時が近づいてまいりましたのでお知らせいたします。\n\n■ 日時：{予約日時}\n■ メニュー：{メニュー名}\n■ 担当：{担当者名}\n\nご都合が悪くなられた場合は、お手数ですがこちらからご連絡ください。\n{予約確認リンク}\n\nお会いできるのを楽しみにしております。\n{店舗名}",
  },
  {
    kind: "CANCELLATION",
    name: "キャンセル通知（標準）",
    content:
      "{お客様名}様\n\n以下のご予約のキャンセルを承りました。\n\n■ 日時：{予約日時}\n■ メニュー：{メニュー名}\n\nまたのご利用を心よりお待ちしております。\nご予約はこちらから\n{予約リンク}\n\n{店舗名}",
  },
  {
    kind: "RESCHEDULE",
    name: "日時変更通知（標準）",
    content:
      "{お客様名}様\n\nご予約の日時変更を承りました。新しいご予約内容は以下のとおりです。\n\n■ 日時：{予約日時}\n■ メニュー：{メニュー名}\n■ 担当：{担当者名}\n\nご予約の確認はこちら\n{予約確認リンク}\n\nご来店を心よりお待ちしております。\n{店舗名}",
  },
  {
    kind: "THANKS",
    name: "来店お礼（標準）",
    content:
      "{お客様名}様\n\n本日はご来店いただき、誠にありがとうございました。\n仕上がりはいかがでしょうか？\n\nよろしければ、今後のサービス向上のためアンケートにご協力ください。\n{アンケートリンク}\n\nまたのご来店を心よりお待ちしております。\n{店舗名}",
  },
  {
    kind: "REBOOKING",
    name: "再来店リマインド（標準）",
    content:
      "{お客様名}様\n\nいつもご利用ありがとうございます。{店舗名}です。\n\n前回のご来店（{前回来店日}）から{経過日数}日が経ちました。\nそろそろ次回のご来店時期です。\n\nご予約はこちらから簡単にお取りいただけます。\n{予約リンク}\n\nお会いできるのを楽しみにしております。",
  },
  {
    kind: "BIRTHDAY",
    name: "誕生日メッセージ（標準）",
    content:
      "{お客様名}様\n\nお誕生日おめでとうございます！🎂\n{店舗名}スタッフ一同、心よりお祝い申し上げます。\n\n日頃の感謝を込めて、バースデークーポンをお贈りいたします。\n{クーポンリンク}\n\n素敵な一年になりますように。\nまたのご来店をお待ちしております。",
  },
];

// ========== 顧客マスタ（45名） ==========

type CustomerSeed = { name: string; kana: string; gender: "female" | "male" };

const CUSTOMER_SEEDS: CustomerSeed[] = [
  // 0-9: 常連（規則的に来店）
  { name: "小林 結衣", kana: "こばやし ゆい", gender: "female" },
  { name: "加藤 美月", kana: "かとう みつき", gender: "female" },
  { name: "吉田 沙織", kana: "よしだ さおり", gender: "female" },
  { name: "山田 花音", kana: "やまだ かのん", gender: "female" },
  { name: "佐々木 恵美", kana: "ささき えみ", gender: "female" },
  { name: "山口 真央", kana: "やまぐち まお", gender: "female" },
  { name: "松本 彩乃", kana: "まつもと あやの", gender: "female" },
  { name: "井上 千夏", kana: "いのうえ ちなつ", gender: "female" },
  { name: "木村 拓也", kana: "きむら たくや", gender: "male" },
  { name: "林 由佳", kana: "はやし ゆか", gender: "female" },
  // 10-19: 離脱気味（60〜120日来店なし）
  { name: "斎藤 直美", kana: "さいとう なおみ", gender: "female" },
  { name: "清水 琴音", kana: "しみず ことね", gender: "female" },
  { name: "山崎 大輔", kana: "やまざき だいすけ", gender: "male" },
  { name: "森 明日香", kana: "もり あすか", gender: "female" },
  { name: "池田 裕子", kana: "いけだ ゆうこ", gender: "female" },
  { name: "橋本 莉子", kana: "はしもと りこ", gender: "female" },
  { name: "阿部 典子", kana: "あべ のりこ", gender: "female" },
  { name: "石川 翔太", kana: "いしかわ しょうた", gender: "male" },
  { name: "中島 美羽", kana: "なかじま みう", gender: "female" },
  { name: "前田 和子", kana: "まえだ かずこ", gender: "female" },
  // 20-40: 一般（不定期に来店）
  { name: "藤田 陽菜", kana: "ふじた ひな", gender: "female" },
  { name: "後藤 咲良", kana: "ごとう さくら", gender: "female" },
  { name: "岡田 愛梨", kana: "おかだ あいり", gender: "female" },
  { name: "長谷川 舞", kana: "はせがわ まい", gender: "female" },
  { name: "村上 健一", kana: "むらかみ けんいち", gender: "male" },
  { name: "近藤 玲奈", kana: "こんどう れな", gender: "female" },
  { name: "石井 智子", kana: "いしい ともこ", gender: "female" },
  { name: "坂本 奈々", kana: "さかもと なな", gender: "female" },
  { name: "遠藤 美穂", kana: "えんどう みほ", gender: "female" },
  { name: "青木 隆", kana: "あおき たかし", gender: "male" },
  { name: "藤井 桃子", kana: "ふじい ももこ", gender: "female" },
  { name: "西村 早紀", kana: "にしむら さき", gender: "female" },
  { name: "福田 亮", kana: "ふくだ りょう", gender: "male" },
  { name: "太田 麻衣子", kana: "おおた まいこ", gender: "female" },
  { name: "三浦 光", kana: "みうら ひかる", gender: "female" },
  { name: "藤原 涼子", kana: "ふじわら りょうこ", gender: "female" },
  { name: "岡本 実", kana: "おかもと みのる", gender: "male" },
  { name: "中野 芽衣", kana: "なかの めい", gender: "female" },
  { name: "原田 千尋", kana: "はらだ ちひろ", gender: "female" },
  { name: "小川 雅人", kana: "おがわ まさと", gender: "male" },
  { name: "竹内 麗子", kana: "たけうち れいこ", gender: "female" },
  // 41-44: 新規（来店ゼロ・登録のみ）
  { name: "上田 心美", kana: "うえだ ここみ", gender: "female" },
  { name: "杉山 佳奈", kana: "すぎやま かな", gender: "female" },
  { name: "武田 悠斗", kana: "たけだ ゆうと", gender: "male" },
  { name: "松井 梨花", kana: "まつい りか", gender: "female" },
];

const REGULAR_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const LAPSED_IDX = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const NORMAL_IDX = Array.from({ length: 21 }, (_, i) => 20 + i);
const NEWBIE_IDX = [41, 42, 43, 44];
/** 今日が誕生日の顧客（誕生日自動配信のデモ用。全員LINE連携あり） */
const TODAY_BIRTHDAY_IDX = [3, 12, 28];

/** LINE未連携の顧客（約2割） */
function hasLine(idx: number): boolean {
  return idx % 5 !== 4; // 4,9,14,19,24,29,34,39,44 の9名が未連携
}

/** 誕生日登録あり（約7割） */
function hasBirthday(idx: number): boolean {
  return idx % 10 < 7 || TODAY_BIRTHDAY_IDX.includes(idx);
}

// ========== メイン ==========

async function main(): Promise<void> {
  const now = new Date();
  console.log("=== リピナビ デモデータ投入を開始します ===");
  console.log(`実行日時: ${formatJstDateTime(now)}（JST）`);

  // ----- 既存デモデータの削除（何度実行しても安全） -----
  console.log("既存のデモデータを削除しています...");
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  await prisma.store.deleteMany({ where: { slug: STORE_SLUG } });

  // ----- 店舗 -----
  console.log("店舗を作成しています...");
  const businessHours = {
    mon: { open: "10:00", close: "19:00", closed: false },
    tue: { open: "10:00", close: "19:00", closed: false },
    wed: { open: "10:00", close: "19:00", closed: false },
    thu: { open: "10:00", close: "19:00", closed: false },
    fri: { open: "10:00", close: "19:00", closed: false },
    sat: { open: "10:00", close: "19:00", closed: false },
    sun: { open: "10:00", close: "19:00", closed: true },
  };
  const store = await prisma.store.create({
    data: {
      name: "サロン ルミエール",
      slug: STORE_SLUG,
      phone: "03-1234-5678",
      address: "東京都渋谷区神南1-2-3 ルミエールビル2F",
      description:
        "渋谷駅徒歩5分のプライベートヘアサロンです。丁寧なカウンセリングとダメージレスな施術で、お一人おひとりの髪質に合わせたスタイルをご提案します。",
      businessHours,
      slotIntervalMin: 30,
      defaultRebookingIntervalDays: 45,
      // LINEチャネル未設定 = デモモードで動作
    },
  });

  // ----- ログインユーザー -----
  console.log("ログインユーザーを作成しています...");
  await prisma.user.create({
    data: {
      storeId: store.id,
      email: DEMO_EMAIL,
      passwordHash: bcrypt.hashSync("demo1234", 10),
      name: "佐藤 美咲",
      role: "OWNER",
    },
  });

  // ----- メニュー -----
  console.log("メニューを作成しています...");
  const serviceSeeds = [
    { name: "カット", category: "カット", durationMin: 60, price: 4950, repeatIntervalDays: 40, description: "シャンプー・ブロー込みのカットコースです。" },
    { name: "カット+カラー", category: "カラー", durationMin: 120, price: 11000, repeatIntervalDays: 45, description: "カットと全体カラーのセットメニューです。" },
    { name: "カット+パーマ", category: "パーマ", durationMin: 120, price: 12100, repeatIntervalDays: 60, description: "カットとデジタルパーマのセットメニューです。" },
    { name: "トリートメント", category: "ケア", durationMin: 60, price: 5500, repeatIntervalDays: 30, description: "髪質改善に人気の集中トリートメントです。" },
    { name: "ヘッドスパ", category: "ケア", durationMin: 45, price: 4400, repeatIntervalDays: 30, description: "頭皮ケアとリラクゼーションのヘッドスパです。" },
    { name: "縮毛矯正", category: "ストレート", durationMin: 180, price: 16500, repeatIntervalDays: 90, description: "自然な仕上がりの縮毛矯正です。" },
  ];
  const services: Service[] = [];
  for (let i = 0; i < serviceSeeds.length; i++) {
    const s = serviceSeeds[i];
    services.push(
      await prisma.service.create({
        data: { storeId: store.id, sortOrder: i, active: true, ...s },
      })
    );
  }

  // ----- スタッフ -----
  console.log("スタッフを作成しています...");
  const staffSeeds = [
    { name: "佐藤 美咲", title: "スタイリスト" },
    { name: "田中 健太", title: "トップスタイリスト" },
    { name: "鈴木 あゆみ", title: "スタイリスト" },
    { name: "高橋 里奈", title: "アシスタント" },
  ];
  const staffMembers: StaffMember[] = [];
  for (let i = 0; i < staffSeeds.length; i++) {
    staffMembers.push(
      await prisma.staffMember.create({
        data: { storeId: store.id, sortOrder: i, active: true, ...staffSeeds[i] },
      })
    );
  }

  // ----- タグ -----
  console.log("タグを作成しています...");
  const tagSeeds = [
    { name: "常連", color: "#06C755" },
    { name: "カラー好き", color: "#F59E0B" },
    { name: "新規", color: "#0EA5E9" },
    { name: "学生", color: "#8B5CF6" },
    { name: "要フォロー", color: "#EF4444" },
  ];
  const tags = [] as { id: string; name: string }[];
  for (const t of tagSeeds) {
    const created = await prisma.tag.create({ data: { storeId: store.id, ...t } });
    tags.push({ id: created.id, name: created.name });
  }
  const tagByName = new Map(tags.map((t) => [t.name, t.id]));

  // ----- 顧客 -----
  console.log("顧客を作成しています...");
  const { month: nowMonth, day: nowDay } = jstParts(now);
  const customers: Customer[] = [];
  for (let i = 0; i < CUSTOMER_SEEDS.length; i++) {
    const seed = CUSTOMER_SEEDS[i];
    const line = hasLine(i);

    let birthday: Date | null = null;
    if (hasBirthday(i)) {
      const year = 1963 + randInt(0, 42); // 20〜60代
      if (TODAY_BIRTHDAY_IDX.includes(i)) {
        // 今日が誕生日（実行日から動的に計算）
        birthday = fromJst(
          `${year}-${String(nowMonth).padStart(2, "0")}-${String(nowDay).padStart(2, "0")}`
        );
      } else {
        birthday = fromJst(
          `${year}-${String(randInt(1, 12)).padStart(2, "0")}-${String(randInt(1, 28)).padStart(2, "0")}`
        );
      }
    }

    const givenKana = seed.kana.split(" ")[1] ?? seed.kana;
    customers.push(
      await prisma.customer.create({
        data: {
          storeId: store.id,
          name: seed.name,
          kana: seed.kana,
          gender: seed.gender,
          phone: `090-${String(1000 + i * 73).padStart(4, "0")}-${String(2000 + i * 137).slice(-4)}`,
          birthday,
          lineUserId: line ? `demo_U${String(i + 1).padStart(3, "0")}` : null,
          lineDisplayName: line ? givenKana : "",
          notes: i % 9 === 0 ? "猫アレルギーあり。ドリンクはノンカフェイン希望。" : "",
        },
      })
    );
  }

  // ----- 顧客タグ付け（1〜3個） -----
  console.log("顧客にタグを付与しています...");
  const customerTagRows: Prisma.CustomerTagCreateManyInput[] = [];
  const addTag = (customerIdx: number, tagName: string): void => {
    const tagId = tagByName.get(tagName);
    if (!tagId) return;
    const row = { customerId: customers[customerIdx].id, tagId };
    if (!customerTagRows.some((r) => r.customerId === row.customerId && r.tagId === row.tagId)) {
      customerTagRows.push(row);
    }
  };
  for (const i of REGULAR_IDX) {
    addTag(i, "常連");
    if (rand() < 0.4) addTag(i, "カラー好き");
  }
  for (const i of LAPSED_IDX) {
    addTag(i, "要フォロー");
    if (rand() < 0.3) addTag(i, "カラー好き");
    if (rand() < 0.2) addTag(i, "学生");
  }
  for (const i of NORMAL_IDX) {
    const r = rand();
    if (r < 0.35) addTag(i, "カラー好き");
    else if (r < 0.6) addTag(i, "学生");
    else addTag(i, "要フォロー");
    if (rand() < 0.25) addTag(i, "カラー好き");
  }
  for (const i of NEWBIE_IDX) {
    addTag(i, "新規");
    if (rand() < 0.5) addTag(i, "学生");
  }
  await prisma.customerTag.createMany({ data: customerTagRows, skipDuplicates: true });

  // ----- 過去の来店履歴（COMPLETED予約） -----
  console.log("過去の来店履歴を作成しています...");

  /** daysAgo日前の営業時間内（10:00-19:00 JST）のランダムな開始時刻。日曜は前日(土)にずらす */
  const pastVisitStart = (daysAgo: number, durationMin: number): Date => {
    let day = jstAt(now, -daysAgo, "00:00");
    if (jstWeekday(day) === 0) day = addDaysDate(day, -1);
    const latestStartMin = 19 * 60 - durationMin;
    const slots = Math.floor((latestStartMin - 10 * 60) / 30) + 1;
    const startMin = 10 * 60 + randInt(0, slots - 1) * 30;
    return new Date(day.getTime() + startMin * 60000);
  };

  /** サービスを重み付きで選択（カット系が多め） */
  const pickServiceIdx = (): number => {
    const weights = [30, 25, 10, 15, 15, 5];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return 0;
  };

  // 顧客ごとの来店日（daysAgo）を決める
  const visitDaysByCustomer = new Map<number, number[]>();
  for (const i of REGULAR_IDX) {
    // 常連: 間隔30〜45日で規則的に、直近5〜12日前まで
    const days: number[] = [];
    let d = randInt(5, 12);
    while (d <= 175) {
      days.push(d);
      d += randInt(30, 45);
    }
    visitDaysByCustomer.set(i, days);
  }
  for (const i of LAPSED_IDX) {
    // 離脱気味: 最終来店が60〜120日前、その前に1〜2回
    const days: number[] = [];
    let d = randInt(60, 120);
    const n = randInt(2, 3);
    for (let k = 0; k < n && d <= 175; k++) {
      days.push(d);
      d += randInt(30, 55);
    }
    visitDaysByCustomer.set(i, days);
  }
  for (const i of NORMAL_IDX) {
    // 一般: 過去180日内に4〜8回ランダム
    const n = randInt(4, 8);
    const used = new Set<number>();
    const days: number[] = [];
    for (let k = 0; k < n; k++) {
      let d = randInt(10, 175);
      let attempts = 0;
      while (used.has(d) && attempts < 10) {
        d = randInt(10, 175);
        attempts++;
      }
      if (!used.has(d)) {
        used.add(d);
        days.push(d);
      }
    }
    days.sort((a, b) => a - b);
    visitDaysByCustomer.set(i, days);
  }
  // 41-44 は来店ゼロ（登録のみ）

  const pastRows: Prisma.ReservationCreateManyInput[] = [];
  for (const [customerIdx, daysList] of visitDaysByCustomer) {
    for (const daysAgo of daysList) {
      const service = services[pickServiceIdx()];
      const staff = staffMembers[randInt(0, staffMembers.length - 1)];
      const startAt = pastVisitStart(daysAgo, service.durationMin);
      const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
      pastRows.push({
        storeId: store.id,
        customerId: customers[customerIdx].id,
        serviceId: service.id,
        staffId: staff.id,
        startAt,
        endAt,
        status: "COMPLETED",
        source: rand() < 0.7 ? "MANUAL" : rand() < 0.5 ? "WEB" : "LINE",
        price: service.price,
        completedAt: endAt,
      });
    }
  }
  await prisma.reservation.createMany({ data: pastRows });
  const pastReservations = await prisma.reservation.findMany({
    where: { storeId: store.id, status: "COMPLETED" },
    orderBy: { startAt: "asc" },
  });
  console.log(`  過去の来店履歴: ${pastReservations.length}件`);

  // ----- 顧客統計を予約から集計して更新 -----
  console.log("顧客統計を集計しています...");
  const statByCustomer = new Map<
    string,
    { first: Date; last: Date; count: number; spent: number }
  >();
  for (const r of pastReservations) {
    const stat = statByCustomer.get(r.customerId);
    if (!stat) {
      statByCustomer.set(r.customerId, {
        first: r.startAt,
        last: r.startAt,
        count: 1,
        spent: r.price,
      });
    } else {
      if (r.startAt < stat.first) stat.first = r.startAt;
      if (r.startAt > stat.last) stat.last = r.startAt;
      stat.count += 1;
      stat.spent += r.price;
    }
  }
  for (const [customerId, stat] of statByCustomer) {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        firstVisitAt: stat.first,
        lastVisitAt: stat.last,
        visitCount: stat.count,
        totalSpent: stat.spent,
      },
    });
  }

  // ----- 今後の予約 -----
  console.log("今後の予約を作成しています...");
  type FuturePlan = {
    dayOffset: number;
    hm: string;
    serviceIdx: number;
    staffIdx: number;
    customerIdx: number;
    pending?: boolean;
  };
  // 担当スタッフの時間が重複しないように固定スケジュールで作成
  const futurePlans: FuturePlan[] = [
    // 今日 3件
    { dayOffset: 0, hm: "11:00", serviceIdx: 1, staffIdx: 1, customerIdx: 0 },
    { dayOffset: 0, hm: "14:30", serviceIdx: 0, staffIdx: 0, customerIdx: 1 },
    { dayOffset: 0, hm: "16:00", serviceIdx: 3, staffIdx: 2, customerIdx: 2 },
    // 明日 4件
    { dayOffset: 1, hm: "10:00", serviceIdx: 1, staffIdx: 0, customerIdx: 3 },
    { dayOffset: 1, hm: "10:30", serviceIdx: 0, staffIdx: 1, customerIdx: 4 },
    { dayOffset: 1, hm: "13:00", serviceIdx: 5, staffIdx: 2, customerIdx: 5 },
    { dayOffset: 1, hm: "15:00", serviceIdx: 4, staffIdx: 1, customerIdx: 6 },
    // 明後日以降 1週間で 8件（うち1件は Web予約の未確定）
    { dayOffset: 2, hm: "11:00", serviceIdx: 0, staffIdx: 0, customerIdx: 7 },
    { dayOffset: 2, hm: "14:00", serviceIdx: 2, staffIdx: 1, customerIdx: 8 },
    { dayOffset: 3, hm: "10:30", serviceIdx: 1, staffIdx: 2, customerIdx: 9 },
    { dayOffset: 3, hm: "15:00", serviceIdx: 3, staffIdx: 0, customerIdx: 42, pending: true },
    { dayOffset: 4, hm: "13:00", serviceIdx: 0, staffIdx: 1, customerIdx: 20 },
    { dayOffset: 5, hm: "11:00", serviceIdx: 4, staffIdx: 3, customerIdx: 21 },
    { dayOffset: 6, hm: "14:00", serviceIdx: 1, staffIdx: 2, customerIdx: 22 },
    { dayOffset: 7, hm: "10:00", serviceIdx: 5, staffIdx: 0, customerIdx: 23 },
  ];
  const futureReservations: Reservation[] = [];
  for (const plan of futurePlans) {
    const service = services[plan.serviceIdx];
    let startAt = jstAt(now, plan.dayOffset, plan.hm);
    // 明後日以降は日曜（定休日）を避けて翌日にずらす（重複しないことは確認済みの配置）
    if (plan.dayOffset >= 2 && jstWeekday(startAt) === 0) {
      startAt = addDaysDate(startAt, 1);
    }
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    futureReservations.push(
      await prisma.reservation.create({
        data: {
          storeId: store.id,
          customerId: customers[plan.customerIdx].id,
          serviceId: service.id,
          staffId: staffMembers[plan.staffIdx].id,
          startAt,
          endAt,
          status: plan.pending ? "PENDING" : "CONFIRMED",
          source: plan.pending ? "WEB" : rand() < 0.6 ? "MANUAL" : "WEB",
          price: service.price,
          note: plan.pending ? "Web予約からのご予約です。" : "",
        },
      })
    );
  }
  console.log(`  今後の予約: ${futureReservations.length}件`);

  // ----- メッセージテンプレート -----
  console.log("メッセージテンプレートを作成しています...");
  const templateIdByKind = new Map<MessageKind, string>();
  for (const t of DEFAULT_TEMPLATES) {
    const created = await prisma.messageTemplate.create({
      data: { storeId: store.id, kind: t.kind, name: t.name, content: t.content, enabled: true },
    });
    templateIdByKind.set(t.kind, created.id);
  }

  // ----- クーポン -----
  console.log("クーポンを作成しています...");
  const birthdayCoupon = await prisma.coupon.create({
    data: {
      storeId: store.id,
      title: "バースデークーポン",
      description: "お誕生日おめでとうございます。お誕生月のご来店で全メニュー15%OFFにてご案内いたします。",
      discountType: "PERCENT",
      discountValue: 15,
      code: "BDAY15",
      active: true,
    },
  });
  const friendCoupon = await prisma.coupon.create({
    data: {
      storeId: store.id,
      title: "お友だち紹介クーポン",
      description: "お友だちをご紹介いただいたお客様への感謝クーポンです。会計時に1,000円割引いたします。",
      discountType: "AMOUNT",
      discountValue: 1000,
      code: "FRIEND1000",
      active: true,
    },
  });

  // ----- クーポン発行（15件程度・一部使用済み） -----
  console.log("クーポン発行履歴を作成しています...");
  const birthdayIssueIdx = [0, 2, 3, 5, 6, 11, 12, 21, 26, 28]; // LINE連携ありの顧客
  const friendIssueIdx = [1, 7, 8, 22, 30];
  let couponIssueCount = 0;
  for (let k = 0; k < birthdayIssueIdx.length; k++) {
    const idx = birthdayIssueIdx[k];
    const issuedAt = jstAt(now, -randInt(3, 60), "10:00");
    await prisma.couponIssue.create({
      data: {
        couponId: birthdayCoupon.id,
        customerId: customers[idx].id,
        issuedAt,
        usedAt: k % 3 === 0 ? addDaysDate(issuedAt, randInt(2, 10)) : null,
      },
    });
    couponIssueCount++;
  }
  for (let k = 0; k < friendIssueIdx.length; k++) {
    const idx = friendIssueIdx[k];
    const issuedAt = jstAt(now, -randInt(5, 45), "13:00");
    await prisma.couponIssue.create({
      data: {
        couponId: friendCoupon.id,
        customerId: customers[idx].id,
        issuedAt,
        usedAt: k % 2 === 0 ? addDaysDate(issuedAt, randInt(3, 14)) : null,
      },
    });
    couponIssueCount++;
  }

  // ----- アンケート -----
  console.log("アンケートを作成しています...");
  const survey = await prisma.survey.create({
    data: {
      storeId: store.id,
      title: "ご来店満足度アンケート",
      description: "ご来店ありがとうございました。今後のサービス向上のため、ご感想をお聞かせください。",
      questions: [
        { id: "q1", type: "rating", label: "総合満足度を教えてください", required: true },
        {
          id: "q2",
          type: "choice",
          label: "本日のメニューはいかがでしたか",
          options: ["大変満足", "満足", "普通", "不満"],
          required: false,
        },
        { id: "q3", type: "text", label: "ご意見・ご感想があればお聞かせください" },
      ],
      active: true,
    },
  });

  // ----- 自動配信設定（7種すべて有効） -----
  console.log("自動配信設定を作成しています...");
  const automationKinds: MessageKind[] = [
    "BOOKING_CONFIRMATION",
    "REMINDER",
    "CANCELLATION",
    "RESCHEDULE",
    "THANKS",
    "REBOOKING",
    "BIRTHDAY",
  ];
  for (const kind of automationKinds) {
    await prisma.automationSetting.create({
      data: {
        storeId: store.id,
        kind,
        enabled: true,
        offsetValue: kind === "REMINDER" ? 1 : kind === "THANKS" ? 2 : 1,
        offsetUnit: kind === "THANKS" ? "hours" : "days",
        sendHourJst: 10,
        templateId: templateIdByKind.get(kind) ?? null,
        surveyId: kind === "THANKS" ? survey.id : null,
        couponId: kind === "BIRTHDAY" ? birthdayCoupon.id : null,
      },
    });
  }

  // ----- セグメント -----
  console.log("セグメントを作成しています...");
  const lapsedSegment = await prisma.segment.create({
    data: {
      storeId: store.id,
      name: "離脱しかけのお客様",
      rules: { lastVisitDaysMin: 60, hasLine: true },
    },
  });
  await prisma.segment.create({
    data: {
      storeId: store.id,
      name: "常連のお客様",
      rules: { visitCountMin: 5 },
    },
  });

  // ----- キャンペーン -----
  console.log("キャンペーンを作成しています...");
  const campaignSentAt = jstAt(now, -14, "11:00");
  // 配信済みキャンペーン（2週間前送信・MessageLog 12件）
  const rainCampaignTargets = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 20, 21]; // 全員LINE連携あり
  const rainCampaignContent =
    "{お客様名}様\n\nいつもサロン ルミエールをご利用いただきありがとうございます。\n\n雨の日限定キャンペーンのお知らせです☔\n雨の日にご来店いただいたお客様は、全メニュー10%OFFにてご案内いたします。\n\n梅雨の時期の髪のうねり・広がりのお悩みも、ぜひご相談ください。\n\nご予約はこちらから\n{予約リンク}";
  const rainCampaign = await prisma.campaign.create({
    data: {
      storeId: store.id,
      title: "雨の日キャンペーン",
      content: rainCampaignContent,
      filters: { hasLine: true },
      status: "SENT",
      sentAt: campaignSentAt,
      targetCount: rainCampaignTargets.length,
      sentCount: rainCampaignTargets.length,
    },
  });
  // 下書きキャンペーン
  await prisma.campaign.create({
    data: {
      storeId: store.id,
      title: "秋のトリートメントキャンペーン",
      content:
        "{お客様名}様\n\n朝晩が涼しくなってまいりましたね。\n夏の紫外線ダメージが気になる季節、集中トリートメントで髪にうるおいを取り戻しませんか？\n\n9月中はトリートメントを通常¥5,500のところ¥4,400にてご案内いたします。\n\nご予約はこちらから\n{予約リンク}",
      segmentId: lapsedSegment.id,
      couponId: friendCoupon.id,
      status: "DRAFT",
    },
  });

  // ----- メッセージログ履歴 -----
  console.log("メッセージログを作成しています...");
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const staffById = new Map(staffMembers.map((s) => [s.id, s]));
  const templateByKind = new Map(DEFAULT_TEMPLATES.map((t) => [t.kind, t.content]));
  const logRows: Prisma.MessageLogCreateManyInput[] = [];

  const buildVars = (customer: Customer, reservation?: Reservation): Record<string, string> => {
    const vars: Record<string, string> = {
      お客様名: customer.name,
      店舗名: store.name,
      予約リンク: `${APP_URL}/r/${store.slug}`,
      アンケートリンク: `${APP_URL}/s/demo-survey-token`,
      クーポンリンク: `${APP_URL}/c/demo-coupon-token`,
    };
    if (reservation) {
      const service = reservation.serviceId ? serviceById.get(reservation.serviceId) : undefined;
      const staff = reservation.staffId ? staffById.get(reservation.staffId) : undefined;
      vars["予約日時"] = formatJstDateTime(reservation.startAt);
      vars["メニュー名"] = service?.name ?? "ご指定のメニュー";
      vars["担当者名"] = staff?.name ?? "指名なし";
      vars["予約確認リンク"] = `${APP_URL}/v/${reservation.publicToken}`;
    }
    return vars;
  };

  const pushLog = (
    kind: MessageKind,
    customer: Customer,
    sentAt: Date,
    content: string,
    reservationId?: string,
    campaignId?: string
  ): void => {
    const linked = customer.lineUserId !== null;
    logRows.push({
      storeId: store.id,
      customerId: customer.id,
      reservationId: reservationId ?? null,
      campaignId: campaignId ?? null,
      kind,
      channel: "DEMO",
      status: linked ? "SENT" : "SKIPPED",
      content,
      error: linked ? "" : "LINE未連携のため送信をスキップしました",
      sentAt,
    });
  };

  // 過去のCOMPLETED予約に紐づく THANKS / REMINDER ログ
  for (const r of pastReservations) {
    const customer = customerById.get(r.customerId);
    if (!customer || !r.completedAt) continue;
    const daysAgo = jstDaysBetween(r.startAt, now);
    // 直近75日分に来店お礼ログ
    if (daysAgo <= 75) {
      const content = renderTemplate(templateByKind.get("THANKS") ?? "", buildVars(customer, r));
      pushLog("THANKS", customer, addHoursDate(r.completedAt, 2), content, r.id);
    }
    // 直近45日分に前日リマインダーログ
    if (daysAgo <= 45) {
      const content = renderTemplate(templateByKind.get("REMINDER") ?? "", buildVars(customer, r));
      pushLog("REMINDER", customer, addDaysDate(r.startAt, -1), content, r.id);
    }
  }

  // 離脱気味の顧客への再来店リマインドログ（数件）
  const rebookingTargets = [10, 11, 12, 13, 15].filter((i) => hasLine(i));
  for (let k = 0; k < rebookingTargets.length; k++) {
    const idx = rebookingTargets[k];
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customers[idx].id },
    });
    const sentAt = jstAt(now, -(2 + k * 2), "10:00");
    const vars = buildVars(customer);
    if (customer.lastVisitAt) {
      vars["前回来店日"] = formatJstDate(customer.lastVisitAt);
      vars["経過日数"] = String(jstDaysBetween(customer.lastVisitAt, sentAt));
    }
    const content = renderTemplate(templateByKind.get("REBOOKING") ?? "", vars);
    pushLog("REBOOKING", customer, sentAt, content);
  }

  // 配信済みキャンペーンのログ（12件）
  for (const idx of rainCampaignTargets) {
    const customer = customers[idx];
    const content = renderTemplate(rainCampaignContent, buildVars(customer));
    pushLog("CAMPAIGN", customer, campaignSentAt, content, undefined, rainCampaign.id);
  }

  await prisma.messageLog.createMany({ data: logRows });
  console.log(`  メッセージログ: ${logRows.length}件`);

  // ----- アンケート依頼・回答 -----
  console.log("アンケート依頼と回答を作成しています...");
  // 直近のCOMPLETED予約30件に依頼を紐付け
  const surveyTargets = [...pastReservations]
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
    .slice(0, 30);

  // 評価分布: 5×10, 4×7, 3×3, 2×1, 1×1（先頭22件が回答済み）
  const ratings = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 2, 1];
  // シャッフル（シード固定）
  for (let i = ratings.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ratings[i], ratings[j]] = [ratings[j], ratings[i]];
  }
  const commentPool: Record<number, string[]> = {
    5: [
      "毎回丁寧にカウンセリングしてくださるので、安心してお任せできます。",
      "仕上がりがとても気に入りました。友人にもぜひ紹介したいです。",
      "田中さんのカットがいつも最高です。次回もよろしくお願いします。",
      "ヘッドスパがとても気持ちよくて、癒やしの時間になりました。",
    ],
    4: [
      "とても良かったです。次はカラーもお願いしたいと思います。",
      "居心地の良い時間でした。土日の予約がもう少し取りやすいと嬉しいです。",
      "仕上がりに満足しています。ありがとうございました。",
    ],
    3: ["可もなく不可もなくといった感じでした。待ち時間が少し長かったです。"],
    2: ["待ち時間が長く、仕上がりも思っていたイメージと少し違いました。"],
    1: ["希望した髪型と違う仕上がりになってしまい残念でした。"],
  };
  const commentBudget: Record<number, number> = { 5: 4, 4: 3, 3: 1, 2: 1, 1: 1 };
  const choiceByRating: Record<number, string> = {
    5: "大変満足",
    4: "満足",
    3: "普通",
    2: "不満",
    1: "不満",
  };

  let responseCount = 0;
  for (let k = 0; k < surveyTargets.length; k++) {
    const r = surveyTargets[k];
    const sentAt = addHoursDate(r.completedAt ?? r.endAt, 2);
    const answered = k < 22;
    const respondedAt = answered ? addHoursDate(sentAt, randInt(1, 36)) : null;
    const request = await prisma.surveyRequest.create({
      data: {
        surveyId: survey.id,
        customerId: r.customerId,
        reservationId: r.id,
        sentAt,
        respondedAt,
      },
    });
    if (!answered || !respondedAt) continue;

    const rating = ratings[responseCount];
    let comment = "";
    if (commentBudget[rating] > 0 && commentPool[rating].length > 0) {
      comment = commentPool[rating].shift() ?? "";
      commentBudget[rating] -= 1;
    }
    const answers: Record<string, number | string> = { q1: rating };
    if (rand() < 0.85) answers["q2"] = choiceByRating[rating];
    if (comment) answers["q3"] = comment;
    await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        requestId: request.id,
        customerId: r.customerId,
        reservationId: r.id,
        answers,
        rating,
        comment,
        createdAt: respondedAt,
      },
    });
    responseCount++;
  }
  console.log(`  アンケート依頼: ${surveyTargets.length}件 / 回答: ${responseCount}件`);

  // ----- 集計 -----
  const [customerCount, reservationCount, logCount, templateCount, issueCount] = await Promise.all([
    prisma.customer.count({ where: { storeId: store.id } }),
    prisma.reservation.count({ where: { storeId: store.id } }),
    prisma.messageLog.count({ where: { storeId: store.id } }),
    prisma.messageTemplate.count({ where: { storeId: store.id } }),
    prisma.couponIssue.count({ where: { coupon: { storeId: store.id } } }),
  ]);
  console.log("=== デモデータ投入が完了しました ===");
  console.log(`店舗: サロン ルミエール（slug: ${STORE_SLUG}）`);
  console.log(`ログイン: ${DEMO_EMAIL} / demo1234`);
  console.log(`顧客数: ${customerCount}名`);
  console.log(`予約数: ${reservationCount}件（うち過去の来店 ${pastReservations.length}件・今後 ${futureReservations.length}件）`);
  console.log(`メッセージログ: ${logCount}件`);
  console.log(`テンプレート: ${templateCount}件 / クーポン発行: ${issueCount}件`);
}

main()
  .catch((e) => {
    console.error("シード実行中にエラーが発生しました:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
