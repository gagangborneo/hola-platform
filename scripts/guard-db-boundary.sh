#!/usr/bin/env bash
# Menegakkan docs/01 § 2 di luar lint: frontend tidak boleh membuka jalur ke
# database, Redis, queue, hashing password, atau payment provider server-side.
set -euo pipefail

readonly -a FRONTEND_DIRS=(
  apps/web/src
  apps/admin/src
  apps/mobile/src
)
readonly FORBIDDEN_IMPORT_PATTERN="(from[[:space:]]+|import[[:space:]]*\\(?[[:space:]]*)['\"](@hola/db|drizzle-orm|postgres|pg|ioredis|bullmq|argon2|midtrans-client)(/[^'\"]*)?['\"]"

directories=()
for directory in "${FRONTEND_DIRS[@]}"; do
  if [[ -d "$directory" ]]; then
    directories+=("$directory")
  fi
done

if (( ${#directories[@]} == 0 )); then
  echo 'guard-db-boundary GAGAL: tidak ada frontend source directory untuk diperiksa.' >&2
  exit 1
fi

matches="$(grep -RInE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  "$FORBIDDEN_IMPORT_PATTERN" "${directories[@]}" || true)"

if [[ -n "$matches" ]]; then
  echo 'guard-db-boundary GAGAL: import server-only ditemukan di frontend:' >&2
  printf '%s\n' "$matches" >&2
  exit 1
fi

echo 'guard-db-boundary OK: frontend hanya mengakses data melalui apps/api.'
