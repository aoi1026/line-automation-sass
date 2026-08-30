# 本番デプロイ手順

リピナビを本番環境で稼働させるための手順です。

## 前提環境

| 項目 | 要件 |
| --- | --- |
| Node.js | 22 以上 |
| PostgreSQL | 16 以上 |
| HTTPS | 必須（LINE Webhook が HTTPS のみ対応のため） |

## 1. 環境変数

`.env.example` をコピーして `.env` を作成し、以下をすべて設定します。

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL 接続文字列。例: `postgresql://user:pass@host:5432/repinavi?schema=public` |
| `SESSION_SECRET` | ✅ | セッションJWTの署名鍵。**32文字以上のランダム値**を必ず生成すること |
| `CRON_SECRET` | ✅ | 自動配信エンジンを外部から起動する際の共有シークレット |
| `APP_URL` | ✅ | 公開URL（末尾スラッシュなし）。例: `https://repinavi.example.com`。**メッセージ内のリンク生成に使われる**ため、実際の公開URLと一致させること |
| `AUTOMATION_INTERVAL_MS` | — | アプリ内スケジューラの実行間隔（ミリ秒）。**本番では未設定（空）を推奨**（下記「自動配信の定期実行」参照） |
| `TRUSTED_PROXY_HOPS` | — | 自前のリバースプロキシの段数（既定1）。レート制限が実際の接続元を特定するために使う |

シークレットの生成:

```bash
openssl rand -base64 32   # SESSION_SECRET 用
openssl rand -base64 32   # CRON_SECRET 用
```

> ⚠️ `SESSION_SECRET` を変更すると、既存のログインセッションはすべて無効になります（全ユーザーが再ログインを求められます）。

## 2. ビルドと起動

```bash
npm ci                        # package-lock.json どおりに厳密インストール
npx prisma migrate deploy     # マイグレーション適用（prisma/migrations を適用する）
npm run build
npm start                     # 既定で 0.0.0.0:3000
```

> 既にスキーマが入っているデータベースへ初めて `migrate deploy` を使う場合は、
> 一度だけ `npx prisma migrate resolve --applied 0_init` でベースラインを記録してから
> 実行してください（既存テーブルへの再作成を防ぐため）。

初回のみ、動作確認用のデモデータを入れる場合:

```bash
npm run db:seed               # ⚠️ 本番データがある環境では実行しないこと
```

## 3. 自動配信の定期実行

自動配信（リマインダー／来店お礼／再来店リマインド／誕生日／キャンペーン）は
**外部からの定期実行**が前提です。配信エンジンは冪等なので、多重に実行されても
重複送信は起きません。

### 推奨: 外部 cron

`.env` の `AUTOMATION_INTERVAL_MS` を**設定しない**（アプリ内スケジューラを止める）うえで、
毎分エンドポイントを叩きます。アプリを複数インスタンスで動かす場合、
アプリ内スケジューラだと全インスタンスが同時に走ってしまうため、こちらが安全です。

```cron
* * * * * curl -fsS "https://repinavi.example.com/api/cron/run?secret=YOUR_CRON_SECRET" > /dev/null 2>&1
```

シークレットはヘッダーでも渡せます（URLがログに残るのを避けたい場合）:

```bash
curl -fsS -H "x-cron-secret: YOUR_CRON_SECRET" "https://repinavi.example.com/api/cron/run"
```

### Vercel の場合

`vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/run?secret=YOUR_CRON_SECRET", "schedule": "* * * * *" }]
}
```

> Vercel の Hobby プランは cron が1日1回までのため、実用には Pro 以上が必要です。

### 単一サーバーで手軽に動かす場合

`AUTOMATION_INTERVAL_MS=60000` を設定すると、アプリ内のスケジューラが60秒ごとに
実行します。インスタンスが1つだけであればこれで十分です。

## 4. LINE Webhook の設定

1. [LINE Developers](https://developers.line.biz/) で Messaging API チャネルを作成
2. **Channel Access Token（長期）** と **Channel Secret** を取得
3. リピナビの管理画面 → 設定 → LINE連携 で上記2つを保存
4. 同画面に表示される Webhook URL を LINE Developers の Webhook URL 欄に設定

Webhook URL の形式:

```
https://<あなたのドメイン>/api/line/webhook/<storeId>
```

5. 「Webhookの利用」を **オン**
6. LINE公式アカウントの **応答メッセージ（自動応答）を オフ**（リピナビの自動応答と二重になるため）

## 5. リバースプロキシ（nginx）

レート制限が発信元IPを見るため、**`X-Forwarded-For` を必ず転送**してください。
これが無いと全リクエストが同一IPとして扱われ、正規の利用者まで制限にかかります。

> ⚠️ `X-Forwarded-For` の**先頭はクライアントが自由に詐称できます**。リピナビは
> 「末尾から `TRUSTED_PROXY_HOPS` 段目」を実際の接続元として扱います。
> nginx を1段だけ挟む標準構成であれば既定値（1）のままで正しく動作します。
> ロードバランサ等をさらに前段に置く場合は、その段数に合わせて設定してください。

```nginx
server {
    listen 443 ssl http2;
    server_name repinavi.example.com;

    ssl_certificate     /etc/letsencrypt/live/repinavi.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/repinavi.example.com/privkey.pem;

    # LINE Webhook の署名検証のため、ボディを改変しない
    client_max_body_size 10m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}
```

## 6. データベースのバックアップ

```bash
# 日次バックアップ（14世代保持）
0 3 * * * pg_dump "$DATABASE_URL" | gzip > /var/backups/repinavi-$(date +\%F).sql.gz \
  && find /var/backups -name 'repinavi-*.sql.gz' -mtime +14 -delete
```

リストア:

```bash
gunzip -c /var/backups/repinavi-2026-08-27.sql.gz | psql "$DATABASE_URL"
```

## 7. デプロイ後の確認

```bash
# トップページが返るか
curl -fsS -o /dev/null -w '%{http_code}\n' https://repinavi.example.com/

# cron エンドポイントが認証されているか（401 が返れば正常）
curl -s -o /dev/null -w '%{http_code}\n' https://repinavi.example.com/api/cron/run

# 正しいシークレットで実行できるか（JSONのサマリが返る）
curl -fsS "https://repinavi.example.com/api/cron/run?secret=YOUR_CRON_SECRET"
```

管理画面にログインし、**設定 → LINE連携 → テスト送信** で実際にLINEが届くことを確認してください。

## スケール時の注意

現在のレート制限（`src/lib/rate-limit.ts`）は**インメモリ・単一プロセス前提**です。
複数インスタンス構成にする場合は Redis 等の共有ストアへの置き換えが必要です。
同様に、アプリ内スケジューラではなく外部 cron を使ってください。
