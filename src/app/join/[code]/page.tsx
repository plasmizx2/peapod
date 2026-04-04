import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { joinSessionByCode } from "@/lib/sessions/create-session";
import { normalizeJoinCode } from "@/lib/sessions/join-code";

type Props = { params: Promise<{ code: string }> };

export default async function JoinSessionPage({ params }: Props) {
  const { code: raw } = await params;
  const code = normalizeJoinCode(raw ?? "");
  if (code.length < 4) {
    redirect("/dashboard/sessions");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/join/${code}`)}`);
  }

  const result = await joinSessionByCode(session.user.id, code);
  if (!result.ok) {
    const q =
      result.reason === "not_found" ? "joinError=not_found" : "joinError=ended";
    redirect(`/dashboard/sessions?${q}`);
  }

  redirect(`/dashboard/sessions?session=${result.sessionId}`);
}
