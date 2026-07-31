CREATE TABLE "booking_addons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"addon_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_amount" bigint NOT NULL,
	"line_total_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"court_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"rate_class" "rate_class" NOT NULL,
	"price_rule_id" uuid,
	"unit_price_amount" bigint NOT NULL,
	"line_total_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_code" text NOT NULL,
	"customer_user_id" uuid,
	"guest_name" text,
	"guest_phone" text,
	"channel" "booking_channel" NOT NULL,
	"status" "booking_status" NOT NULL,
	"booking_date" date NOT NULL,
	"slot_count" integer NOT NULL,
	"quote_snapshot" jsonb NOT NULL,
	"subtotal_amount" bigint NOT NULL,
	"addon_amount" bigint DEFAULT 0 NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"tax_amount" bigint DEFAULT 0 NOT NULL,
	"fee_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"promo_id" uuid,
	"promo_code" text,
	"hold_expires_at" timestamp with time zone,
	"checked_in_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_user_id" uuid,
	"cancellation_reason" text,
	"customer_note" text,
	"internal_note" text,
	"created_by_user_id" uuid,
	"reschedule_count" integer DEFAULT 0 NOT NULL,
	"reschedule_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_bookings_customer_or_guest" CHECK ("bookings"."customer_user_id" IS NOT NULL OR ("bookings"."guest_name" IS NOT NULL AND "bookings"."guest_phone" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "court_maintenances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"court_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"created_by_user_id" uuid,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_type" "finance_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider_order_id" text,
	"payment_id" uuid,
	"is_signature_valid" boolean NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"process_error" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_code" text NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"booking_id" uuid,
	"event_registration_id" uuid,
	"tournament_registration_id" uuid,
	"cafe_invoice_id" uuid,
	"payer_user_id" uuid,
	"amount" bigint NOT NULL,
	"method" "payment_method",
	"status" "payment_status" NOT NULL,
	"refund_status" "payment_refund_status" DEFAULT 'none' NOT NULL,
	"refunded_amount" bigint DEFAULT 0 NOT NULL,
	"provider_order_id" text,
	"provider_transaction_id" text,
	"snap_token" text,
	"snap_redirect_url" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"gateway_fee_amount" bigint DEFAULT 0 NOT NULL,
	"settled_amount" bigint DEFAULT 0 NOT NULL,
	"provider_meta" jsonb,
	"recorded_by_user_id" uuid,
	"idempotency_key" text,
	"needs_manual_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_payments_single_payable" CHECK ((("payments"."booking_id" IS NOT NULL)::integer + ("payments"."event_registration_id" IS NOT NULL)::integer + ("payments"."tournament_registration_id" IS NOT NULL)::integer + ("payments"."cafe_invoice_id" IS NOT NULL)::integer) = 1)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"refund_code" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"status" "refund_status" NOT NULL,
	"channel" "refund_channel" NOT NULL,
	"reason" text NOT NULL,
	"policy_applied" text NOT NULL,
	"requested_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"provider_refund_id" text,
	"provider_meta" jsonb,
	"completed_at" timestamp with time zone,
	"failure_reason" text,
	"destination_bank_name" text,
	"destination_account_number" text,
	"destination_account_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_refunds_amount_positive" CHECK ("refunds"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "promo_courts" (
	"promo_id" uuid NOT NULL,
	"court_id" uuid NOT NULL,
	CONSTRAINT "promo_courts_pkey" PRIMARY KEY("promo_id","court_id")
);
--> statement-breakpoint
CREATE TABLE "promo_redemptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"promo_id" uuid NOT NULL,
	"user_id" uuid,
	"booking_id" uuid,
	"event_registration_id" uuid,
	"tournament_registration_id" uuid,
	"discount_amount" bigint NOT NULL,
	"status" "promo_redemption_status" NOT NULL,
	"reserved_until" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_promo_redemptions_single_target" CHECK ((("promo_redemptions"."booking_id" IS NOT NULL)::integer + ("promo_redemptions"."event_registration_id" IS NOT NULL)::integer + ("promo_redemptions"."tournament_registration_id" IS NOT NULL)::integer) = 1)
);
--> statement-breakpoint
CREATE TABLE "promo_sports" (
	"promo_id" uuid NOT NULL,
	"sport_id" uuid NOT NULL,
	CONSTRAINT "promo_sports_pkey" PRIMARY KEY("promo_id","sport_id")
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"description" text,
	"type" "promo_type" NOT NULL,
	"value_percent" numeric(5, 2),
	"value_amount" bigint,
	"free_slot_count" integer,
	"max_discount_amount" bigint,
	"min_transaction_amount" bigint DEFAULT 0 NOT NULL,
	"min_slot_count" integer,
	"applies_to" "promo_applies_to" NOT NULL,
	"quota_total" integer,
	"quota_used" integer DEFAULT 0 NOT NULL,
	"quota_per_user" integer,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"valid_days_of_week" smallint[],
	"valid_starts_time" time,
	"valid_ends_time" time,
	"valid_rate_classes" "rate_class"[],
	"is_auto" boolean DEFAULT false NOT NULL,
	"is_stackable" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_new_customer_only" boolean DEFAULT false NOT NULL,
	"min_tier_code" text,
	"status" "promo_status" NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_promos_value" CHECK ((
        "promos"."type" = 'percent' AND "promos"."value_percent" IS NOT NULL AND "promos"."value_amount" IS NULL AND "promos"."free_slot_count" IS NULL
      ) OR (
        "promos"."type" = 'fixed' AND "promos"."value_percent" IS NULL AND "promos"."value_amount" IS NOT NULL AND "promos"."free_slot_count" IS NULL
      ) OR (
        "promos"."type" = 'free_slot' AND "promos"."value_percent" IS NULL AND "promos"."value_amount" IS NULL AND "promos"."free_slot_count" IS NOT NULL
      )),
	CONSTRAINT "ck_promos_code_or_auto" CHECK (("promos"."code" IS NOT NULL AND "promos"."is_auto" = false) OR ("promos"."code" IS NULL AND "promos"."is_auto" = true)),
	CONSTRAINT "ck_promos_validity" CHECK ("promos"."valid_from" < "promos"."valid_until")
);
--> statement-breakpoint
CREATE TABLE "slot_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"court_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"slot_date" date NOT NULL,
	"claim_type" "claim_type" NOT NULL,
	"status" "claim_status" NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"booking_item_id" uuid,
	"court_maintenance_id" uuid,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_slot_claims_single_owner" CHECK ((("slot_claims"."booking_item_id" IS NOT NULL)::integer + ("slot_claims"."court_maintenance_id" IS NOT NULL)::integer) = 1),
	CONSTRAINT "ck_slot_claims_owner_matches_type" CHECK (("slot_claims"."claim_type" = 'booking' AND "slot_claims"."booking_item_id" IS NOT NULL) OR ("slot_claims"."claim_type" = 'maintenance' AND "slot_claims"."court_maintenance_id" IS NOT NULL)),
	CONSTRAINT "ck_slot_claims_hold_expiry" CHECK (("slot_claims"."status" = 'held' AND "slot_claims"."hold_expires_at" IS NOT NULL) OR ("slot_claims"."status" <> 'held' AND "slot_claims"."hold_expires_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_price_rule_id_price_rules_id_fk" FOREIGN KEY ("price_rule_id") REFERENCES "public"."price_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_promo_id_promos_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "court_maintenances" ADD CONSTRAINT "court_maintenances_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "court_maintenances" ADD CONSTRAINT "court_maintenances_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_user_id_users_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_courts" ADD CONSTRAINT "promo_courts_promo_id_promos_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_courts" ADD CONSTRAINT "promo_courts_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promo_id_promos_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_sports" ADD CONSTRAINT "promo_sports_promo_id_promos_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_sports" ADD CONSTRAINT "promo_sports_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_booking_item_id_booking_items_id_fk" FOREIGN KEY ("booking_item_id") REFERENCES "public"."booking_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_court_maintenance_id_court_maintenances_id_fk" FOREIGN KEY ("court_maintenance_id") REFERENCES "public"."court_maintenances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_addons_booking_addon" ON "booking_addons" USING btree ("booking_id","addon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_items_booking_court_starts" ON "booking_items" USING btree ("booking_id","court_id","starts_at");--> statement-breakpoint
CREATE INDEX "idx_booking_items_court_starts" ON "booking_items" USING btree ("court_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bookings_booking_code" ON "bookings" USING btree ("booking_code");--> statement-breakpoint
CREATE INDEX "idx_bookings_customer_created" ON "bookings" USING btree ("customer_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_status_hold" ON "bookings" USING btree ("status","hold_expires_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_date" ON "bookings" USING btree ("booking_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_finance_events_source_kind" ON "finance_events" USING btree ("source_type","source_id","kind");--> statement-breakpoint
CREATE INDEX "idx_finance_events_status_created" ON "finance_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payment_webhook_events_provider_event" ON "payment_webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "idx_payment_webhook_events_payment" ON "payment_webhook_events" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payments_payment_code" ON "payments" USING btree ("payment_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payments_provider_order_id" ON "payments" USING btree ("provider_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payments_idempotency_key" ON "payments" USING btree ("idempotency_key") WHERE "payments"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_payments_status_expires" ON "payments" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_payments_booking" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_payments_cafe_invoice" ON "payments" USING btree ("cafe_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_payments_paid_at" ON "payments" USING btree ("paid_at") WHERE "payments"."status" = 'paid';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_refunds_refund_code" ON "refunds" USING btree ("refund_code");--> statement-breakpoint
CREATE INDEX "idx_refunds_payment" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_promo_redemptions_booking" ON "promo_redemptions" USING btree ("promo_id","booking_id") WHERE "promo_redemptions"."booking_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_promo_redemptions_promo_user" ON "promo_redemptions" USING btree ("promo_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_promos_code" ON "promos" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_promos_status_validity" ON "promos" USING btree ("status","valid_from","valid_until");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_slot_claims_booking_item" ON "slot_claims" USING btree ("booking_item_id") WHERE "slot_claims"."booking_item_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_slot_claims_active" ON "slot_claims" USING btree ("court_id","starts_at") WHERE "slot_claims"."status" IN ('held', 'confirmed');--> statement-breakpoint
CREATE INDEX "idx_slot_claims_court_date" ON "slot_claims" USING btree ("court_id","slot_date") WHERE "slot_claims"."status" IN ('held', 'confirmed');--> statement-breakpoint
CREATE INDEX "idx_slot_claims_expiring_holds" ON "slot_claims" USING btree ("hold_expires_at") WHERE "slot_claims"."status" = 'held';