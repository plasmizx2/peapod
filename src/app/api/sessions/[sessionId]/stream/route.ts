import { auth } from "@/auth";
import { getSessionLobbyForUser } from "@/lib/sessions/create-session";
import { getSessionQueue } from "@/lib/sessions/queue";
import { computeCrowdEnergy } from "@/lib/sessions/crowd-energy";
import {
  getHostNowPlayingPayloadCached,
  slimNowPlaying,
} from "@/lib/spotify/player-devices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * Server-Sent Events: pushes lobby snapshots when the member list or session
 * status changes (~1s cadence; client reconnects when the stream ends or tab sleeps).
 */
export async function GET(req: Request, context: RouteContext) {
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
  const signal = req.signal;

  function safeEnqueue(controller: ReadableStreamDefaultController<Uint8Array>, chunk: Uint8Array) {
    try {
      controller.enqueue(chunk);
      return true;
    } catch {
      return false;
    }
  }

  function safeClose(controller: ReadableStreamDefaultController<Uint8Array>) {
    try {
      controller.close();
    } catch {
      /* already closed (client disconnected) */
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      let lastPayload = "";
      const streamUntil = Date.now() + 52_000;
      try {
        while (Date.now() < streamUntil && !signal.aborted) {
          const lobby = await getSessionLobbyForUser(sessionId, userId);
          if (!lobby) {
            safeEnqueue(
              controller,
              encoder.encode(`data: ${JSON.stringify({ type: "gone" })}\n\n`),
            );
            break;
          }

          const queue = await getSessionQueue(sessionId, userId);
          const nowPlaying = slimNowPlaying(
            await getHostNowPlayingPayloadCached(lobby.hostUserId),
          );
          const crowdEnergy = await computeCrowdEnergy(sessionId);

          const body = {
            type: "lobby" as const,
            isHost: userId === lobby.hostUserId,
            queue: queue ?? [],
            nowPlaying,
            crowdEnergy,
            ...lobby,
          };
          const json = JSON.stringify(body);
          if (json !== lastPayload) {
            lastPayload = json;
            if (!safeEnqueue(controller, encoder.encode(`data: ${json}\n\n`))) {
              break;
            }
          }
          await new Promise((r) => setTimeout(r, 900));
        }
      } catch (e) {
        console.error("[sessions/stream]", e);
        safeEnqueue(
          controller,
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "stream failed" })}\n\n`,
          ),
        );
      } finally {
        safeClose(controller);
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
