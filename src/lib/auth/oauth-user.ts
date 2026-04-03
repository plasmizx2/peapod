import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Create or update app user from Google/GitHub profile; returns DB row with UUID `id`. */
export async function ensureUserFromOAuth(
  email: string,
  name: string | null | undefined,
  image: string | null | undefined,
) {
  const normalized = email.toLowerCase().trim();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        name: name ?? existing.name,
        image: image ?? existing.image,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    const [fresh] = await db
      .select()
      .from(users)
      .where(eq(users.id, existing.id))
      .limit(1);
    return fresh!;
  }

  const [created] = await db
    .insert(users)
    .values({
      email: normalized,
      name: name ?? null,
      image: image ?? null,
      passwordHash: null,
    })
    .returning();

  return created!;
}
