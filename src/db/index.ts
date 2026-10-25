import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

//Reuse one connection pool across hot reloads in dev
const g = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

//prepare:false is required by Supabase's transaction pooler (port 6543)
const client = g.pg ?? postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") g.pg = client;

export const db = drizzle(client, { schema });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DB = typeof db | Tx;
