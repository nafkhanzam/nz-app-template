#!/usr/bin/env bash
# Rollback — flips the pointer back to the previous slot, which deploy.sh
# left `stop`ped (not `down`ed) specifically so this is fast (§4.2 pt.6).
#
# Usage: rollback.sh <env>
#
# Only one level deep: state.json keeps exactly one "previous" entry, so
# this can undo the last deploy, not chain further back. That matches how
# deploy.sh maintains state.json (each deploy overwrites "previous" with
# whatever was active going in) — rolling back twice in a row is refused,
# not silently wrong, because the second call finds `previous: null`.
set -euo pipefail

ENV="${1:?usage: rollback.sh <env>}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=/dev/null
set -a; source "deploy/env/${ENV}.env"; set +a
# shellcheck source=_common.sh
source "deploy/_common.sh"

STATE="$(state_read)"
ACTIVE_SLOT="$(echo "$STATE" | jq -r '.active')"
BREAKING="$(echo "$STATE" | jq -r '.breaking')"
PREVIOUS="$(echo "$STATE" | jq -c '.previous')"

if [ "$ACTIVE_SLOT" = "null" ]; then
  echo "No deploy on record — nothing to roll back." >&2
  exit 1
fi

# The whole point of this check: after a breaking migration, the previous
# slot's code no longer matches the schema (§4.7). A pointer flip would
# just crash the old code against the new schema instead of fixing anything.
if [ "$BREAKING" = "true" ]; then
  echo "Refusing to roll back: the current deploy included a breaking migration." >&2
  echo "The previous slot's code is not compatible with the current schema." >&2
  echo "Restore the pre-migration backup in ${BACKUPS_DIR}, then redeploy the previous image manually." >&2
  exit 1
fi

if [ "$PREVIOUS" = "null" ]; then
  echo "No previous slot on record — nothing to roll back to." >&2
  exit 1
fi

PREV_SLOT="$(echo "$PREVIOUS" | jq -r '.slot')"
PREV_SHA="$(echo "$PREVIOUS" | jq -r '.sha')"
# Full refs stored as-is by deploy.sh — no owner to reconstruct/guess here.
SERVER_IMAGE="$(echo "$PREVIOUS" | jq -r '.server_image')"
WEB_IMAGE="$(echo "$PREVIOUS" | jq -r '.web_image')"

echo "Rolling back: $ACTIVE_SLOT -> $PREV_SLOT (sha $PREV_SHA)"

# deploy.sh only ever `stop`s the losing slot, never `down`s it, so the
# containers still exist and this is a start, not a rebuild.
APP_NAME="$APP_NAME" APP_ENV="$APP_ENV" SLOT="$PREV_SLOT" \
  SERVER_IMAGE="$SERVER_IMAGE" WEB_IMAGE="$WEB_IMAGE" \
  docker compose -p "${APP_NAME}-${APP_ENV}-${PREV_SLOT}" -f deploy/docker-compose.app.yml start

echo "Waiting for $PREV_SLOT to become ready..."
if ! wait_for_ready "$PREV_SLOT"; then
  echo "Slot $PREV_SLOT did not become ready — aborting rollback, current slot ($ACTIVE_SLOT) left untouched." >&2
  exit 1
fi

write_slot_file server "$PREV_SLOT"
write_slot_file web "$PREV_SLOT"
reload_caddy

echo "Verifying https://${SERVER_DOMAIN}/health/version..."
LIVE_SHA="$(verify_public_sha)"
if [ "$LIVE_SHA" != "$PREV_SHA" ]; then
  echo "Public domain reports sha=$LIVE_SHA, expected $PREV_SHA. Investigate manually." >&2
  exit 1
fi
echo "Verified: public domain now serving $PREV_SHA."

docker compose -p "${APP_NAME}-${APP_ENV}-${ACTIVE_SLOT}" -f deploy/docker-compose.app.yml stop

jq -n \
  --arg active "$PREV_SLOT" \
  --arg sha "$PREV_SHA" \
  --arg server_image "$SERVER_IMAGE" \
  --arg web_image "$WEB_IMAGE" \
  '{active: $active, sha: $sha, server_image: $server_image, web_image: $web_image, breaking: false, previous: null}' \
  > "$STATE_FILE"

echo "Rollback complete. Active slot: $PREV_SLOT."
echo "Note: previous is now empty — rolling back again will refuse until the next deploy."
