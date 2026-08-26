import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getAppUrl } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "./_components/print-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "予約QRコード" };

/** 印刷時はダッシュボードのUIを隠し、掲示物だけをA4縦1枚に出力する */
const PRINT_STYLES = `
@media print {
  @page { size: A4 portrait; margin: 14mm; }
  html, body { background: #ffffff !important; }
  body * { visibility: hidden !important; }
  #qr-print-sheet, #qr-print-sheet * { visibility: visible !important; }
  #qr-print-sheet {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  body > div { min-height: 0 !important; }
  main { margin: 0 !important; padding: 0 !important; }
  .qr-print-hide { display: none !important; }
}
`;

export default async function QrPrintPage() {
  const session = await requireSession();
  const store = await prisma.store.findFirst({
    where: { id: session.storeId },
    select: { name: true, slug: true },
  });
  if (!store) redirect("/login");

  const reserveUrl = `${getAppUrl()}/r/${store.slug}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <div className="qr-print-hide mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">予約QRコードの掲示物</h1>
          <p className="mt-1 text-sm text-gray-500">
            A4サイズ縦向きで印刷できます。店頭やレジ横への掲示にご利用ください。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard/settings?tab=store"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft />
            設定に戻る
          </Link>
          <PrintButton />
        </div>
      </div>

      <div
        id="qr-print-sheet"
        className="mx-auto flex w-full max-w-[210mm] flex-col items-center gap-8 rounded-xl border border-gray-200 bg-white px-8 py-14 text-center shadow-sm sm:px-12"
      >
        <p className="text-lg font-medium text-gray-500">{store.name}</p>
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            LINEでカンタン予約
          </h2>
          <p className="text-base text-gray-600">
            スマートフォンのカメラでQRコードを読み取ってください
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/qr?type=booking"
          alt="Web予約ページのQRコード"
          width={320}
          height={320}
          className="h-[320px] w-[320px]"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">Web予約ページ</p>
          <p className="break-all font-mono text-sm text-gray-700">{reserveUrl}</p>
        </div>
        <p className="text-sm text-gray-500">
          24時間いつでもご予約いただけます。ご来店を心よりお待ちしております。
        </p>
      </div>
    </>
  );
}
