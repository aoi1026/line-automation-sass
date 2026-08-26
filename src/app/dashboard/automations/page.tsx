import type { Metadata } from "next";
import { Info, Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { isLineConfigured } from "@/lib/line/client";
import { AUTOMATION_KINDS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  AutomationCard,
  type AutomationSettingState,
} from "./_components/automation-card";
import { RunNowButton } from "./_components/run-now-button";

export const metadata: Metadata = { title: "自動配信設定" };

function intervalLabel(): string {
  const raw = Number(process.env.AUTOMATION_INTERVAL_MS ?? "60000");
  const ms = Number.isFinite(raw) && raw > 0 ? raw : 60000;
  if (ms % 60000 === 0) return `${ms / 60000}分`;
  return `${Math.round(ms / 1000)}秒`;
}

export default async function AutomationsPage() {
  const session = await requireSession();

  const [store, settings, templates, coupons, surveys] = await Promise.all([
    prisma.store.findUniqueOrThrow({
      where: { id: session.storeId },
      select: { lineChannelAccessToken: true },
    }),
    prisma.automationSetting.findMany({ where: { storeId: session.storeId } }),
    prisma.messageTemplate.findMany({
      where: {
        storeId: session.storeId,
        enabled: true,
        kind: { in: AUTOMATION_KINDS },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, kind: true, name: true },
    }),
    prisma.coupon.findMany({
      where: { storeId: session.storeId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, active: true },
    }),
    prisma.survey.findMany({
      where: { storeId: session.storeId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, active: true },
    }),
  ]);

  const settingByKind = new Map(settings.map((s) => [s.kind, s]));
  const demoMode = !isLineConfigured(store);

  return (
    <>
      <PageHeader
        title="自動配信設定"
        description="自動配信のオン・オフとタイミングを設定できます。"
        actions={<RunNowButton />}
      />

      {demoMode && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            デモモード中はメッセージがお客様に届かず、履歴への記録のみ行われます。「設定
            → LINE連携」でチャネルを設定すると実際に送信されます。
          </span>
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              自動配信のしくみ
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              自動配信は約{intervalLabel()}
              ごとにバックグラウンドで自動実行されています。送信済みの判定はメッセージ履歴に基づいて行われるため、何度実行されても同じメッセージが重複して送信されることはありません。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {AUTOMATION_KINDS.map((kind) => {
          const s = settingByKind.get(kind);
          const state: AutomationSettingState = {
            enabled: s?.enabled ?? false,
            offsetValue: s?.offsetValue ?? 1,
            offsetUnit: s?.offsetUnit === "hours" ? "hours" : "days",
            sendHourJst: s?.sendHourJst ?? 10,
            templateId: s?.templateId ?? null,
            couponId: s?.couponId ?? null,
            surveyId: s?.surveyId ?? null,
          };
          return (
            <AutomationCard
              key={kind}
              kind={kind}
              setting={state}
              templates={templates
                .filter((t) => t.kind === kind)
                .map((t) => ({ id: t.id, name: t.name }))}
              coupons={coupons}
              surveys={surveys}
            />
          );
        })}
      </div>
    </>
  );
}
