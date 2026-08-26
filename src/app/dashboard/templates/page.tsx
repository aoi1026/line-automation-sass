import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatJstDateShort } from "@/lib/jst";
import { AUTOMATION_KINDS, MESSAGE_KIND_LABELS } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CreateTemplateButton } from "./_components/create-template-button";
import { TemplateCard } from "./_components/template-card";

export const metadata: Metadata = { title: "テンプレート" };

export default async function TemplatesPage() {
  const session = await requireSession();

  const [store, templates] = await Promise.all([
    prisma.store.findUniqueOrThrow({
      where: { id: session.storeId },
      select: { name: true },
    }),
    prisma.messageTemplate.findMany({
      where: { storeId: session.storeId, kind: { in: AUTOMATION_KINDS } },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { automationSettings: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="テンプレート"
        description="自動配信で送るメッセージの文面を管理します。テンプレートがない種別は標準文面が使われます。"
        actions={<CreateTemplateButton storeName={store.name} />}
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<FileText aria-hidden="true" />}
          title="テンプレートがまだありません"
          description="テンプレートを作成すると、自動配信の文面をお店らしい表現にカスタマイズできます。まずは「予約リマインド」の文面から作ってみましょう。未作成の間は標準文面で送信されます。"
          action={<CreateTemplateButton storeName={store.name} />}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {AUTOMATION_KINDS.map((kind) => {
            const items = templates.filter((t) => t.kind === kind);
            return (
              <section key={kind}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  {MESSAGE_KIND_LABELS[kind]}
                  <span className="text-xs font-normal text-gray-400">{items.length}件</span>
                </h2>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-500">
                    この種別のテンプレートはまだありません。標準文面で送信されます。
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((t) => (
                      <TemplateCard
                        key={t.id}
                        template={{
                          id: t.id,
                          kind: t.kind,
                          name: t.name,
                          content: t.content,
                          enabled: t.enabled,
                          usedByAutomation: t._count.automationSettings > 0,
                          updatedLabel: formatJstDateShort(t.updatedAt),
                        }}
                        storeName={store.name}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
