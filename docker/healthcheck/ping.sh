#!/bin/sh
set -eu

: "${API_HEALTH_URL:?API_HEALTH_URL wajib diisi}"
: "${HEALTHCHECKS_VPS_PING_URL:?HEALTHCHECKS_VPS_PING_URL wajib diisi}"

while true; do
  if curl --fail --silent --show-error --max-time 10 "$API_HEALTH_URL" >/dev/null; then
    curl --fail --silent --show-error --max-time 10 "$HEALTHCHECKS_VPS_PING_URL" >/dev/null || true
  else
    echo "API liveness gagal; ping external sengaja tidak dikirim." >&2
  fi
  sleep 300
done
