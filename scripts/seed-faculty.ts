//Creates the first Faculty account, since every other account needs an invitation from Faculty (BRL-01)
//Usage: set SEED_FACULTY_EMAIL, SEED_FACULTY_NAME, SEED_FACULTY_PASSWORD in .env, then: npm run db:seed
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../src/db/schema";

async function main() {
  const email = process.env.SEED_FACULTY_EMAIL?.trim().toLowerCase();
  const name = process.env.SEED_FACULTY_NAME?.trim();
  const password = process.env.SEED_FACULTY_PASSWORD;
  if (!email || !name || !password || password.length < 8) {
    throw new Error("Set SEED_FACULTY_EMAIL, SEED_FACULTY_NAME and SEED_FACULTY_PASSWORD (8+ chars) in .env");
  }
  const client = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (exists) {
    console.log(`Faculty account ${email} already exists, nothing to do.`);
  } else {
    await db.insert(users).values({ email, name, role: "FACULTY", passwordHash: await bcrypt.hash(password, 10) });
    console.log(`Created Faculty account ${email}. You can now sign in at /signin.`);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
