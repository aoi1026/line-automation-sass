import { Download, Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Web予約ページのQRコードを表示するカード */
export function QrCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>予約QRコード</CardTitle>
        <CardDescription>Web予約ページを開くためのQRコードです。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/qr?type=booking"
            alt="Web予約ページのQRコード"
            width={200}
            height={200}
            className="h-[200px] w-[200px] shrink-0 rounded-lg border border-gray-200 bg-white p-1"
          />
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <p className="text-sm text-gray-600">
              店頭やショップカードに掲示して、お客様にWeb予約をご案内いただけます。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href="/api/qr?type=booking"
                download="予約QRコード.png"
                className={buttonVariants({ variant: "outline" })}
              >
                <Download />
                画像をダウンロード
              </a>
              <a
                href="/dashboard/settings/qr-print"
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                <Printer />
                印刷用ページを開く
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
