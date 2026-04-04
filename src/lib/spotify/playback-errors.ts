/**
 * Map Spotify Web API player errors to short copy for the group session UI.
 * https://developer.spotify.com/documentation/web-api/concepts/api-calls
 */
export function friendlyPlaybackFailure(
  status: number,
  rawBody: string,
): { message: string; hint: string } {
  let spotifyMessage = "";
  try {
    const j = JSON.parse(rawBody) as {
      error?: { message?: string; reason?: string };
    };
    spotifyMessage = j?.error?.message ?? j?.error?.reason ?? "";
  } catch {
    spotifyMessage = rawBody.slice(0, 160).trim();
  }

  const lower = spotifyMessage.toLowerCase();

  if (
    status === 404 ||
    lower.includes("no active device") ||
    lower.includes("device not found")
  ) {
    return {
      message: "No active Spotify device for the host.",
      hint: "Open Spotify on the host’s phone or desktop, play any song once, then tap Play next again.",
    };
  }

  if (
    status === 403 &&
    (lower.includes("premium") ||
      lower.includes("restriction") ||
      lower.includes("not available"))
  ) {
    return {
      message: "Spotify didn’t allow playback.",
      hint: "The host account may need Spotify Premium for remote playback, or the market may restrict this action.",
    };
  }

  if (status === 401) {
    return {
      message: "Spotify login expired for the host.",
      hint: "Host: open Music services and reconnect Spotify.",
    };
  }

  if (lower.includes("rate limit")) {
    return {
      message: "Spotify rate limit — try again in a minute.",
      hint: "",
    };
  }

  return {
    message: spotifyMessage || `Playback failed (HTTP ${status}).`,
    hint:
      "Host: keep Spotify open on a device, check volume, and try again.",
  };
}
