import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * 顧客一覧をCSVでダウンロードするリンク。
 * 一覧の絞り込み（検索キーワード・タグ）をそのままAPIへ引き継ぐため、
 * 画面に表示されている内容と同じ範囲が書き出される。
 * ファイル名はAPIのContent-Dispositionヘッダーに従う。
 */
export function CustomersExportButton({ q, tagId }: { q: string; tagId: string }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tagId) params.set("tagId", tagId);
  const qs = params.toString();

  return (
    <a
      href={`/api/customers/export${qs ? `?${qs}` : ""}`}
      download
      className={buttonVariants({ variant: "outline" })}
    >
      <Download />
      CSVで書き出し
    </a>
  );
}
