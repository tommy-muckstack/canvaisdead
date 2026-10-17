import { currentUser } from "@/lib/session";
import { Dashboard } from "@/components/canva/Dashboard";
export default async function Projects({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  const user = await currentUser();
  if (!user) return null;
  return <Dashboard uid={user.id} name={user.demo ? "" : user.name} demo={user.demo} view={params.view === "trash" ? "trash" : params.view === "starred" ? "starred" : "projects"} />;
}
