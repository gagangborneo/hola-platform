INSERT INTO "notification_templates" ("code", "channel", "subject_template", "body_template", "variables", "is_transactional", "is_active")
VALUES
  ('booking.recovered_after_expiry', 'email', 'Booking {{booking_code}} berhasil dipulihkan', 'Halo {{full_name}}, pembayaran {{payment_code}} diterima dan booking {{booking_code}} kembali aktif.', '["full_name", "booking_code", "payment_code"]'::jsonb, true, true),
  ('booking.force_cancelled', 'email', 'Booking {{booking_code}} dibatalkan Hola', 'Halo {{full_name}}, booking {{booking_code}} dibatalkan karena {{reason}}. Refund penuh akan diproses bila pembayaran sudah diterima.', '["full_name", "booking_code", "reason"]'::jsonb, true, true),
  ('payment.refund_auto_created', 'email', 'Refund {{refund_code}} otomatis dibuat', 'Mohon maaf, booking tidak dapat dipulihkan. Refund {{refund_code}} sebesar Rp{{amount}} sedang diproses.', '["refund_code", "amount"]'::jsonb, true, true),
  ('payment.refund_completed', 'email', 'Refund {{refund_code}} selesai', 'Refund {{refund_code}} sebesar Rp{{amount}} telah dibayarkan.', '["refund_code", "amount"]'::jsonb, true, true),
  ('payment.refund_required', 'inapp', 'Refund {{refund_code}} perlu dibayarkan', 'Refund {{refund_code}} sebesar Rp{{amount}} menunggu transfer manual.', '["refund_code", "amount"]'::jsonb, true, true)
ON CONFLICT ("code") DO NOTHING;
