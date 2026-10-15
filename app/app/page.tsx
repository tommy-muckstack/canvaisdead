import { currentUser } from "@/lib/session";
import { Dashboard } from "@/components/canva/Dashboard";
export default async function AppHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await currentUser();
  if (!user) return null; // The app layout redirects to guest entry; children render concurrently.
  const { q } = await searchParams;
  return <Dashboard uid={user.id} name={user.demo ? "" : user.name} demo={user.demo} q={q} />;
}
