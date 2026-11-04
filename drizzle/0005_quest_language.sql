CREATE TYPE "public"."code_language" AS ENUM('c', 'cpp');--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "language" "code_language" DEFAULT 'c' NOT NULL;