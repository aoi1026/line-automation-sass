# リピナビ 実装コントラクト（feature agents 必読）

LINE顧客リピート自動化SaaS「リピナビ」。美容サロン向け。**UIはすべて日本語**。

## 技術スタック
- Next.js 15 App Router + TypeScript strict / React 19
- Tailwind CSS v4（`@theme` トークン: `brand`=#06C755, `brand-dark`, `brand-light`。`bg-brand` 等で使用可）
- Prisma 6 + PostgreSQL。クライアントは `import { prisma } from "@/lib/db"`
- zod / sonner(toast) / lucide-react / recharts / date-fns
- パスエイリアス: `@/*` → `src/*`

## 重要ルール
1. **共有ファイルを編集しない**。自分の担当ファイルのみ作成・編集する。共有: `src/lib/**`, `src/components/ui/**`, `src/components/shell/**`, `src/app/layout.tsx`, `globals.css`, `prisma/schema.prisma`, `package.json` は読み取り専用。
2. スキーマは `prisma/schema.prisma` を必ず読み、モデル・enum のフィールド名を正確に使う。
3. 日時: DBはUTC。表示・日付判断は `@/lib/jst` のヘルパーを使う（`formatJstDateTime`, `jstYmd`, `fromJst` 等）。`toLocaleString` を直接使わない。
4. 金額は `formatYen`（`@/lib/utils`）。
5. UIラベル・ステータス名は `@/lib/constants` の `*_LABELS` / `*_COLORS` を使う。
6. 文体: UI見出し・ボタンは体言止め（「予約を作成」等）、説明文・トーストは丁寧語（「保存しました」「削除しました」等）。**英語UIテキスト禁止**。

## 認証・API規約
- ページ（server component）: `const session = await requireSession()`（`@/lib/session`）→ `session.storeId` で必ずテナントスコープ。
- APIルート: `@/lib/api` の `getApiSession()` / `unauthorized()` / `jsonError()` / `notFound()` / `parseBody(req, zodSchema)` を使う。
  ```ts
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { data, error } = await parseBody(req, schema);
  if (error) return error;
  ```
- **全クエリに `storeId: session.storeId` を必ず含める**（他店舗データへのアクセス防止）。更新・削除は必ず所有チェック（`findFirst({ where: { id, storeId } })` 等）。
- 成功レスポンス: `NextResponse.json(data)` または `NextResponse.json({ ok: true })`。
- ミューテーション後のクライアントは `router.refresh()` + `toast.success("...")`。

## メッセージ送信
- 個別送信は `deliverMessage()`、自動配信種別に沿った送信は `sendAutomationMessage()`、予約イベント通知は `notifyReservationEvent(reservationId, kind)`（すべて `@/lib/messaging`）。**直接 @line/bot-sdk を使わない**。
- 店舗のLINEチャネル未設定時は「デモモード」: 実送信せず MessageLog に channel=DEMO で記録される。UIでは「デモ」と表示。

## UIコンポーネント（`@/components/ui/*`）
Button(variant: default|secondary|outline|ghost|destructive|link, size: default|sm|lg|icon), Input, Textarea, Label, Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter, Badge(variant: default|secondary|outline|destructive), Table系, Select系(Radix: Select/SelectTrigger/SelectValue/SelectContent/SelectItem), Dialog系, Tabs系, Switch, Checkbox, DropdownMenu系, Popover系, PageHeader(title, description?, actions?), EmptyState(icon?, title, description?, action?), StatCard(label, value, sub?, icon?), Spinner。

各ページの基本形:
```tsx
<>
  <PageHeader title="..." description="..." actions={<Button>...</Button>} />
  <Card>...</Card>
</>
```
ダッシュボード配下は `src/app/dashboard/<feature>/page.tsx`。レイアウト・ナビは実装済み（サイドバー+モバイル下部ナビ）。ページ側でシェルを作らない。

## セグメント条件（rules）
`@/lib/segments` の `segmentRulesSchema` / `parseRules` / `resolveTargets(storeId, rules)` / `countTargets` / `describeRules(rules, tagNames?)` を使う。形式は schema 参照。

## テンプレート
プレースホルダーは `{お客様名}` 形式（一覧: `TEMPLATE_PLACEHOLDERS` @ constants）。描画は `renderTemplate` / 変数構築は `buildCustomerVars` / `buildReservationVars`（`@/lib/templates`）。

## 顧客統計の更新規則
予約を COMPLETED にする際: `completedAt` を設定し、顧客の `lastVisitAt`（予約のstartAt）, `visitCount`(+1), `totalSpent`(+price), 未設定なら `firstVisitAt` を更新する。COMPLETED を取り消す場合は逆演算。

## 公開ページ（認証不要）
- `/r/[slug]` Web予約 / `/s/[token]` アンケート回答 / `/c/[token]` クーポン表示 / `/v/[token]` 予約確認・キャンセル
- モバイルファースト。ヘッダーに店舗名。`max-w-md mx-auto` 基調。認証不要だがトークン・slugで厳密にスコープ。

## 環境変数
`APP_URL`（リンク生成は `getAppUrl()`）, `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET`, `AUTOMATION_INTERVAL_MS`

---

# Wave 2 追加コントラクト

## 追加モデル（prisma/schema.prisma）
- `TreatmentRecord` 電子カルテ: storeId, customerId, reservationId?(unique), staffId?, serviceName, content, materials, nextNote, visitedAt
- `StoreHoliday` 臨時休業日: storeId, date(JST日付の00:00), reason。`@@unique([storeId, date])`
- `Notification` 通知: storeId, type(NotificationType), title, body, link, readAt?, createdAt
- `NotificationType`: NEW_WEB_RESERVATION | RESERVATION_CANCELLED | LOW_RATING_SURVEY | CAMPAIGN_SENT | AUTOMATION_FAILED

## 追加共有ライブラリ（読み取り専用・変更禁止）
- `@/lib/notifications`: `notify({storeId, type, title, body?, link?})` 通知作成（例外を投げない）、`countUnread(storeId)`、`NOTIFICATION_TYPE_LABELS`、`NOTIFICATION_TYPE_COLORS`
- `@/lib/holidays`: `getHolidayYmds(storeId, from?, to?)` → JST "YYYY-MM-DD" の配列
- `@/lib/rate-limit`: `rateLimit(key, limit, windowMs)` → `{ok, remaining, retryAfterSec}`、`getClientIp(req)`
- `@/lib/csv`: `toCsv(headers, rows)`（UTF-8 BOM付き）、`csvResponse(filename, csv)`、`parseCsv(text)`
- `@/lib/slots` の `getAvailableSlots` に `holidays?: string[]`（JST "YYYY-MM-DD"）オプションを追加済み。**予約枠を計算する箇所では必ず `getHolidayYmds` の結果を渡すこと。**
- `qrcode` パッケージ導入済み（`import QRCode from "qrcode"` / `QRCode.toDataURL(url)`）

## Wave 2 の追加ルール
- 既存ファイルを変更する場合は、**担当として明示的に指定されたファイルのみ**。それ以外は新規作成。
- 通知の発火は「顧客起点の出来事」に限る（Web予約受付・顧客によるキャンセル・低評価アンケート回答）。店舗スタッフ自身の操作では通知しない。
