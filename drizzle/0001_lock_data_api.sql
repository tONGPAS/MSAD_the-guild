--Supabase exposes the public schema through its Data API, reachable with the anon key.
--The app connects to Postgres directly as a role that bypasses RLS, so enabling RLS
--with no policies blocks the Data API completely without affecting the app.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mentor_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "status_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "xp_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_badges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
