CREATE TYPE "public"."challenge_kind" AS ENUM('GOAL', 'CODING', 'REVIEW');--> statement-breakpoint
CREATE TYPE "public"."challenge_metric" AS ENUM('REVIEWS', 'PRAISE', 'DEEP_REVIEWS', 'FAST_RESOLVES', 'HELPFUL', 'COINS');--> statement-breakpoint
CREATE TYPE "public"."challenge_scope" AS ENUM('PERSONAL', 'GUILD');--> statement-breakpoint
CREATE TABLE "challenge_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"quest_id" uuid,
	"review" jsonb,
	"words" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "challenge_kind" NOT NULL,
	"scope" "challenge_scope" DEFAULT 'PERSONAL' NOT NULL,
	"metric" "challenge_metric",
	"target" smallint,
	"title" varchar(80) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"code" varchar(10000),
	"context" varchar(500),
	"language" "code_language" DEFAULT 'c' NOT NULL,
	"xp_reward" smallint NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"template_key" varchar(40),
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rewarded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "challenge_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "coin_comment_id" uuid;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_entry_once_idx" ON "challenge_entries" USING btree ("challenge_id","user_id");--> statement-breakpoint
CREATE INDEX "challenges_window_idx" ON "challenges" USING btree ("ends_at","starts_at");--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE set null ON UPDATE no action;