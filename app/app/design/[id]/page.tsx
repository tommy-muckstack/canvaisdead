import { currentUser } from "@/lib/session";
import { EditorLoader } from "@/components/canva/EditorLoader";
export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await currentUser())!; const { id } = await params;
  return <EditorLoader uid={user.id} id={id} />;
}
