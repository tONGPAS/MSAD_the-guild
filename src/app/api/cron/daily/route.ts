import { count, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { SESSION_IDLE_MINUTES } from "@/lib/rules";
import { evaluateStreaks } from "@/modules/progression/streaks";
import { reassignOverdue } from "@/modules/quests/service";

//SR-03: the once-a-day job (vercel.json). Every step is safe to run twice (NFR-09).
//It also keeps Supabase from pausing the database after 7 quiet days.
export async function GET(request: Request) {
  //Vercel sends "Bearer <CRON_SECRET>" when that variable is set in the project
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [u] = await db.select({ n: count() }).from(users);
  const cutoff = new Date(Date.now() - SESSION_IDLE_MINUTES * 60_000);
  const expired = await db.delete(sessions).where(lt(sessions.lastSeenAt, cutoff)).returning({ id: sessions.id });
  const reassigned = await reassignOverdue();
  const streaksChecked = await evaluateStreaks();

  return Response.json({ ok: true, users: u.n, expiredSessionsCleared: expired.length, reassigned, streaksChecked });
}
