INSERT INTO "notification_templates" (
  "code",
  "channel",
  "subject_template",
  "body_template",
  "variables",
  "is_transactional",
  "is_active"
)
VALUES (
  'booking.confirmed',
  'email',
  'Booking {{booking_code}} terkonfirmasi',
  'Halo {{full_name}}, pembayaran {{payment_code}} telah diterima. Booking {{booking_code}} terkonfirmasi dengan total Rp{{total_amount}}.',
  '["full_name", "booking_code", "payment_code", "total_amount"]'::jsonb,
  true,
  true
)
ON CONFLICT ("code") DO NOTHING;
