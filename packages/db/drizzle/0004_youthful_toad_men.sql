CREATE TABLE "court_photos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"court_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_court_photos_position" CHECK ("court_photos"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "court_photos" ADD CONSTRAINT "court_photos_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "court_photos" ADD CONSTRAINT "court_photos_media_id_media_files_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_court_photos_court_position" ON "court_photos" USING btree ("court_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_court_photos_court_media" ON "court_photos" USING btree ("court_id","media_id");