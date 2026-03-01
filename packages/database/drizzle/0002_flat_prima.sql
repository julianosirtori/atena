CREATE TYPE "public"."campaign_match_method" AS ENUM('utm', 'manual', 'default');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('launch', 'promotion', 'recurring', 'evergreen', 'other');--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'campaign_joined';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'campaign_completed';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'pipeline_stage_moved';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'automation_triggered';--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "campaign_type" DEFAULT 'other' NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"auto_activate" boolean DEFAULT false,
	"products_info" text,
	"pricing_info" text,
	"faq" text,
	"custom_instructions" text,
	"fallback_message" text,
	"handoff_rules" jsonb,
	"utm_rules" jsonb DEFAULT '[]'::jsonb,
	"is_default" boolean DEFAULT false,
	"goal_leads" integer,
	"goal_conversions" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"matched_by" "campaign_match_method" NOT NULL,
	"matched_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#6B7280',
	"is_won" boolean DEFAULT false,
	"is_lost" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "active_campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "pipeline_stage_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_campaigns" ADD CONSTRAINT "lead_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_campaigns" ADD CONSTRAINT "lead_campaigns_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_campaigns" ADD CONSTRAINT "lead_campaigns_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaigns_tenant" ON "campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_campaigns_status" ON "campaigns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_campaigns_default" ON "campaigns" USING btree ("tenant_id","is_default") WHERE "campaigns"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_lead_campaigns_unique" ON "lead_campaigns" USING btree ("lead_id","campaign_id");--> statement-breakpoint
CREATE INDEX "idx_lead_campaigns_campaign" ON "lead_campaigns" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_lead_campaigns_lead" ON "lead_campaigns" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_pipeline_stages_tenant" ON "pipeline_stages" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pipeline_stages_position" ON "pipeline_stages" USING btree ("tenant_id","position");