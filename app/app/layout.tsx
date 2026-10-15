import { redirect } from "next/navigation";
import { currentUser, entryRedirect } from "@/lib/session";
import { AppShell } from "@/components/canva/AppShell";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect(entryRedirect("/app"));
  return <div className="app-root"><AppShell user={user}>{children}</AppShell></div>;
}
