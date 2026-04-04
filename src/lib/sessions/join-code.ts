const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 6-character code (no ambiguous 0/O/1/I). */
export function generateJoinCode(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CHARSET[buf[i]! % CHARSET.length];
  }
  return s;
}

export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
