INSERT INTO "notification_templates" (
  "code", "channel", "subject_template", "body_template", "variables", "is_transactional", "is_active"
)
VALUES (
  'booking.force_cancelled',
  'email',
  'Booking {{booking_code}} dibatalkan Hola',
  'Halo {{full_name}}, booking {{booking_code}} dibatalkan karena {{reason}}. Refund penuh akan diproses bila pembayaran sudah diterima.',
  '["full_name", "booking_code", "reason"]'::jsonb,
  true,
  true
)
ON CONFLICT ("code") DO NOTHING;
