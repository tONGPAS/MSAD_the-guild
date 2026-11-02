import { db } from "@/db";
import { audit } from "@/lib/audit";
import { getSessionUser } from "@/modules/auth/session";
import { exportRows, parseRange } from "@/modules/dashboard/service";

const COLUMNS = [
  "quest", "submitted_at", "difficulty", "status", "submitter", "reviewer", "reviewed_at", "turnaround_hours",
  "readability", "correctness", "structure", "comment_words", "helpful", "mentor_reviewed", "reassignments",
];

function cell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

//FR-45: Faculty only, coded identities, every export audited
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "FACULTY" || !user.consented) return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  const rows = await exportRows(range);
  const csv = [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(","))].join("\r\n");
  await audit(db, user.id, "EXPORT", `quests ${range.fromKey}..${range.toKey} rows:${rows.length}`);

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="guild-${range.fromKey}-to-${range.toKey}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
