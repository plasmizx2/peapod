import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";

async function main() {
  const result = await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, "seandumont2005@gmail.com"))
    .returning({ id: users.id, email: users.email, role: users.role });
  console.log("Updated:", result);
  process.exit(0);
}

main();
