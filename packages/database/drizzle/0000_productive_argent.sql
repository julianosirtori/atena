CREATE TYPE "public"."action_taken" AS ENUM('blocked', 'handoff', 'generic_response');--> statement-breakpoint
CREATE TYPE "public"."agent_role" AS ENUM('admin', 'agent');--> statement-breakpoint
CREATE TYPE "public"."billing_status" AS ENUM('trial', 'active', 'past_due', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('whatsapp', 'instagram');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('text', 'image', 'audio', 'video', 'document');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('ai', 'waiting_human', 'human', 'closed');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('queued', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."detection_layer" AS ENUM('sanitization', 'prompt', 'validation');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('stage_change', 'score_change', 'assigned', 'unassigned', 'tag_added', 'tag_removed', 'handoff', 'follow_up_sent', 'converted', 'lost', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."incident_type" AS ENUM('injection_attempt', 'prompt_leak', 'off_topic', 'over_promise', 'validation_failed', 'identity_leak');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('new', 'qualifying', 'hot', 'human', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('follow_up', 'reminder', 'campaign');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('starter', 'pro', 'scale');--> statement-breakpoint
CREATE TYPE "public"."scheduled_status" AS ENUM('pending', 'sent', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sender_type" AS ENUM('lead', 'ai', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."validation_result" AS ENUM('valid', 'blocked', 'modified');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_provider" AS ENUM('zapi', 'meta_cloud');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "agent_role" DEFAULT 'agent' NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_online" boolean DEFAULT false,
	"max_concurrent" integer DEFAULT 10,
	"active_conversations" integer DEFAULT 0,
	"telegram_chat_id" text,
	"notification_preferences" jsonb DEFAULT '{"telegram":true,"web_push":true,"sound":true}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"status" "conversation_status" DEFAULT 'ai' NOT NULL,
	"assigned_agent_id" uuid,
	"ai_messages_count" integer DEFAULT 0,
	"human_messages_count" integer DEFAULT 0,
	"lead_messages_count" integer DEFAULT 0,
	"first_response_time_ms" integer,
	"ai_model" text DEFAULT 'claude-sonnet-4-20250514',
	"ai_summary" text,
	"handoff_reason" text,
	"handoff_at" timestamp with time zone,
	"opened_at" timestamp with time zone DEFAULT now(),
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"from_value" text,
	"to_value" text,
	"created_by" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text,
	"phone" text,
	"instagram_id" text,
	"email" text,
	"avatar_url" text,
	"channel" "channel" NOT NULL,
	"source" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"stage" "lead_stage" DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"tags" text[] DEFAULT '{}'::text[],
	"assigned_to" uuid,
	"last_counted_month" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"first_contact_at" timestamp with time zone DEFAULT now(),
	"last_contact_at" timestamp with time zone DEFAULT now(),
	"last_message_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"direction" "message_direction" NOT NULL,
	"sender_type" "sender_type" NOT NULL,
	"sender_agent_id" uuid,
	"content" text NOT NULL,
	"content_type" "content_type" DEFAULT 'text',
	"media_url" text,
	"ai_metadata" jsonb DEFAULT '{}'::jsonb,
	"delivery_status" "delivery_status" DEFAULT 'sent',
	"external_id" text,
	"injection_flags" text[] DEFAULT '{}'::text[],
	"validation_result" "validation_result" DEFAULT 'valid',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_lead_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"year_month" text NOT NULL,
	"lead_count" integer DEFAULT 0 NOT NULL,
	"notified_80" boolean DEFAULT false,
	"notified_100" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_type" "message_type" NOT NULL,
	"content" text,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" "scheduled_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid,
	"lead_id" uuid,
	"incident_type" "incident_type" NOT NULL,
	"severity" "severity" DEFAULT 'low' NOT NULL,
	"lead_message" text,
	"ai_response" text,
	"detection_layer" "detection_layer",
	"action_taken" "action_taken",
	"resolved" boolean DEFAULT false,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" "plan" DEFAULT 'starter' NOT NULL,
	"leads_limit" integer DEFAULT 300 NOT NULL,
	"agents_limit" integer DEFAULT 1 NOT NULL,
	"business_name" text NOT NULL,
	"business_description" text,
	"products_info" text,
	"pricing_info" text,
	"faq" text,
	"business_hours" text,
	"payment_methods" text,
	"custom_instructions" text,
	"whatsapp_provider" "whatsapp_provider" DEFAULT 'zapi',
	"whatsapp_config" jsonb DEFAULT '{}'::jsonb,
	"instagram_config" jsonb DEFAULT '{}'::jsonb,
	"telegram_bot_config" jsonb DEFAULT '{}'::jsonb,
	"handoff_rules" jsonb DEFAULT '{"score_threshold":60,"max_ai_turns":15,"business_hours_only":false,"handoff_intents":["complaint"],"auto_handoff_on_price":false,"follow_up_enabled":false,"follow_up_delay_hours":24}'::jsonb NOT NULL,
	"stripe_customer_id" text,
	"billing_status" "billing_status" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_notes" ADD CONSTRAINT "conversation_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_notes" ADD CONSTRAINT "conversation_notes_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_notes" ADD CONSTRAINT "conversation_notes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_agent_id_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_agents_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_agent_id_agents_id_fk" FOREIGN KEY ("sender_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_lead_counts" ADD CONSTRAINT "monthly_lead_counts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_resolved_by_agents_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agents_tenant_email" ON "agents" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "idx_agents_tenant" ON "agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_notes_conversation" ON "conversation_notes" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_conversations_tenant" ON "conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_lead" ON "conversations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_status" ON "conversations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_conversations_waiting" ON "conversations" USING btree ("tenant_id","handoff_at") WHERE "conversations"."status" = 'waiting_human';--> statement-breakpoint
CREATE INDEX "idx_lead_events_lead" ON "lead_events" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_leads_phone" ON "leads" USING btree ("tenant_id","phone") WHERE "leads"."phone" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_leads_instagram" ON "leads" USING btree ("tenant_id","instagram_id") WHERE "leads"."instagram_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_leads_tenant" ON "leads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_leads_stage" ON "leads" USING btree ("tenant_id","stage");--> statement-breakpoint
CREATE INDEX "idx_leads_score" ON "leads" USING btree ("tenant_id","score");--> statement-breakpoint
CREATE INDEX "idx_leads_campaign" ON "leads" USING btree ("tenant_id","utm_campaign") WHERE "leads"."utm_campaign" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_leads_last_message" ON "leads" USING btree ("tenant_id","last_message_at") WHERE "leads"."last_message_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_tenant" ON "messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_monthly_lead_counts_unique" ON "monthly_lead_counts" USING btree ("tenant_id","year_month");--> statement-breakpoint
CREATE INDEX "idx_scheduled_pending" ON "scheduled_messages" USING btree ("scheduled_for") WHERE "scheduled_messages"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_security_tenant" ON "security_incidents" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_security_unresolved" ON "security_incidents" USING btree ("tenant_id") WHERE "security_incidents"."resolved" = false;--> statement-breakpoint
CREATE INDEX "idx_tenants_slug" ON "tenants" USING btree ("slug");