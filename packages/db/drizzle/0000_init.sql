CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'contra_revenue', 'expense');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('match', 'practice', 'training', 'other');--> statement-breakpoint
CREATE TYPE "public"."activity_verification_source" AS ENUM('booking', 'checkin', 'manual', 'none');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'late', 'absent', 'leave', 'holiday', 'day_off');--> statement-breakpoint
CREATE TYPE "public"."booking_channel" AS ENUM('web', 'mobile', 'admin', 'walk_in');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending_payment', 'confirmed', 'completed', 'cancelled', 'expired', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."cafe_contract_status" AS ENUM('draft', 'active', 'expiring', 'ended', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."cafe_invoice_status" AS ENUM('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void');--> statement-breakpoint
CREATE TYPE "public"."cafe_tenant_status" AS ENUM('prospect', 'active', 'suspended', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."cafe_unit_status" AS ENUM('available', 'occupied', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('held', 'confirmed', 'released');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('booking', 'event', 'match', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."court_status" AS ENUM('active', 'maintenance', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."day_type" AS ENUM('weekday', 'weekend', 'holiday', 'specific_date');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive', 'resigned', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('fulltime', 'parttime', 'contract', 'intern');--> statement-breakpoint
CREATE TYPE "public"."event_registration_status" AS ENUM('pending_payment', 'confirmed', 'waitlisted', 'cancelled', 'attended', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('open_play', 'coaching_clinic', 'community_gathering', 'other');--> statement-breakpoint
CREATE TYPE "public"."finance_source_type" AS ENUM('booking', 'cafe_invoice', 'cafe_contract', 'event_registration', 'tournament_registration', 'payment', 'refund', 'expense', 'manual');--> statement-breakpoint
CREATE TYPE "public"."journal_entry_status" AS ENUM('draft', 'posted', 'voided');--> statement-breakpoint
CREATE TYPE "public"."leaderboard_period_status" AS ENUM('upcoming', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."leaderboard_period_type" AS ENUM('monthly', 'seasonal', 'alltime');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('annual', 'sick', 'unpaid', 'other');--> statement-breakpoint
CREATE TYPE "public"."match_stage" AS ENUM('group', 'knockout');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('pending_schedule', 'scheduled', 'ongoing', 'completed', 'walkover', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('court_photo', 'event_poster', 'tutorial_thumbnail', 'avatar', 'contract_document', 'payment_proof', 'expense_receipt');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'ready', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'push', 'whatsapp', 'inapp');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('qris', 'gopay', 'shopeepay', 'bank_transfer_va', 'credit_card', 'cash', 'manual_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('midtrans', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_refund_status" AS ENUM('none', 'pending', 'partial', 'full');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'expired', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."point_source_type" AS ENUM('booking', 'match', 'tournament', 'event', 'activity', 'manual', 'referral', 'profile');--> statement-breakpoint
CREATE TYPE "public"."promo_applies_to" AS ENUM('booking', 'event', 'tournament', 'all');--> statement-breakpoint
CREATE TYPE "public"."promo_redemption_status" AS ENUM('reserved', 'applied', 'released');--> statement-breakpoint
CREATE TYPE "public"."promo_status" AS ENUM('draft', 'active', 'paused', 'expired', 'archived');--> statement-breakpoint
CREATE TYPE "public"."promo_type" AS ENUM('percent', 'fixed', 'free_slot');--> statement-breakpoint
CREATE TYPE "public"."rate_class" AS ENUM('peak', 'offpeak', 'special');--> statement-breakpoint
CREATE TYPE "public"."refund_channel" AS ENUM('gateway', 'manual_transfer', 'cash');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('requested', 'approved', 'processing', 'completed', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tournament_format" AS ENUM('knockout', 'round_robin');--> statement-breakpoint
CREATE TYPE "public"."tournament_participant_type" AS ENUM('single', 'double', 'team');--> statement-breakpoint
CREATE TYPE "public"."tournament_registration_status" AS ENUM('pending_payment', 'confirmed', 'withdrawn', 'disqualified');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'registration_open', 'registration_closed', 'seeding', 'ongoing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tutorial_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."tutorial_video_provider" AS ENUM('youtube', 'r2', 'stream');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin', 'staff', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE SEQUENCE "public"."seq_booking_code" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."seq_employee_number" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."seq_invoice_number" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."seq_journal_entry" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."seq_payment_code" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."seq_refund_code" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"birth_date" text,
	"gender" text,
	"skill_level" text,
	"preferred_sport_id" uuid,
	"tier_code" text DEFAULT 'bronze' NOT NULL,
	"lifetime_points" bigint DEFAULT 0 NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by_user_id" uuid,
	"notification_prefs" jsonb DEFAULT '{"push":true,"email":true,"whatsapp":false}'::jsonb NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_profiles_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"parent_id" uuid,
	"device_label" text,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text,
	"phone" text,
	"password_hash" text,
	"full_name" text NOT NULL,
	"avatar_media_id" uuid,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"email_verified_at" timestamp with time zone,
	"phone_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_users_identifier" CHECK ("users"."email" IS NOT NULL OR "users"."phone" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "media_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"content_type" text,
	"size_bytes" bigint,
	"checksum" text,
	"uploaded_by_user_id" uuid,
	"related_type" text,
	"related_id" text,
	"confirmed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"code" text PRIMARY KEY NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"subject_template" text,
	"body_template" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_transactional" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"to_email" text,
	"to_phone" text,
	"to_push_token_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"template_code" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"error" text,
	"read_at" timestamp with time zone,
	"related_type" text,
	"related_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expo_push_token" text NOT NULL,
	"device_id" text,
	"platform" text,
	"app_version" text,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"scope" text NOT NULL,
	"user_id" uuid,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"price_amount" bigint NOT NULL,
	"unit" text DEFAULT 'per_item' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "court_operating_hours" (
	"id" uuid PRIMARY KEY NOT NULL,
	"court_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens_time" time NOT NULL,
	"closes_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_court_operating_hours_dow" CHECK ("court_operating_hours"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "ck_court_operating_hours_range" CHECK ("court_operating_hours"."opens_time" < "court_operating_hours"."closes_time")
);
--> statement-breakpoint
CREATE TABLE "courts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"venue_id" uuid NOT NULL,
	"sport_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"surface" text,
	"is_indoor" boolean DEFAULT false NOT NULL,
	"slot_duration_minutes" integer DEFAULT 60 NOT NULL,
	"min_slots_per_booking" integer DEFAULT 1 NOT NULL,
	"max_slots_per_booking" integer DEFAULT 4 NOT NULL,
	"max_players" integer,
	"status" "court_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courts_code_unique" UNIQUE("code"),
	CONSTRAINT "ck_courts_slot_duration" CHECK ("courts"."slot_duration_minutes" IN (30, 60, 90, 120))
);
--> statement-breakpoint
CREATE TABLE "price_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"court_id" uuid,
	"sport_id" uuid,
	"day_type" "day_type" NOT NULL,
	"specific_date" date,
	"starts_time" time NOT NULL,
	"ends_time" time NOT NULL,
	"rate_class" "rate_class" NOT NULL,
	"price_per_hour_amount" bigint NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"active_from" date,
	"active_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_price_rules_scope" CHECK ("price_rules"."court_id" IS NOT NULL OR "price_rules"."sport_id" IS NOT NULL),
	CONSTRAINT "ck_price_rules_specific_date" CHECK ("price_rules"."day_type" <> 'specific_date' OR "price_rules"."specific_date" IS NOT NULL),
	CONSTRAINT "ck_price_rules_time_range" CHECK ("price_rules"."starts_time" < "price_rules"."ends_time")
);
--> statement-breakpoint
CREATE TABLE "special_dates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"day_type_override" "day_type",
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "special_dates_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"icon_media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sports_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"timezone" text DEFAULT 'Asia/Makassar' NOT NULL,
	"default_opens_time" time,
	"default_closes_time" time,
	"phone" text,
	"map_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_to_push_token_id_push_tokens_id_fk" FOREIGN KEY ("to_push_token_id") REFERENCES "public"."push_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_code_notification_templates_code_fk" FOREIGN KEY ("template_code") REFERENCES "public"."notification_templates"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "court_operating_hours" ADD CONSTRAINT "court_operating_hours_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_refresh_tokens_token_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_revoked" ON "refresh_tokens" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_family" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expires" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_phone" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_media_files_object_key" ON "media_files" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "idx_media_files_status_created" ON "media_files" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_media_files_related" ON "media_files" USING btree ("related_type","related_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_notifications_dedupe_user" ON "notifications" USING btree ("user_id","template_code","dedupe_key") WHERE "notifications"."user_id" IS NOT NULL AND "notifications"."dedupe_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_notifications_dedupe_email" ON "notifications" USING btree ("to_email","template_code","dedupe_key") WHERE "notifications"."user_id" IS NULL AND "notifications"."to_email" IS NOT NULL AND "notifications"."dedupe_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_notifications_status_created" ON "notifications" USING btree ("status","created_at") WHERE "notifications"."status" = 'queued';--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_push_tokens_expo_token" ON "push_tokens" USING btree ("expo_push_token");--> statement-breakpoint
CREATE INDEX "idx_push_tokens_user" ON "push_tokens" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id","created_at" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_idempotency_records_key" ON "idempotency_records" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_idempotency_records_expires" ON "idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_otp_challenges_phone_created" ON "otp_challenges" USING btree ("phone","created_at" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_password_reset_tokens_hash" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_expires" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_court_operating_hours_court_day" ON "court_operating_hours" USING btree ("court_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_courts_sport" ON "courts" USING btree ("sport_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_price_rules_lookup" ON "price_rules" USING btree ("court_id","sport_id","day_type","is_active");