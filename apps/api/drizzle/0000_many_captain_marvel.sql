CREATE TABLE IF NOT EXISTS "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"type" varchar(50) NOT NULL,
	"value" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"search_vector" "tsvector"
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_status_created_at_idx" ON "assets" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_search_vector_gin_idx" ON "assets" USING gin ("search_vector");