CREATE TABLE IF NOT EXISTS "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" text NOT NULL,
	"creator_session_token" text NOT NULL,
	"joiner_session_token" text NOT NULL,
	"creator_nickname" text NOT NULL,
	"joiner_nickname" text NOT NULL,
	"settings" jsonb NOT NULL,
	"secrets" jsonb NOT NULL,
	"guess_log" jsonb NOT NULL,
	"outcome" jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_room_code_ended_at_idx" ON "matches" USING btree ("room_code","ended_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_creator_token_idx" ON "matches" USING btree ("creator_session_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_joiner_token_idx" ON "matches" USING btree ("joiner_session_token");