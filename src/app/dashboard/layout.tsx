import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { isLineConfigured } from "@/lib/line/client";
import { countUnread } from "@/lib/notifications";
import { DashboardShell } from "@/components/shell/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [store, user, unreadCount] = await Promise.all([
    prisma.store.findUnique({ where: { id: session.storeId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
    countUnread(session.storeId),
  ]);
  if (!store || !user) redirect("/login");

  return (
    <DashboardShell
      storeName={store.name}
      userName={user.name}
      lineConfigured={isLineConfigured(store)}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
