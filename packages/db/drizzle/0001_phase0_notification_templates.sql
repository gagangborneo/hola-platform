INSERT INTO "notification_templates" (
  "code",
  "channel",
  "subject_template",
  "body_template",
  "variables",
  "is_transactional",
  "is_active"
)
VALUES
  (
    'auth.email_verify',
    'email',
    'Verifikasi email akun Hola',
    'Verifikasi email Anda melalui {{url}}',
    '["url"]'::jsonb,
    true,
    true
  ),
  (
    'auth.password_reset',
    'email',
    'Atur ulang password Hola',
    'Atur ulang password Anda melalui {{url}}',
    '["url"]'::jsonb,
    true,
    true
  ),
  (
    'auth.password_changed',
    'email',
    'Password Hola berhasil diubah',
    'Password akun Hola Anda berhasil diubah. Jika ini bukan Anda, segera hubungi dukungan.',
    '[]'::jsonb,
    true,
    true
  ),
  (
    'auth.account_locked',
    'email',
    'Akun Hola sementara dikunci',
    'Ada percobaan login gagal berulang. Akun Anda dikunci sementara selama 15 menit.',
    '[]'::jsonb,
    true,
    true
  )
ON CONFLICT ("code") DO NOTHING;
