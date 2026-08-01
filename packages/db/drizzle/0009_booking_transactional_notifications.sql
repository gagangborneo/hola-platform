INSERT INTO "notification_templates" (
  "code", "channel", "subject_template", "body_template", "variables",
  "is_transactional", "is_active"
) VALUES
  (
    'booking.cancelled',
    'email',
    'Booking {{booking_code}} dibatalkan',
    'Halo {{full_name}}, booking {{booking_code}} dibatalkan karena {{reason}}. Refund: Rp{{refund_amount}} ({{policy_applied}}), estimasi {{refund_timeline}}.',
    '["full_name", "booking_code", "reason", "refund_amount", "policy_applied", "refund_timeline"]'::jsonb,
    true,
    true
  ),
  (
    'booking.reminder_2h',
    'email',
    'Pengingat booking {{booking_code}}',
    'Halo {{full_name}}, booking {{booking_code}} dimulai pada {{starts_at}}. Mohon datang tepat waktu.',
    '["full_name", "booking_code", "starts_at"]'::jsonb,
    true,
    true
  )
ON CONFLICT ("code") DO UPDATE SET
  "subject_template" = EXCLUDED."subject_template",
  "body_template" = EXCLUDED."body_template",
  "variables" = EXCLUDED."variables",
  "is_transactional" = EXCLUDED."is_transactional",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();

UPDATE "notification_templates"
SET
  "body_template" = 'Halo {{full_name}}, pembayaran {{payment_code}} telah diterima. E-receipt booking {{booking_code}}: total Rp{{total_amount}}, dibayar pada {{paid_at}}.',
  "variables" = '["full_name", "booking_code", "payment_code", "total_amount", "paid_at"]'::jsonb,
  "updated_at" = now()
WHERE "code" = 'booking.confirmed';
