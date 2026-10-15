import { currentUser } from "@/lib/session";
import { Dashboard } from "@/components/canva/Dashboard";
export default async function Templates() {
  const user = (await currentUser())!;
  return <Dashboard uid={user.id} name={user.demo ? "" : user.name} demo={user.demo} view="templates" />;
}
