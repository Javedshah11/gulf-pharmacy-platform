ALTER TABLE "branches" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "description_en" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "description_ar" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "contact_name_en" varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "contact_name_ar" varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "postal_code" varchar(20) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "opening_hours" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "services" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "public_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "branches_publication_idx" ON "branches" USING btree ("is_active","is_published");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_content_arrays" CHECK (jsonb_typeof("branches"."opening_hours") = 'array' AND jsonb_typeof("branches"."services") = 'array');
--> statement-breakpoint
UPDATE "branches" SET "is_published" = true, "contact_name_en" = 'Dr. Fahad Badshah', "contact_name_ar" = 'د. فهد بادشاه', "postal_code" = '32241' WHERE "slug" = 'gulf-pharmacy-dammam';
