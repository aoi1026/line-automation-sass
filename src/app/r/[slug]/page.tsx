import type { Metadata } from "next";
import { CalendarX2, MapPin, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { resolveBusinessHours } from "@/app/api/public/booking/[slug]/shared";
import {
  DAY_LABELS_JA,
  addDays,
  jstDayKey,
  jstParts,
  jstYmd,
} from "@/lib/jst";
import { BookingFlow, type DateOption } from "./booking-flow";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: store ? `${store.name} ご予約` : "ご予約" };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({ where: { slug } });

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <CalendarX2 className="mx-auto h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-lg font-bold text-gray-900">
            予約ページが見つかりません
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            お探しの店舗の予約ページが見つかりませんでした。
            URLが正しいかご確認のうえ、もう一度お試しください。
          </p>
        </div>
      </div>
    );
  }

  const [services, staff] = await Promise.all([
    prisma.service.findMany({
      where: { storeId: store.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        durationMin: true,
        price: true,
      },
    }),
    prisma.staffMember.findMany({
      where: { storeId: store.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, title: true },
    }),
  ]);

  // 今日から30日分の日付候補（JST・定休日は選択不可）
  const businessHours = resolveBusinessHours(store.businessHours);
  const now = new Date();
  const dates: DateOption[] = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(now, i);
    const dayKey = jstDayKey(d);
    const { month, day } = jstParts(d);
    return {
      ymd: jstYmd(d),
      md: `${month}/${day}`,
      dow: DAY_LABELS_JA[dayKey],
      dayKey,
      closed: businessHours[dayKey].closed,
      isToday: i === 0,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1.5 bg-brand" />
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-md px-4 pb-5 pt-6">
          <p className="text-xs font-semibold tracking-wide text-brand">
            ネット予約受付中
          </p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{store.name}</h1>
          {store.description && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {store.description}
            </p>
          )}
          {(store.address || store.phone) && (
            <div className="mt-3 flex flex-col gap-1.5 text-xs text-gray-500">
              {store.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {store.address}
                </span>
              )}
              {store.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {store.phone}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <BookingFlow
          slug={store.slug}
          storeName={store.name}
          services={services}
          staff={staff}
          dates={dates}
        />
      </main>

      <footer className="pb-10 pt-4 text-center text-xs text-gray-400">
        {store.name}
      </footer>
    </div>
  );
}
