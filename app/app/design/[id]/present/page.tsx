import { currentUser } from "@/lib/session";
import { presentMode, presentationSession } from "@/lib/design/presentation";
import { PresentationLoader } from "@/components/canva/Presentation";
export const metadata = { title: "Present | CanvaIsDead" };
export default async function PresentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string; session?: string; page?: string }> }) {
  const user = (await currentUser())!, { id } = await params, query = await searchParams;
  return <PresentationLoader uid={user.id} id={id} mode={presentMode(query.mode)} session={presentationSession(query.session)} initialPage={Number(query.page) || 1} />;
}
