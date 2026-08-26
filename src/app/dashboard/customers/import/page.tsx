import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ImportWizard } from "./_components/import-wizard";
import { normalizePhone } from "./_components/csv-mapping";

export default async function CustomersImportPage() {
  const session = await requireSession();

  // プレビューで「新規 / 更新」を判定するため、既存顧客の電話番号を渡す
  const customers = await prisma.customer.findMany({
    where: { storeId: session.storeId, NOT: { phone: "" } },
    select: { name: true, phone: true },
    orderBy: { createdAt: "asc" },
  });

  const existingByPhone: Record<string, string> = {};
  for (const customer of customers) {
    const key = normalizePhone(customer.phone);
    if (key && existingByPhone[key] === undefined) existingByPhone[key] = customer.name;
  }

  return (
    <>
      <PageHeader
        title="顧客をCSVインポート"
        description="他システムからの移行や紙台帳のデータを、CSVファイルからまとめて登録・更新できます。"
        actions={
          <Link
            href="/dashboard/customers"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft />
            顧客一覧に戻る
          </Link>
        }
      />
      <ImportWizard existingByPhone={existingByPhone} />
    </>
  );
}
