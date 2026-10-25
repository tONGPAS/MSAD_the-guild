import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

//Reuse one connection pool across hot reloads in dev
const g = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

//Fail with a readable message instead of postgres.js's bare "Invalid URL"
function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !/^postgres(ql)?:\/\/.+@.+:\d+\/.+/.test(url)) {
    throw new Error(
      "DATABASE_URL is missing or not a full connection string. It must look like " +
        "postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:6543/postgres " +
        `(got ${url ? `"${url.slice(0, 12)}..."` : "nothing"}).`,
    );
  }
  return url;
}

//prepare:false is required by Supabase's transaction pooler (port 6543)
const client = g.pg ?? postgres(databaseUrl(), { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") g.pg = client;

export const db = drizzle(client, { schema });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DB = typeof db | Tx;
