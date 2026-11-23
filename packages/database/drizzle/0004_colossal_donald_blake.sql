CREATE TABLE "assistant_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"question_en" varchar(300) NOT NULL,
	"question_ar" varchar(300) NOT NULL,
	"answer_en" text NOT NULL,
	"answer_ar" text NOT NULL,
	"video_id" uuid,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" varchar(24) DEFAULT 'DRAFT' NOT NULL,
	"reviewer_id" uuid,
	"medical_revision" integer,
	"compliance_revision" integer,
	"approval_reference" varchar(300),
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_faq_status" CHECK ("assistant_faqs"."status" IN ('DRAFT','PENDING_REVIEW','CHANGES_REQUESTED','REJECTED','APPROVED','PUBLISHED','ARCHIVED'))
);
--> statement-breakpoint
CREATE TABLE "assistant_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faq_id" uuid NOT NULL,
	"helpful" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title_en" varchar(200) NOT NULL,
	"title_ar" varchar(200) NOT NULL,
	"body_en" text NOT NULL,
	"body_ar" text NOT NULL,
	"campaign_type" varchar(24) NOT NULL,
	"video_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" varchar(24) DEFAULT 'DRAFT' NOT NULL,
	"reviewer_id" uuid,
	"medical_revision" integer,
	"compliance_revision" integer,
	"approval_reference" varchar(300),
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_campaigns_slug_unique" UNIQUE("slug"),
	CONSTRAINT "marketing_campaign_dates" CHECK ("marketing_campaigns"."ends_at" > "marketing_campaigns"."starts_at"),
	CONSTRAINT "marketing_campaign_slug" CHECK ("marketing_campaigns"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "marketing_campaign_type" CHECK ("marketing_campaigns"."campaign_type" IN ('AWARENESS','EDUCATION','ANNOUNCEMENT','PROMOTION')),
	CONSTRAINT "marketing_campaign_status" CHECK ("marketing_campaigns"."status" IN ('DRAFT','PENDING_REVIEW','CHANGES_REQUESTED','REJECTED','APPROVED','SCHEDULED','ACTIVE','PAUSED','COMPLETED'))
);
--> statement-breakpoint
CREATE TABLE "marketing_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"version" varchar(40) NOT NULL,
	"locale" varchar(2) NOT NULL,
	"scopes" jsonb NOT NULL,
	"source" varchar(32) NOT NULL,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"campaign_id" uuid,
	"qr_id" uuid,
	"source" varchar(24) NOT NULL,
	"event_type" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_event_type" CHECK ("marketing_events"."event_type" IN ('VISIT','QR_SCAN','WHATSAPP','DIRECTIONS','CALL','ASSISTANT','VIDEO_CONTACT','CAMPAIGN_VIEW'))
);
--> statement-breakpoint
CREATE TABLE "marketing_campaign_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"faq_id" uuid,
	"reviewer_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"kind" varchar(20) NOT NULL,
	"decision" varchar(24) NOT NULL,
	"comments" text NOT NULL,
	"approval_reference" varchar(300),
	"valid_until" timestamp with time zone,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_review_target" CHECK (("marketing_campaign_reviews"."campaign_id" IS NULL) <> ("marketing_campaign_reviews"."faq_id" IS NULL)),
	CONSTRAINT "marketing_review_kind" CHECK ("marketing_campaign_reviews"."kind" IN ('MEDICAL','COMPLIANCE') AND "marketing_campaign_reviews"."decision" IN ('APPROVE','NOT_REQUIRED','REJECT','CHANGES_REQUESTED'))
);
--> statement-breakpoint
CREATE TABLE "marketing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"contact_hash" varchar(64) NOT NULL,
	"contact_cipher" text,
	"state" varchar(20) DEFAULT 'UNVERIFIED' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_state" CHECK ("marketing_subscriptions"."state" IN ('UNVERIFIED','CONFIRMED','WITHDRAWN'))
);
--> statement-breakpoint
CREATE TABLE "marketing_suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"contact_hash" varchar(64) NOT NULL,
	"reason" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_webhook_receipts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_message_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"approved_by" uuid NOT NULL,
	"template_name" varchar(160) NOT NULL,
	"provider_message_id" varchar(200),
	"state" varchar(20) DEFAULT 'DISABLED' NOT NULL,
	"cost_minor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbound_message_jobs_provider_message_id_unique" UNIQUE("provider_message_id")
);
--> statement-breakpoint
CREATE TABLE "qr_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"branch_id" uuid NOT NULL,
	"campaign_id" uuid,
	"label" varchar(160) NOT NULL,
	"destination" varchar(20) NOT NULL,
	"source" varchar(24) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_campaigns_code_unique" UNIQUE("code"),
	CONSTRAINT "qr_destination" CHECK ("qr_campaigns"."destination" IN ('WEBSITE','WHATSAPP','MAPS')),
	CONSTRAINT "qr_source" CHECK ("qr_campaigns"."source" IN ('BUSINESS_CARD','COUNTER','BAG','POSTER','EVENT'))
);
--> statement-breakpoint
CREATE TABLE "marketing_subscription_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"manage_hash" varchar(64) NOT NULL,
	"locale" varchar(2) NOT NULL,
	"scopes" jsonb NOT NULL,
	"consent_version" varchar(40) NOT NULL,
	"source" varchar(24) NOT NULL,
	"qr_id" uuid,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_subscription_requests_manage_hash_unique" UNIQUE("manage_hash"),
	CONSTRAINT "subscription_request_status" CHECK ("marketing_subscription_requests"."status" IN ('PENDING','CONFIRMED','WITHDRAWN','EXPIRED'))
);
--> statement-breakpoint
ALTER TABLE "assistant_faqs" ADD CONSTRAINT "assistant_faqs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_faqs" ADD CONSTRAINT "assistant_faqs_author_id_staff_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_faqs" ADD CONSTRAINT "assistant_faqs_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_faqs" ADD CONSTRAINT "assistant_faqs_reviewer_id_staff_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_feedback" ADD CONSTRAINT "assistant_feedback_faq_id_assistant_faqs_id_fk" FOREIGN KEY ("faq_id") REFERENCES "public"."assistant_faqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_author_id_staff_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_reviewer_id_staff_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_consents" ADD CONSTRAINT "marketing_consents_subscription_id_marketing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."marketing_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_consents" ADD CONSTRAINT "marketing_consents_request_id_marketing_subscription_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."marketing_subscription_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_consents" ADD CONSTRAINT "marketing_consents_verified_by_staff_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_qr_id_qr_campaigns_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaign_reviews" ADD CONSTRAINT "marketing_campaign_reviews_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaign_reviews" ADD CONSTRAINT "marketing_campaign_reviews_faq_id_assistant_faqs_id_fk" FOREIGN KEY ("faq_id") REFERENCES "public"."assistant_faqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaign_reviews" ADD CONSTRAINT "marketing_campaign_reviews_reviewer_id_staff_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_subscriptions" ADD CONSTRAINT "marketing_subscriptions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_suppressions" ADD CONSTRAINT "marketing_suppressions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_message_jobs" ADD CONSTRAINT "outbound_message_jobs_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_message_jobs" ADD CONSTRAINT "outbound_message_jobs_subscription_id_marketing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."marketing_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_message_jobs" ADD CONSTRAINT "outbound_message_jobs_approved_by_staff_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_campaigns" ADD CONSTRAINT "qr_campaigns_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_campaigns" ADD CONSTRAINT "qr_campaigns_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_campaigns" ADD CONSTRAINT "qr_campaigns_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_subscription_requests" ADD CONSTRAINT "marketing_subscription_requests_subscription_id_marketing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."marketing_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_subscription_requests" ADD CONSTRAINT "marketing_subscription_requests_qr_id_qr_campaigns_id_fk" FOREIGN KEY ("qr_id") REFERENCES "public"."qr_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_faq_public" ON "assistant_faqs" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "marketing_campaign_public" ON "marketing_campaigns" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "marketing_campaign_branch" ON "marketing_campaigns" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_consent_idempotent" ON "marketing_consents" USING btree ("request_id","kind");--> statement-breakpoint
CREATE INDEX "marketing_consent_history" ON "marketing_consents" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "marketing_events_report" ON "marketing_events" USING btree ("branch_id","campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "marketing_reviews_campaign" ON "marketing_campaign_reviews" USING btree ("campaign_id","revision");--> statement-breakpoint
CREATE INDEX "marketing_reviews_faq" ON "marketing_campaign_reviews" USING btree ("faq_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_contact_branch" ON "marketing_subscriptions" USING btree ("branch_id","contact_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_suppression_unique" ON "marketing_suppressions" USING btree ("branch_id","contact_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_idempotent" ON "outbound_message_jobs" USING btree ("campaign_id","subscription_id","template_name");--> statement-breakpoint
CREATE INDEX "qr_branch" ON "qr_campaigns" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "subscription_request_lookup" ON "marketing_subscription_requests" USING btree ("subscription_id","status");