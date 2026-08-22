#!/usr/bin/env bash
# Shared helpers for deploy.sh and rollback.sh. Sourced, not executed.
# Expects APP_NAME, APP_ENV, BASE_DOMAIN already exported by the caller
# (from deploy/env/<env>.env) before sourcing this file.
set -euo pipefail

: "${APP_NAME:?APP_NAME must be set before sourcing _common.sh}"
: "${APP_ENV:?APP_ENV must be set before sourcing _common.sh}"
: "${BASE_DOMAIN:?BASE_DOMAIN must be set before sourcing _common.sh}"

# §4.4 domain convention — the same two variables derive all four domains.
SERVER_DOMAIN="${APP_NAME}-${APP_ENV}-server.${BASE_DOMAIN}"
WEB_DOMAIN="${APP_NAME}-${APP_ENV}.${BASE_DOMAIN}"

# state.json is the single source of truth for the active slot (§4.2) —
# never re-derive it by grepping the Caddyfile.
STATE_DIR="/srv/${APP_NAME}/${APP_ENV}"
STATE_FILE="${STATE_DIR}/state.json"
SLOTS_DIR="${STATE_DIR}/slots"
BACKUPS_DIR="${STATE_DIR}/backups"

# Prints the current state, or a bootstrap default if this is the first
# deploy ever (no state.json yet — nothing to protect, so "blue" is already
# free and there's no "previous" to roll back to).
state_read() {
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
  else
    echo '{"active":null,"sha":null,"server_image":null,"web_image":null,"breaking":false,"previous":null}'
  fi
}

opposite_slot() {
  local slot="$1"
  if [ "$slot" = "blue" ]; then
    echo "green"
  else
    echo "blue"
  fi
}

# Caddy site block for one role, importing whichever slot file is current.
write_slot_file() {
  local role="$1" slot="$2" # role: server | web
  local port
  if [ "$role" = "server" ]; then port=3000; else port=80; fi
  printf 'reverse_proxy %s-%s:%s\n' "$role" "$slot" "$port" > "${SLOTS_DIR}/${role}.caddy"
}

reload_caddy() {
  docker exec caddy-edge caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
}

# Shared by deploy.sh and rollback.sh so a future tweak (retry count,
# timeout, health path) can't drift between the two scripts.
wait_for_ready() {
  local slot="$1"
  for _ in $(seq 1 30); do
    if docker exec "${APP_NAME}-${APP_ENV}-server-${slot}" \
        wget -qO- http://localhost:3000/health/ready > /dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Prints the live sha on stdout; caller compares it to what it expected.
verify_public_sha() {
  curl -sf "https://${SERVER_DOMAIN}/health/version" | jq -r '.sha'
}
