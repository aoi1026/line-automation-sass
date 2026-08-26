import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatJstDate, formatJstDateTime, formatJstTime, jstHm, jstYmd } from "@/lib/jst";
import { formatYen } from "@/lib/utils";
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_KIND_LABELS,
  MESSAGE_STATUS_COLORS,
  MESSAGE_STATUS_LABELS,
  RESERVATION_SOURCE_LABELS,
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ReservationKarteCard, type KarteStaffOption } from "./_components/karte-form";
import { DeleteReservationButton } from "../_components/delete-reservation-button";
import { ReservationForm } from "../_components/reservation-form";
import { StatusActions } from "../_components/status-actions";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
      <dd className="flex-1 text-gray-900">{children}</dd>
    </div>
  );
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const reservation = await prisma.reservation.findFirst({
    where: { id, storeId: session.storeId },
    include: {
      customer: true,
      service: true,
      staff: true,
      messageLogs: { orderBy: { sentAt: "desc" } },
      treatmentRecord: { include: { staff: { select: { id: true, name: true } } } },
    },
  });
  if (!reservation) notFound();

  const [customers, services, staffMembers] = await Promise.all([
    prisma.customer.findMany({
      where: { storeId: session.storeId },
      orderBy: [{ kana: "asc" }, { name: "asc" }],
      select: { id: true, name: true, kana: true },
    }),
    prisma.service.findMany({
      where: {
        storeId: session.storeId,
        OR: [
          { active: true },
          ...(reservation.serviceId ? [{ id: reservation.serviceId }] : []),
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, price: true, durationMin: true },
    }),
    prisma.staffMember.findMany({
      where: {
        storeId: session.storeId,
        OR: [
          { active: true },
          ...(reservation.staffId ? [{ id: reservation.staffId }] : []),
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const karteRecord = reservation.treatmentRecord;

  // 退職などで非表示になったスタッフも、カルテの担当として選べるようにする
  const karteStaffOptions: KarteStaffOption[] = [...staffMembers];
  if (karteRecord?.staff && !karteStaffOptions.some((s) => s.id === karteRecord.staff?.id)) {
    karteStaffOptions.push({ id: karteRecord.staff.id, name: karteRecord.staff.name });
  }

  return (
    <>
      <PageHeader
        title="予約詳細"
        description={`${reservation.customer.name}様 / ${formatJstDateTime(reservation.startAt)}`}
        actions={
          <>
            <Link
              href={`/dashboard/reservations?date=${jstYmd(reservation.startAt)}`}
              className={buttonVariants({ variant: "outline" })}
            >
              一覧へ戻る
            </Link>
            <DeleteReservationButton id={reservation.id} />
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>予約情報</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <InfoRow label="ステータス">
                  <Badge className={RESERVATION_STATUS_COLORS[reservation.status]}>
                    {RESERVATION_STATUS_LABELS[reservation.status]}
                  </Badge>
                </InfoRow>
                <InfoRow label="顧客">
                  <Link
                    href={`/dashboard/customers/${reservation.customerId}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {reservation.customer.name}
                  </Link>
                </InfoRow>
                <InfoRow label="日時">
                  {formatJstDateTime(reservation.startAt)}〜
                  {formatJstTime(reservation.endAt)}
                </InfoRow>
                <InfoRow label="メニュー">
                  {reservation.service?.name ?? "メニューなし"}
                </InfoRow>
                <InfoRow label="担当">{reservation.staff?.name ?? "指名なし"}</InfoRow>
                <InfoRow label="料金">{formatYen(reservation.price)}</InfoRow>
                <InfoRow label="経路">
                  {RESERVATION_SOURCE_LABELS[reservation.source]}
                </InfoRow>
                {reservation.note && (
                  <InfoRow label="メモ">
                    <span className="whitespace-pre-wrap">{reservation.note}</span>
                  </InfoRow>
                )}
                {reservation.cancelReason && (
                  <InfoRow label="キャンセル理由">
                    <span className="whitespace-pre-wrap">{reservation.cancelReason}</span>
                  </InfoRow>
                )}
                {reservation.completedAt && (
                  <InfoRow label="来店処理日時">
                    {formatJstDateTime(reservation.completedAt)}
                  </InfoRow>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ステータス操作</CardTitle>
              <CardDescription>
                来店済みにすると、顧客の来店回数・累計利用額が更新されます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusActions id={reservation.id} status={reservation.status} />
            </CardContent>
          </Card>

          {reservation.status === "COMPLETED" && (
            <ReservationKarteCard
              reservationId={reservation.id}
              customerId={reservation.customerId}
              staffOptions={karteStaffOptions}
              defaults={{
                visitedAt: jstYmd(reservation.startAt),
                serviceName: reservation.service?.name ?? "",
                staffId: reservation.staffId ?? "",
              }}
              record={
                karteRecord
                  ? {
                      id: karteRecord.id,
                      visitedAt: jstYmd(karteRecord.visitedAt),
                      visitedAtLabel: formatJstDate(karteRecord.visitedAt),
                      serviceName: karteRecord.serviceName,
                      staffId: karteRecord.staffId ?? "",
                      staffName: karteRecord.staff?.name ?? "",
                      content: karteRecord.content,
                      materials: karteRecord.materials,
                      nextNote: karteRecord.nextNote,
                    }
                  : null
              }
            />
          )}

          {reservation.messageLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>送信済みメッセージ</CardTitle>
                <CardDescription>
                  この予約に関して送信されたメッセージの履歴です。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {reservation.messageLogs.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="font-medium text-gray-900">
                        {MESSAGE_KIND_LABELS[log.kind]}
                      </span>
                      {log.channel === "DEMO" && (
                        <Badge variant="outline">{MESSAGE_CHANNEL_LABELS.DEMO}</Badge>
                      )}
                      <Badge className={MESSAGE_STATUS_COLORS[log.status]}>
                        {MESSAGE_STATUS_LABELS[log.status]}
                      </Badge>
                      <span className="text-gray-500">
                        {formatJstDateTime(log.sentAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>予約内容の編集</CardTitle>
            <CardDescription>
              日時を変更すると、自動配信が有効な場合はお客様に変更通知が送信されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReservationForm
              mode="edit"
              customers={customers}
              services={services}
              staffMembers={staffMembers}
              initial={{
                id: reservation.id,
                customerId: reservation.customerId,
                serviceId: reservation.serviceId,
                staffId: reservation.staffId,
                date: jstYmd(reservation.startAt),
                time: jstHm(reservation.startAt),
                price: reservation.price,
                note: reservation.note,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
