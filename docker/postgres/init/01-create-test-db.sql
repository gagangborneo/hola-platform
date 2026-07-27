-- Database terpisah untuk test integrasi (docs/16-CONVENTIONS.md BR-TT-05:
-- "Test integrasi memakai database terpisah (TEST_DATABASE_URL)").
-- Dijalankan sekali saat volume hola_pgdata pertama kali dibuat.
CREATE DATABASE hola_test OWNER hola;
