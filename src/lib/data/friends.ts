import { and, eq, or, count, desc } from "drizzle-orm";
import { db } from "@/db";
import { friendships, users, userProfiles } from "@/db/schema";

export type FriendRow = {
  friendshipId: string;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  /** Whether I sent or received the request */
  direction: "sent" | "received";
  createdAt: string;
};

/**
 * Get all friends + pending requests for a user.
 */
export async function getFriends(userId: string): Promise<FriendRow[]> {
  // Friendships where I'm the requester
  const sent = await db
    .select({
      friendshipId: friendships.id,
      otherUserId: friendships.addresseeId,
      status: friendships.status,
      createdAt: friendships.createdAt,
      otherName: users.name,
      otherEmail: users.email,
      otherDisplayName: userProfiles.displayName,
      otherAvatar: userProfiles.avatarUrl,
    })
    .from(friendships)
    .innerJoin(users, eq(friendships.addresseeId, users.id))
    .leftJoin(userProfiles, eq(friendships.addresseeId, userProfiles.userId))
    .where(eq(friendships.requesterId, userId));

  // Friendships where I'm the addressee
  const received = await db
    .select({
      friendshipId: friendships.id,
      otherUserId: friendships.requesterId,
      status: friendships.status,
      createdAt: friendships.createdAt,
      otherName: users.name,
      otherEmail: users.email,
      otherDisplayName: userProfiles.displayName,
      otherAvatar: userProfiles.avatarUrl,
    })
    .from(friendships)
    .innerJoin(users, eq(friendships.requesterId, users.id))
    .leftJoin(userProfiles, eq(friendships.requesterId, userProfiles.userId))
    .where(eq(friendships.addresseeId, userId));

  const toRow = (
    r: (typeof sent)[number],
    direction: "sent" | "received",
  ): FriendRow => ({
    friendshipId: r.friendshipId,
    userId: r.otherUserId,
    displayName:
      r.otherDisplayName?.trim() ||
      r.otherName?.trim() ||
      r.otherEmail?.split("@")[0] ||
      "Someone",
    email: r.otherEmail,
    avatarUrl: r.otherAvatar,
    status: r.status,
    direction,
    createdAt: r.createdAt.toISOString(),
  });

  return [
    ...sent.map((r) => toRow(r, "sent")),
    ...received.map((r) => toRow(r, "received")),
  ].sort((a, b) => {
    // pending first, then accepted, then by date
    const statusOrder: Record<string, number> = { pending: 0, accepted: 1, declined: 2 };
    const sa = statusOrder[a.status] ?? 3;
    const sb = statusOrder[b.status] ?? 3;
    if (sa !== sb) return sa - sb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Send a friend request by email.
 */
export async function sendFriendRequest(
  requesterId: string,
  addresseeEmail: string,
): Promise<
  | { ok: true; friendshipId: string }
  | { ok: false; reason: "not_found" | "self" | "already_exists" }
> {
  // Find the addressee
  const [addressee] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, addresseeEmail.toLowerCase().trim()))
    .limit(1);

  if (!addressee) return { ok: false, reason: "not_found" };
  if (addressee.id === requesterId) return { ok: false, reason: "self" };

  // Check if friendship already exists (either direction)
  const [existing] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, requesterId),
          eq(friendships.addresseeId, addressee.id),
        ),
        and(
          eq(friendships.requesterId, addressee.id),
          eq(friendships.addresseeId, requesterId),
        ),
      ),
    )
    .limit(1);

  if (existing) return { ok: false, reason: "already_exists" };

  const [row] = await db
    .insert(friendships)
    .values({
      requesterId,
      addresseeId: addressee.id,
      status: "pending",
    })
    .returning({ id: friendships.id });

  return { ok: true, friendshipId: row.id };
}

/**
 * Accept or decline a friend request.
 */
export async function respondToFriendRequest(
  userId: string,
  friendshipId: string,
  action: "accepted" | "declined",
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "not_addressee" | "not_pending" }> {
  const [row] = await db
    .select({
      addresseeId: friendships.addresseeId,
      status: friendships.status,
    })
    .from(friendships)
    .where(eq(friendships.id, friendshipId))
    .limit(1);

  if (!row) return { ok: false, reason: "not_found" };
  if (row.addresseeId !== userId) return { ok: false, reason: "not_addressee" };
  if (row.status !== "pending") return { ok: false, reason: "not_pending" };

  await db
    .update(friendships)
    .set({ status: action, updatedAt: new Date() })
    .where(eq(friendships.id, friendshipId));

  return { ok: true };
}

/**
 * Remove a friendship (unfriend). Either party can do this.
 */
export async function removeFriendship(
  userId: string,
  friendshipId: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "not_member" }> {
  const [row] = await db
    .select({
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
    })
    .from(friendships)
    .where(eq(friendships.id, friendshipId))
    .limit(1);

  if (!row) return { ok: false, reason: "not_found" };
  if (row.requesterId !== userId && row.addresseeId !== userId) {
    return { ok: false, reason: "not_member" };
  }

  await db.delete(friendships).where(eq(friendships.id, friendshipId));
  return { ok: true };
}

/**
 * Get count of pending incoming friend requests.
 */
export async function getPendingFriendCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(friendships)
    .where(
      and(
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "pending"),
      ),
    );
  return Number(row?.n ?? 0);
}
