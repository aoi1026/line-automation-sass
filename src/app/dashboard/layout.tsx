import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { isLineConfigured } from "@/lib/line/client";
import { DashboardShell } from "@/components/shell/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [store, user] = await Promise.all([
    prisma.store.findUnique({ where: { id: session.storeId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);
  if (!store || !user) redirect("/login");

  return (
    <DashboardShell
      storeName={store.name}
      userName={user.name}
      lineConfigured={isLineConfigured(store)}
    >
      {children}
    </DashboardShell>
  );
}
