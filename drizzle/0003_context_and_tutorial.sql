ALTER TABLE "quests" ADD COLUMN "context" varchar(500);--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "notes" varchar(1000);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tour_done_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "training_done_at" timestamp with time zone;