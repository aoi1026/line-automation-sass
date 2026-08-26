import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  ExternalLink,
  Info,
  Megaphone,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { cn, getAppUrl } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "セットアップガイド" };

/** 各ステップの見出し（番号・完了バッジ付き） */
function StepCard({
  index,
  title,
  done,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
            done ? "bg-emerald-100 text-emerald-600" : "bg-brand/10 text-brand-dark"
          )}
        >
          {done ? <Check className="h-4 w-4" /> : index}
        </div>
        <CardTitle className="min-w-0 flex-1">{title}</CardTitle>
        {done ? (
          <Badge className="shrink-0 bg-emerald-100 text-emerald-700">完了</Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0">
            未設定
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-gray-600">
        {children}
      </CardContent>
    </Card>
  );
}

/** 専門用語のかんたんな説明 */
function TermNote({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
      <span className="font-semibold text-gray-700">{term}とは</span>
      {" … "}
      {children}
    </div>
  );
}

/** 設定ページなどへの導線 */
function StepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="self-start">
      <Button size="sm" variant="outline">
        {label}
        <ArrowRight />
      </Button>
    </Link>
  );
}

export default async function SetupGuidePage() {
  const session = await requireSession();
  const storeId = session.storeId;

  const [store, activeServiceCount, activeStaffCount, enabledAutomationCount, customerCount] =
    await Promise.all([
      prisma.store.findUniqueOrThrow({
        where: { id: storeId },
        select: {
          id: true,
          slug: true,
          phone: true,
          address: true,
          lineChannelAccessToken: true,
        },
      }),
      prisma.service.count({ where: { storeId, active: true } }),
      prisma.staffMember.count({ where: { storeId, active: true } }),
      prisma.automationSetting.count({ where: { storeId, enabled: true } }),
      prisma.customer.count({ where: { storeId } }),
    ]);

  const appUrl = getAppUrl();
  const webhookUrl = `${appUrl}/api/line/webhook/${store.id}`;
  const reserveUrl = `${appUrl}/r/${store.slug}`;

  const storeInfoDone = store.phone.trim() !== "" && store.address.trim() !== "";
  const lineDone = store.lineChannelAccessToken.trim() !== "";

  const doneFlags = [
    storeInfoDone,
    activeServiceCount > 0,
    activeStaffCount > 0,
    lineDone,
    enabledAutomationCount > 0,
    customerCount > 0,
  ];
  const total = doneFlags.length;
  const doneCount = doneFlags.filter(Boolean).length;
  const percent = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  return (
    <>
      <PageHeader
        title="セットアップガイド"
        description={`${APP_NAME}を使い始めるための設定を、順番にご案内します。`}
        actions={
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft />
              ダッシュボードへ戻る
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-4">
        {/* 進捗 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">設定の進み具合</span>
              <span className="font-semibold tabular-nums text-brand-dark">
                {doneCount} / {total} 件完了
              </span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200"
              role="progressbar"
              aria-label="セットアップの進み具合"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={doneCount}
            >
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              {allDone
                ? "初期設定はすべて完了しています。お疲れさまでした。あとはいつもどおり予約を登録いただくだけで、メッセージが自動でお届けされます。"
                : "上から順に進めていただくのがおすすめですが、どこから始めても問題ありません。あとから何度でも変更できますので、まずは分かる範囲でご登録ください。"}
            </p>
          </CardContent>
        </Card>

        {/* 1. 店舗情報 */}
        <StepCard index={1} title="店舗情報を登録する" done={storeInfoDone}>
          <p>
            お店の名前・電話番号・住所を登録します。ここで登録した内容は、お客様が見るWeb予約ページや、予約確認メッセージに表示されます。
          </p>
          <p>
            あわせて営業時間と定休日もご設定ください。Web予約では、営業時間内の空いている時間だけが予約枠として表示されます。臨時休業日を登録しておくと、その日は予約を受け付けなくなります。
          </p>
          <TermNote term="予約枠の間隔">
            予約を受け付ける時間の刻みです。30分に設定すると「10:00・10:30・11:00…」のように表示されます。
          </TermNote>
          <StepLink href="/dashboard/settings" label="店舗情報を設定" />
        </StepCard>

        {/* 2. メニュー */}
        <StepCard index={2} title="メニューを登録する" done={activeServiceCount > 0}>
          <p>
            カットやカラーなど、ご提供しているメニューを登録します。所要時間を登録すると、予約枠の重なりが自動で判定されるようになります。料金を登録しておくと、来店済みの処理をしたときに売上として集計されます。
          </p>
          <p>
            メニューごとに「推奨再来店間隔」を設定できます。たとえばカラーを45日に設定しておくと、前回のご来店から45日が経ったお客様へ、再来店のご案内を自動でお送りできます。
          </p>
          <StepLink href="/dashboard/settings?tab=services" label="メニューを設定" />
        </StepCard>

        {/* 3. スタッフ */}
        <StepCard index={3} title="スタッフを登録する" done={activeStaffCount > 0}>
          <p>
            施術を担当されるスタッフを登録します。予約ごとに担当者を選べるようになり、担当者別の予約状況や売上も確認できます。お一人で営業されている場合も、ご自身のお名前を1件登録しておくと便利です。
          </p>
          <StepLink href="/dashboard/settings?tab=staff" label="スタッフを設定" />
        </StepCard>

        {/* 4. LINE連携 */}
        <StepCard index={4} title="LINE公式アカウントを接続する" done={lineDone}>
          <p>
            お店のLINE公式アカウントと接続すると、予約確認やリマインダーが実際にお客様のLINEへ届くようになります。手順は少し多く見えますが、一度設定すれば以降の作業は不要です。
          </p>

          <ol className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold tabular-nums text-brand-dark">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">LINE公式アカウントを用意する</p>
                <p className="mt-0.5">
                  まだお持ちでない場合は、LINE公式アカウントマネージャー（manager.line.biz）から無料で作成できます。すでにお店のアカウントをお持ちであれば、そのままお使いいただけます。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold tabular-nums text-brand-dark">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">LINE Developersにログインする</p>
                <p className="mt-0.5">
                  developers.line.biz を開き、LINE公式アカウントの作成に使ったアカウントでログインします。初回は「プロバイダー」の作成を求められます。プロバイダーは、お店の情報をまとめるフォルダのようなものですので、お店の名前でご登録ください。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold tabular-nums text-brand-dark">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">Messaging APIチャネルを作成する</p>
                <p className="mt-0.5">
                  プロバイダーの画面で「新規チャネル作成」から「Messaging API」を選び、お店のLINE公式アカウントと紐付けます。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold tabular-nums text-brand-dark">
                4
              </span>
              <div>
                <p className="font-medium text-gray-900">
                  Channel Access TokenとChannel Secretを取得する
                </p>
                <p className="mt-0.5">
                  「チャネル基本設定」タブにChannel Secret、「Messaging API設定」タブの一番下にChannel Access Token（長期）があります。トークンは「発行」ボタンを押すと表示されますので、それぞれコピーしてください。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold tabular-nums text-brand-dark">
                5
              </span>
              <div>
                <p className="font-medium text-gray-900">
                  {APP_NAME}の「設定 &gt; LINE連携」に貼り付けて保存する
                </p>
                <p className="mt-0.5">
                  コピーした2つの値を入力して保存すると、接続が完了します。友だち追加のご案内に使うLINE Basic ID（@から始まるID）も、あわせてご登録ください。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold tabular-nums text-brand-dark">
                6
              </span>
              <div>
                <p className="font-medium text-gray-900">Webhook URLを登録する</p>
                <p className="mt-0.5">
                  LINE Developersの「Messaging API設定」タブにあるWebhook URLへ、下記のURLを登録し、「Webhookの利用」をオンにします。URLは「設定 &gt; LINE連携」の画面からコピーできます。
                </p>
                <code className="mt-2 block overflow-x-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
                  {webhookUrl}
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold tabular-nums text-brand-dark">
                7
              </span>
              <div>
                <p className="font-medium text-gray-900">応答メッセージをオフにする</p>
                <p className="mt-0.5">
                  LINE公式アカウントマネージャーの「設定 &gt; 応答設定」で、応答メッセージをオフにします。オンのままだと、お客様がメッセージを送るたびに定型文が自動で返信され、{APP_NAME}
                  からのご連絡と重なってしまいます。あいさつメッセージは、お好みでオンのままで問題ありません。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold tabular-nums text-brand-dark">
                8
              </span>
              <div>
                <p className="font-medium text-gray-900">接続テストで確認する</p>
                <p className="mt-0.5">
                  「設定 &gt; LINE連携」の接続テストから、LINE連携済みのお客様へテストメッセージを1通送信できます。実際に届けば設定は完了です。
                </p>
              </div>
            </li>
          </ol>

          <TermNote term="Messaging APIチャネル">
            お店のLINE公式アカウントから、システム経由でメッセージを送るための窓口です。LINE Developersで無料で作成できます。
          </TermNote>
          <TermNote term="Channel Access Token（チャネルアクセストークン）">
            {APP_NAME}がお店のLINE公式アカウントとしてメッセージを送るための、合鍵のような文字列です。他の方に知られないようご注意ください。
          </TermNote>
          <TermNote term="Webhook（ウェブフック）">
            お客様がLINEでメッセージを送信したときに、その内容がLINEから{APP_NAME}
            へ自動的に届くしくみです。お客様とお店のLINEアカウントを結び付ける「連携コード」の受け取りに使います。
          </TermNote>

          <div className="flex flex-wrap items-center gap-2">
            <StepLink href="/dashboard/settings?tab=line" label="LINE連携を設定" />
            <a
              href="https://developers.line.biz/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              LINE Developersを開く
            </a>
          </div>
        </StepCard>

        {/* デモモードの案内 */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm leading-relaxed text-amber-900">
              <p className="font-semibold">デモモードについて</p>
              <p className="mt-1">
                LINEを接続しなくても、すべての機能をデモとしてお試しいただけます。メッセージは実際には送信されず、メッセージ履歴に記録されます。
              </p>
              <p className="mt-1">
                操作の流れや文面を確認してから、あらためてLINE公式アカウントを接続していただけます。接続後は、同じ設定のまま実際の送信に切り替わります。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 5. 自動配信 */}
        <StepCard index={5} title="自動配信をオンにする" done={enabledAutomationCount > 0}>
          <p>
            予約確認・前日のリマインダー・来店お礼・再来店のご案内・お誕生日メッセージなどを、それぞれオン・オフで切り替えられます。まずは予約確認とリマインダーの2つから始めると、無理なくご利用いただけます。
          </p>
          <p>
            送信する文面はテンプレートとして自由に編集できます。文面の中の「
            {"{お客様名}"}」のような部分は、送信時にお客様のお名前や予約日時へ自動で置き換わります。
          </p>
          <TermNote term="自動配信">
            条件に当てはまるお客様へ、決められたタイミングでメッセージを自動送信するしくみです。同じメッセージが重複して送られることはありません。
          </TermNote>
          <div className="flex flex-wrap items-center gap-2">
            <StepLink href="/dashboard/automations" label="自動配信を設定" />
            <StepLink href="/dashboard/templates" label="テンプレートを編集" />
          </div>
        </StepCard>

        {/* 6. 顧客登録 */}
        <StepCard index={6} title="お客様を登録する" done={customerCount > 0}>
          <p>
            お客様のお名前と連絡先を登録します。1件ずつの登録のほか、CSVファイルでのまとめて取り込みにも対応しています。
          </p>
          <p>
            メッセージをお届けするには、お客様のLINEとの連携が必要です。顧客詳細ページで発行される6桁の連携コードを、お客様からお店のLINEへ送っていただくと連携が完了します。友だち追加のご案内は、Web予約の完了画面からもご覧いただけます。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StepLink href="/dashboard/customers" label="お客様を登録" />
          </div>
        </StepCard>

        {/* 次のステップ */}
        <Card>
          <CardHeader>
            <CardTitle>設定が終わったら</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm leading-relaxed text-gray-600">
            <div>
              <p className="font-medium text-gray-900">Web予約ページをご案内する</p>
              <p className="mt-1">
                下記のURLをLINEのプロフィールやSNSに掲載すると、お客様がご自身で予約できるようになります。
              </p>
              <code className="mt-2 block overflow-x-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
                {reserveUrl}
              </code>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Link
                href="/dashboard/campaigns"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Megaphone className="h-4 w-4 shrink-0 text-gray-400" />
                キャンペーンを配信
              </Link>
              <Link
                href="/dashboard/surveys"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-gray-400" />
                アンケートを作成
              </Link>
              <Link
                href="/dashboard/analytics"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <BarChart3 className="h-4 w-4 shrink-0 text-gray-400" />
                分析レポートを見る
              </Link>
            </div>
            <p className="flex items-start gap-2 text-xs text-gray-500">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              リピート率や再来店の状況は分析レポートで確認できます。まずは1か月ほど運用し、効果を見ながら文面やタイミングを調整していくのがおすすめです。
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
