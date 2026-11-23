CREATE TYPE "public"."health_asset_type" AS ENUM('SOURCE', 'PLAYBACK', 'THUMBNAIL', 'CAPTIONS_EN', 'CAPTIONS_AR');--> statement-breakpoint
CREATE TYPE "public"."health_review_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');--> statement-breakpoint
CREATE TYPE "public"."health_video_status" AS ENUM('DRAFT', 'UPLOADING', 'PROCESSING', 'PROCESSING_FAILED', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "health_video_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"asset_type" "health_asset_type" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(80) NOT NULL,
	"file_size" bigint NOT NULL,
	"processing_status" varchar(20) DEFAULT 'READY' NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_video_assets_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "health_asset_size" CHECK ("health_video_assets"."file_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "health_video_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title_en" varchar(160) NOT NULL,
	"title_ar" varchar(160) NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_ar" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_video_categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "health_category_slug" CHECK ("health_video_categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "health_video_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"branch_id" uuid,
	"event_type" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_event_values" CHECK ("health_video_events"."event_type" IN ('VIEW','COMPLETE','CONTACT','WHATSAPP','DIRECTIONS'))
);
--> statement-breakpoint
CREATE TABLE "health_video_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"source_title" varchar(200) NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_video_reviewer_assignments" (
	"video_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_video_reviewer_assignments_video_id_reviewer_id_pk" PRIMARY KEY("video_id","reviewer_id")
);
--> statement-breakpoint
CREATE TABLE "health_video_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"kind" varchar(20) NOT NULL,
	"decision" varchar(30) NOT NULL,
	"comments" text NOT NULL,
	"approval_reference" varchar(300),
	"valid_until" timestamp with time zone,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_review_kind" CHECK ("health_video_reviews"."kind" IN ('MEDICAL','COMPLIANCE') AND "health_video_reviews"."decision" IN ('APPROVE','REJECT','CHANGES_REQUESTED','NOT_REQUIRED'))
);
--> statement-breakpoint
CREATE TABLE "health_video_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"state" varchar(20) DEFAULT 'STREAMING' NOT NULL,
	"reserved_bytes" bigint NOT NULL,
	"expected_bytes" bigint NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(80),
	"checksum" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_upload_bounds" CHECK ("health_video_uploads"."reserved_bytes" >= 0 AND "health_video_uploads"."expected_bytes" > 0 AND "health_video_uploads"."retry_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "health_video_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title_en" varchar(200) NOT NULL,
	"title_ar" varchar(200) NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_ar" text DEFAULT '' NOT NULL,
	"category_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"visibility_scope" varchar(20) DEFAULT 'BRANCH' NOT NULL,
	"content_kind" varchar(25) DEFAULT 'GENERAL_EDUCATION' NOT NULL,
	"status" "health_video_status" DEFAULT 'DRAFT' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"medical_review_status" "health_review_status" DEFAULT 'PENDING' NOT NULL,
	"compliance_status" "health_review_status" DEFAULT 'PENDING' NOT NULL,
	"medical_revision" integer,
	"compliance_revision" integer,
	"compliance_reference" varchar(300),
	"compliance_valid_until" timestamp with time zone,
	"author_attribution_approved" boolean DEFAULT false NOT NULL,
	"current_upload_id" uuid,
	"duration_seconds" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_videos_slug_unique" UNIQUE("slug"),
	CONSTRAINT "health_video_scope_values" CHECK ("health_videos"."visibility_scope" IN ('BRANCH','ALL_BRANCHES') AND "health_videos"."content_kind" IN ('GENERAL_EDUCATION','REGULATED_PROMOTION')),
	CONSTRAINT "health_video_revision_positive" CHECK ("health_videos"."revision" > 0),
	CONSTRAINT "health_video_slug" CHECK ("health_videos"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "health_video_assets" ADD CONSTRAINT "health_video_assets_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_assets" ADD CONSTRAINT "health_video_assets_upload_id_health_video_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."health_video_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_events" ADD CONSTRAINT "health_video_events_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_events" ADD CONSTRAINT "health_video_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_references" ADD CONSTRAINT "health_video_references_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_reviewer_assignments" ADD CONSTRAINT "health_video_reviewer_assignments_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_reviewer_assignments" ADD CONSTRAINT "health_video_reviewer_assignments_reviewer_id_staff_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_reviewer_assignments" ADD CONSTRAINT "health_video_reviewer_assignments_assigned_by_staff_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_reviews" ADD CONSTRAINT "health_video_reviews_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_reviews" ADD CONSTRAINT "health_video_reviews_reviewer_id_staff_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_uploads" ADD CONSTRAINT "health_video_uploads_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_video_versions" ADD CONSTRAINT "health_video_versions_video_id_health_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."health_videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_videos" ADD CONSTRAINT "health_videos_category_id_health_video_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."health_video_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_videos" ADD CONSTRAINT "health_videos_author_id_staff_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_videos" ADD CONSTRAINT "health_videos_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_videos" ADD CONSTRAINT "health_videos_current_upload_id_health_video_uploads_id_fk" FOREIGN KEY ("current_upload_id") REFERENCES "public"."health_video_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "health_asset_unique" ON "health_video_assets" USING btree ("upload_id","asset_type");--> statement-breakpoint
CREATE INDEX "health_asset_video" ON "health_video_assets" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "health_category_order" ON "health_video_categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "health_events_aggregate" ON "health_video_events" USING btree ("video_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX "health_references_video" ON "health_video_references" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "health_reviews_history" ON "health_video_reviews" USING btree ("video_id","revision");--> statement-breakpoint
CREATE INDEX "health_upload_pending" ON "health_video_uploads" USING btree ("state","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "health_version_unique" ON "health_video_versions" USING btree ("video_id","revision");--> statement-breakpoint
CREATE INDEX "health_video_public" ON "health_videos" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "health_video_scope" ON "health_videos" USING btree ("branch_id","author_id");--> statement-breakpoint
CREATE INDEX "health_video_category" ON "health_videos" USING btree ("category_id");