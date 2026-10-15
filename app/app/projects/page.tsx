import { currentUser } from "@/lib/session";
import { Dashboard } from "@/components/canva/Dashboard";
export default async function Projects() {
  const user = await currentUser();
  if (!user) return null;
  return <Dashboard uid={user.id} name={user.demo ? "" : user.name} demo={user.demo} view="projects" />;
}
