# リピナビ

**LINEで、リピーターを自動で育てる。**

美容室・ネイルサロン・マツエクサロン・エステサロンなどのB2Cサービス事業者向けの、LINE顧客リピート自動化マイクロSaaSです。手作業の顧客連絡にかかる時間を削減しながら、リピート来店を増やします。

## 主な機能

| 機能 | 説明 |
| --- | --- |
| 予約確認の自動送信 | 予約の登録・確定時にLINEで予約内容を自動送信 |
| リマインダー | 予約前日（設定可）に自動リマインド |
| キャンセル・日時変更通知 | ステータス変更時に自動でお知らせ |
| 来店お礼メッセージ | 来店後に自動でサンクスメッセージ＋アンケート・クーポン添付 |
| 満足度アンケート | 星評価・選択式・自由記述のアンケートを作成し、回答を自動集計 |
| デジタルクーポン | 発行・配布・店頭消込までを管理 |
| 再来店リマインド | メニューごとの推奨来店間隔を過ぎたお客様に自動でご案内 |
| 誕生日メッセージ | 誕生日当日にお祝い＋クーポンを自動送信 |
| 顧客セグメント | 最終来店日・来店回数・タグなどで顧客を抽出 |
| キャンペーン配信 | セグメントを対象に一斉配信（即時／予約配信） |
| 分析レポート | 来店数・リピート率・配信実績・クーポン・アンケートを可視化 |
| Web予約ページ | 公開予約ページ（スマホ最適化）から24時間予約受付 |
| モバイル対応ダッシュボード | スマホでも操作しやすい管理画面 |

## 技術スタック

- **Next.js 15**（App Router）+ TypeScript + React 19
- **Tailwind CSS v4** + Radix UI
- **Prisma 6** + PostgreSQL（Docker）
- **LINE Messaging API**（`@line/bot-sdk`）
- 認証: jose（JWT）+ bcryptjs / バリデーション: zod / チャート: recharts / テスト: vitest

## セットアップ

```bash
# 1. 依存をインストール
npm install

# 2. 環境変数を用意（.env.example をコピーして編集）
cp .env.example .env

# 3. PostgreSQL を起動（Docker）
npm run db:up

# 4. スキーマを反映
npm run db:push

# 5. デモデータを投入
npm run db:seed

# 6. 開発サーバーを起動
npm run dev
```

http://localhost:3000 を開き、デモアカウントでログインできます。

> **デモアカウント**: `demo@repinavi.jp` / `demo1234`

## デモモードについて

店舗のLINEチャネル（Channel Access Token）が未設定の間は**デモモード**で動作します。メッセージは実送信されず、すべて「メッセージ履歴」に記録されるため、LINE公式アカウントがなくても全機能を試せます。

実際にLINE送信を行うには、ダッシュボードの **設定 → LINE連携** で以下を設定してください。

1. [LINE Developers](https://developers.line.biz/) でMessaging APIチャネルを作成
2. Channel Access Token（長期）と Channel Secret を取得して保存
3. Webhook URL（設定画面に表示されます）をチャネルに登録し、Webhookを有効化
4. LINE公式アカウントの応答メッセージ（自動応答）をオフ

## 自動配信エンジン

自動配信（リマインダー／来店お礼／再来店リマインド／誕生日／キャンペーン）は冪等な配信エンジン（`src/lib/automation/`）が担います。送信済み判定はメッセージログに基づくため、何度実行しても重複送信されません。

- **開発環境**: `.env` の `AUTOMATION_INTERVAL_MS`（既定 60000）でアプリ内スケジューラが定期実行
- **本番環境**: 外部cronから `GET /api/cron/run?secret=<CRON_SECRET>` を毎分程度で呼び出すことを推奨

## 主なコマンド

```bash
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run typecheck  # 型チェック
npm run test       # ユニットテスト（vitest）
npm run db:push    # スキーマ反映
npm run db:seed    # デモデータ投入
npm run db:studio  # Prisma Studio
```

## ディレクトリ構成（抜粋）

```
src/
├── app/
│   ├── dashboard/        # 管理画面（要ログイン）
│   ├── r/[slug]/         # 公開Web予約ページ
│   ├── v/[token]/        # 予約確認・キャンセルページ
│   ├── s/[token]/        # アンケート回答ページ
│   ├── c/[token]/        # クーポン表示ページ
│   └── api/              # APIルート（LINE Webhook・cron含む）
├── lib/
│   ├── automation/       # 自動配信エンジン
│   ├── line/             # LINE Messaging API クライアント
│   ├── messaging.ts      # 配信オーケストレーション
│   ├── segments.ts       # セグメント抽出
│   └── slots.ts          # 予約枠計算
└── components/           # UIコンポーネント
```
