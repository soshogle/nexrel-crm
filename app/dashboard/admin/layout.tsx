import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const isSuperAdmin =
    session.user.role === "SUPER_ADMIN" ||
    Boolean(session.user.isImpersonating && session.user.superAdminId);
  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin && !isSuperAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
