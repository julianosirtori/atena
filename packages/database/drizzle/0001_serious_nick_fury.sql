ALTER TABLE "messages" ADD COLUMN "correlation_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fallback_message" text;--> statement-breakpoint
CREATE INDEX "idx_messages_correlation_id" ON "messages" USING btree ("correlation_id") WHERE correlation_id IS NOT NULL;