CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"source_type" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fetch_status" text DEFAULT 'pending' NOT NULL,
	"fetch_error" text,
	"fetched_at" timestamp with time zone,
	"title" text,
	"full_text" text,
	"char_count" integer,
	"score" integer,
	"signal_or_hype" text,
	"verdict" text,
	"opportunity_flag" boolean,
	"cluster_id" integer,
	"why" text,
	"key_claims" jsonb,
	"ranked_at" timestamp with time zone,
	"surfaced_in_run" uuid,
	"telegram_message_id" integer,
	"feedback" text,
	CONSTRAINT "items_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"read_count" integer DEFAULT 0 NOT NULL,
	"skim_count" integer DEFAULT 0 NOT NULL,
	"bury_count" integer DEFAULT 0 NOT NULL,
	"opportunity_count" integer DEFAULT 0 NOT NULL,
	"model" text,
	"tokens" jsonb,
	"cost_usd" text,
	CONSTRAINT "runs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_surfaced_in_run_runs_id_fk" FOREIGN KEY ("surfaced_in_run") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;