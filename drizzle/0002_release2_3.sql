CREATE TYPE "public"."reassign_reason" AS ENUM('OVERDUE', 'CLAIMED');--> statement-breakpoint
CREATE TABLE "reassignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"from_reviewer" uuid NOT NULL,
	"to_reviewer" uuid NOT NULL,
	"reason" "reassign_reason" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "streak_week" date;--> statement-breakpoint
ALTER TABLE "reassignments" ADD CONSTRAINT "reassignments_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reassignments" ADD CONSTRAINT "reassignments_from_reviewer_users_id_fk" FOREIGN KEY ("from_reviewer") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reassignments" ADD CONSTRAINT "reassignments_to_reviewer_users_id_fk" FOREIGN KEY ("to_reviewer") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reassign_quest_idx" ON "reassignments" USING btree ("quest_id");--> statement-breakpoint
CREATE INDEX "reassign_from_idx" ON "reassignments" USING btree ("from_reviewer","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_open_idx" ON "mentor_requests" USING btree ("quest_id") WHERE status <> 'RESOLVED';--> statement-breakpoint
ALTER TABLE "reassignments" ENABLE ROW LEVEL SECURITY;