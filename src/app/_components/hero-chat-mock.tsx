import { MessageCircleHeart, Zap } from "lucide-react";

type MockMessage = {
  /** 吹き出しの向き（店舗＝右の緑、お客様＝左の白） */
  side: "store" | "customer";
  /** 自動配信の種別ラベル（店舗側のみ） */
  label?: string;
  time: string;
  lines: string[];
  /** リンク風に下線表示するテキスト */
  linkText?: string;
};

type MockRow =
  | { type: "date"; date: string }
  | ({ type: "message" } & MockMessage);

const ROWS: MockRow[] = [
  { type: "date", date: "3月13日(金)" },
  {
    type: "message",
    side: "store",
    label: "予約確認",
    time: "10:12",
    lines: [
      "田中 様",
      "ご予約ありがとうございます。以下の内容で承りました。",
      "■ 日時：3月15日(日) 11:00",
      "■ メニュー：カット＋カラー",
    ],
    linkText: "予約内容を確認する",
  },
  {
    type: "message",
    side: "customer",
    time: "10:14",
    lines: ["ありがとうございます！", "当日はよろしくお願いします。"],
  },
  { type: "date", date: "3月14日(土)" },
  {
    type: "message",
    side: "store",
    label: "前日リマインダー",
    time: "18:00",
    lines: [
      "明日 11:00 からご予約をいただいております。",
      "お会いできるのを楽しみにしております。",
    ],
  },
  { type: "date", date: "3月15日(日)" },
  {
    type: "message",
    side: "store",
    label: "来店お礼",
    time: "13:20",
    lines: [
      "本日はご来店いただき、ありがとうございました。",
      "よろしければアンケートにご協力ください。",
    ],
    linkText: "アンケートに回答する",
  },
  { type: "date", date: "4月29日(水)" },
  {
    type: "message",
    side: "store",
    label: "再来店リマインド",
    time: "11:00",
    lines: [
      "前回のご来店から45日が経ちました。",
      "そろそろ次回のご来店時期です。",
    ],
    linkText: "空き状況を見る",
  },
];

function Bubble({ message }: { message: MockMessage }) {
  const isStore = message.side === "store";

  return (
    <div className={isStore ? "flex flex-col items-end" : "flex flex-col items-start"}>
      {message.label ? (
        <span className="mb-1 mr-1 text-[10px] font-medium text-gray-400">
          自動配信・{message.label}
        </span>
      ) : null}
      <div className={isStore ? "flex items-end justify-end gap-1.5" : "flex items-end gap-1.5"}>
        {isStore ? (
          <span className="mb-0.5 shrink-0 text-[10px] text-gray-400">{message.time}</span>
        ) : null}
        <div
          className={
            isStore
              ? "max-w-[15rem] rounded-2xl rounded-tr-md bg-brand px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm"
              : "max-w-[15rem] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-800 shadow-sm"
          }
        >
          {message.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {message.linkText ? (
            <p className="mt-1.5 underline decoration-white/60 underline-offset-2">
              {message.linkText}
            </p>
          ) : null}
        </div>
        {isStore ? null : (
          <span className="mb-0.5 shrink-0 text-[10px] text-gray-400">{message.time}</span>
        )}
      </div>
    </div>
  );
}

/** ヒーロー右側に置くLINEトーク風の配信イメージ */
export function HeroChatMock() {
  return (
    <figure className="relative mx-auto w-full max-w-sm">
      <div
        aria-hidden="true"
        className="absolute -inset-3 rounded-[2.5rem] bg-brand/10 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-xl shadow-gray-900/10">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark">
            <MessageCircleHeart aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-gray-900">
              サロン ルミエール
            </span>
            <span className="block text-[11px] text-gray-400">LINE公式アカウント</span>
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-light px-2 py-1 text-[10px] font-medium text-brand-dark">
            <Zap aria-hidden="true" className="h-3 w-3" />
            自動配信
          </span>
        </div>

        <div className="space-y-3 bg-[#eef1f5] px-4 py-5">
          {ROWS.map((row) =>
            row.type === "date" ? (
              <div key={row.date} className="flex justify-center">
                <span className="rounded-full bg-gray-900/10 px-3 py-0.5 text-[10px] font-medium text-gray-600">
                  {row.date}
                </span>
              </div>
            ) : (
              <Bubble key={`${row.time}-${row.lines[0]}`} message={row} />
            )
          )}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-gray-500">
        ※ 配信イメージです。文面はテンプレートで自由に編集できます。
      </figcaption>
    </figure>
  );
}
