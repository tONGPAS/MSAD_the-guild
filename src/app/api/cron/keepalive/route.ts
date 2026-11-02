import { count, lt } from "drizzle-orm";
import { db } from "@/db";
import { quests, sessions, users } from "@/db/schema";
import { SESSION_IDLE_MINUTES } from "@/lib/rules";

//Supabase pauses Free plan projects after 7 days of low activity, and a paused
//database takes the whole site down. Vercel calls this once a day (vercel.json)
//so the database sees a few real queries even when no one uses the app.
export async function GET(request: Request) {
  //Vercel sends "Bearer <CRON_SECRET>" when that variable is set in the project
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [u] = await db.select({ n: count() }).from(users);
  const [q] = await db.select({ n: count() }).from(quests);

  //Only sessions already past the idle limit, which sign-in treats as ended anyway (FR-06)
  const cutoff = new Date(Date.now() - SESSION_IDLE_MINUTES * 60_000);
  const expired = await db.delete(sessions).where(lt(sessions.lastSeenAt, cutoff)).returning({ id: sessions.id });

  return Response.json({ ok: true, users: u.n, quests: q.n, expiredSessionsCleared: expired.length });
}
