import { auth } from "@/auth";
import { getSessionLobbyForUser } from "@/lib/sessions/create-session";
import { getSessionQueue } from "@/lib/sessions/queue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * Server-Sent Events: pushes lobby snapshots when the member list or session
 * status changes (~1s cadence; reconnects for long-lived lobbies).
 */
export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!sessionId) {
    return new Response("Bad Request", { status: 400 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPayload = "";
      try {
        for (let i = 0; i < 70; i++) {
          const lobby = await getSessionLobbyForUser(sessionId, userId);
          if (!lobby) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "gone" })}\n\n`,
              ),
            );
            break;
          }

          const queue = await getSessionQueue(sessionId, userId);

          const body = {
            type: "lobby" as const,
            isHost: userId === lobby.hostUserId,
            queue: queue ?? [],
            ...lobby,
          };
          const json = JSON.stringify(body);
          if (json !== lastPayload) {
            lastPayload = json;
            controller.enqueue(encoder.encode(`data: ${json}\n\n`));
          }
          await new Promise((r) => setTimeout(r, 900));
        }
      } catch (e) {
        console.error("[sessions/stream]", e);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "stream failed" })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
