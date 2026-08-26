import { notFound } from "next/navigation";
import { Pencil, Send } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { GENDER_LABELS } from "@/lib/constants";
import { formatJstDate, formatJstDateTime, jstYmd } from "@/lib/jst";
import { formatYen } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { KarteSection, type KarteRow } from "./_components/karte-section";
import type { StaffOption } from "./_components/karte-form-dialog";
import { NextNoteCard } from "./_components/next-note-card";
import { CustomerFormDialog } from "../_components/customer-form-dialog";
import { CustomerTabs, type MessageLogRow, type ReservationRow } from "../_components/customer-tabs";
import { DeleteCustomerButton } from "../_components/delete-customer-button";
import { LineLinkCard } from "../_components/line-link-card";
import { SendMessageDialog } from "../_components/send-message-dialog";
import { TagsPopover } from "../_components/tags-popover";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "顧客詳細" };

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs text-gray-500">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-gray-900">{value}</span>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const [customer, storeTags, reservations, messageLogs, treatmentRecords, activeStaff] =
    await Promise.all([
      prisma.customer.findFirst({
        where: { id, storeId: session.storeId },
        include: { tags: { include: { tag: true } } },
      }),
      prisma.tag.findMany({ where: { storeId: session.storeId }, orderBy: { name: "asc" } }),
      prisma.reservation.findMany({
        where: { customerId: id, storeId: session.storeId },
        include: { service: true, staff: true },
        orderBy: { startAt: "desc" },
      }),
      prisma.messageLog.findMany({
        where: { customerId: id, storeId: session.storeId },
        orderBy: { sentAt: "desc" },
      }),
      prisma.treatmentRecord.findMany({
        where: { customerId: id, storeId: session.storeId },
        include: { staff: { select: { id: true, name: true } } },
        orderBy: [{ visitedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.staffMember.findMany({
        where: { storeId: session.storeId, active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
    ]);
  if (!customer) notFound();

  const now = new Date();
  const linked = Boolean(customer.lineUserId);
  const hasActiveCode = Boolean(
    customer.linkCode && customer.linkCodeExpiresAt && customer.linkCodeExpiresAt.getTime() > now.getTime()
  );

  const reservationRows: ReservationRow[] = reservations.map((r) => ({
    id: r.id,
    startAtLabel: formatJstDateTime(r.startAt),
    serviceName: r.service?.name ?? "-",
    staffName: r.staff?.name ?? "-",
    priceLabel: formatYen(r.price),
    status: r.status,
  }));

  const messageLogRows: MessageLogRow[] = messageLogs.map((m) => ({
    id: m.id,
    sentAtLabel: formatJstDateTime(m.sentAt),
    kind: m.kind,
    content: m.content,
    status: m.status,
    channel: m.channel,
  }));

  const karteRows: KarteRow[] = treatmentRecords.map((r) => ({
    id: r.id,
    visitedAt: jstYmd(r.visitedAt),
    visitedAtLabel: formatJstDate(r.visitedAt),
    serviceName: r.serviceName,
    staffId: r.staffId ?? "",
    staffName: r.staff?.name ?? "",
    content: r.content,
    materials: r.materials,
    nextNote: r.nextNote,
    reservationId: r.reservationId,
  }));

  // 退職などで非表示になったスタッフも、記録済みのカルテの担当として選べるようにする
  const staffOptions: StaffOption[] = [...activeStaff];
  for (const record of treatmentRecords) {
    if (record.staff && !staffOptions.some((s) => s.id === record.staff?.id)) {
      staffOptions.push({ id: record.staff.id, name: record.staff.name });
    }
  }

  const latestNextNote = treatmentRecords.find((r) => r.nextNote.trim() !== "");

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.kana || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CustomerFormDialog
              mode="edit"
              customerId={customer.id}
              initial={{
                name: customer.name,
                kana: customer.kana,
                phone: customer.phone,
                email: customer.email,
                gender: customer.gender,
                birthday: customer.birthday ? jstYmd(customer.birthday) : "",
                notes: customer.notes,
              }}
              trigger={
                <Button variant="outline">
                  <Pencil />
                  編集
                </Button>
              }
            />
            <SendMessageDialog
              customerId={customer.id}
              customerName={customer.name}
              linked={linked}
              trigger={
                <Button>
                  <Send />
                  メッセージを送信
                </Button>
              }
            />
            <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
          </div>
        }
      />

      {latestNextNote && (
        <NextNoteCard
          note={latestNextNote.nextNote}
          visitedAtLabel={formatJstDate(latestNextNote.visitedAt)}
          serviceName={latestNextNote.serviceName}
          staffName={latestNextNote.staff?.name ?? ""}
        />
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="電話" value={customer.phone || "-"} />
            <InfoRow label="メール" value={customer.email || "-"} />
            <InfoRow label="性別" value={GENDER_LABELS[customer.gender] ?? GENDER_LABELS[""]} />
            <InfoRow
              label="誕生日"
              value={customer.birthday ? formatJstDate(customer.birthday) : "-"}
            />
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">タグ</span>
                <TagsPopover
                  customerId={customer.id}
                  storeTags={storeTags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
                  selectedTagIds={customer.tags.map((ct) => ct.tagId)}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {customer.tags.length === 0 ? (
                  <span className="text-sm text-gray-400">なし</span>
                ) : (
                  customer.tags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">メモ</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                {customer.notes || "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">来店状況</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="来店回数" value={`${customer.visitCount}回`} />
            <StatCard label="累計利用額" value={formatYen(customer.totalSpent)} />
            <StatCard
              label="初回来店"
              value={customer.firstVisitAt ? formatJstDate(customer.firstVisitAt) : "-"}
            />
            <StatCard
              label="最終来店"
              value={customer.lastVisitAt ? formatJstDate(customer.lastVisitAt) : "-"}
            />
          </div>
        </div>

        <LineLinkCard
          customerId={customer.id}
          linked={linked}
          lineDisplayName={customer.lineDisplayName}
          initialCode={hasActiveCode ? customer.linkCode : null}
          initialExpiresAt={
            hasActiveCode && customer.linkCodeExpiresAt
              ? customer.linkCodeExpiresAt.toISOString()
              : null
          }
        />
      </div>

      <div className="mb-6">
        <KarteSection
          customerId={customer.id}
          records={karteRows}
          staffOptions={staffOptions}
        />
      </div>

      <CustomerTabs reservations={reservationRows} messageLogs={messageLogRows} />
    </>
  );
}
