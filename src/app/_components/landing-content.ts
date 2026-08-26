import {
  BarChart3,
  BellRing,
  CalendarCheck,
  HeartHandshake,
  Hourglass,
  MessageSquareHeart,
  PhoneOff,
  PlugZap,
  Repeat2,
  Sparkles,
  Store,
  TicketPercent,
  ToggleRight,
  TrendingDown,
  Users,
  type LucideIcon,
} from "lucide-react";

export type LandingItem = {
  icon: LucideIcon;
  title: string;
  body: string;
};

/** ヒーロー下の信頼指標バンド */
export const TRUST_POINTS: LandingItem[] = [
  {
    icon: Users,
    title: "国内MAU 1億人超のLINEで届く",
    body: "メールや電話ではなく、お客様がふだん使うアプリへ。連絡先を聞き直す必要もありません。",
  },
  {
    icon: MessageSquareHeart,
    title: "開封率の高いトークで確実に",
    body: "受信箱に埋もれがちなメールと違い、いつものトーク画面に届くから読まれやすくなります。",
  },
  {
    icon: Sparkles,
    title: "導入後すぐに使えるデモデータ付き",
    body: "LINE公式アカウントの接続前でも、デモモードで配信の流れをひととおり確認できます。",
  },
];

/** 課題提起セクション */
export const PROBLEMS: LandingItem[] = [
  {
    icon: PhoneOff,
    title: "電話・メールでの連絡に時間が取られる",
    body: "予約確認、前日の念押し、変更の連絡。施術の合間に何度も手を止めていませんか。",
  },
  {
    icon: TrendingDown,
    title: "お客様が離れていくのに気づけない",
    body: "しばらく来ていないお客様は、カルテを見返さないと分かりません。気づいたときには他店へ。",
  },
  {
    icon: Hourglass,
    title: "再来店のご案内まで手が回らない",
    body: "「そろそろの時期です」の一言が売上を左右すると分かっていても、毎日は続けられません。",
  },
];

/** 機能セクション */
export const FEATURES: LandingItem[] = [
  {
    icon: CalendarCheck,
    title: "予約確認の自動送信",
    body: "予約が入ったその場で、日時・メニュー・担当者をLINEでお知らせ。お客様は届いたメッセージから内容の確認とキャンセルができます。",
  },
  {
    icon: BellRing,
    title: "リマインダー",
    body: "前日や当日など、設定したタイミングで自動リマインド。うっかり忘れによる直前キャンセルや無断キャンセルを減らします。",
  },
  {
    icon: HeartHandshake,
    title: "来店お礼とアンケート",
    body: "ご来店の後にお礼メッセージを自動送信。満足度アンケートを添えれば、お客様の声がそのまま管理画面に集まります。",
  },
  {
    icon: Repeat2,
    title: "再来店リマインド",
    body: "メニューごとの推奨来店間隔を過ぎたお客様へ、ちょうどよいタイミングでご案内。離れかけたお客様を放置しません。",
  },
  {
    icon: TicketPercent,
    title: "クーポンとキャンペーン",
    body: "デジタルクーポンの発行から店頭での消込まで管理できます。セグメントを絞った一斉配信や誕生日クーポンにも対応。",
  },
  {
    icon: BarChart3,
    title: "分析レポート",
    body: "来店数・リピート率・配信実績・クーポン利用をグラフで可視化。どの施策が再来店につながったのかが分かります。",
  },
];

export type LandingStep = {
  icon: LucideIcon;
  title: string;
  body: string;
};

/** 使い方セクション */
export const STEPS: LandingStep[] = [
  {
    icon: Store,
    title: "店舗とメニューを登録",
    body: "営業時間・メニュー・スタッフを登録します。最初からデモデータが入っているので、書き換えるところから始められます。",
  },
  {
    icon: PlugZap,
    title: "LINE公式アカウントを接続",
    body: "Messaging APIのチャネル情報を貼り付けるだけ。まだお持ちでなくても、デモモードで文面と動作を確認できます。",
  },
  {
    icon: ToggleRight,
    title: "自動配信をオンにするだけ",
    body: "送りたい配信のスイッチをオンにすれば運用開始。文面はテンプレートを編集して、お店の言葉に変えられます。",
  },
];

/** 「できること」チェックリスト */
export const CAPABILITIES: string[] = [
  "予約の確認・日時変更・キャンセルの自動連絡",
  "前日リマインドによる直前キャンセルの抑止",
  "来店お礼メッセージと満足度アンケートの自動送付",
  "前回来店からの経過日数に応じた再来店のご案内",
  "誕生日のお祝いメッセージとバースデークーポン",
  "スマホから24時間受け付けられるWeb予約ページ",
  "最終来店日・来店回数・タグで絞り込んだ一斉配信",
  "施術内容を残せるカルテと来店履歴の管理",
  "臨時休業日の設定とWeb予約への即時反映",
  "リピート率・配信実績・売上の分析レポート",
];

export type LandingFaq = {
  question: string;
  answer: string;
};

/** よくある質問 */
export const FAQS: LandingFaq[] = [
  {
    question: "LINE公式アカウントは必要ですか？",
    answer:
      "実際にお客様へ配信するには、LINE公式アカウント（Messaging APIチャネル）が必要です。まだお持ちでない場合でも、リピナビはデモモードで動作しますので、アカウントの準備と並行して文面づくりや設定を進められます。",
  },
  {
    question: "導入にはどれくらい時間がかかりますか？",
    answer:
      "店舗登録そのものは1分ほどで完了します。メニュー・スタッフの登録とLINE公式アカウントの接続を含めても、当日中に配信を始めていただけます。",
  },
  {
    question: "既存の予約システムと併用できますか？",
    answer:
      "はい。リピナビのWeb予約ページを使わず、他システムで受けた予約を管理画面に登録して、LINE配信だけを自動化する使い方もできます。まずは配信からお試しください。",
  },
  {
    question: "顧客情報は安全に扱われますか？",
    answer:
      "お客様の情報は店舗ごとに分離して保管され、ログイン中の店舗のデータ以外は参照できない仕組みです。ログインパスワードはハッシュ化して保存しています。",
  },
  {
    question: "無料で試せますか？",
    answer:
      "はい。クレジットカードの登録なしでアカウントを作成できます。デモデータが入った状態から始められるので、実際の運用イメージを確かめてからご判断いただけます。",
  },
];
