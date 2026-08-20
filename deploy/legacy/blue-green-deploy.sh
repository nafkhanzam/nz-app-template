#!/usr/bin/env bash
# LEGACY — extracted verbatim from the old .github/workflows/deploy.yml
# inline step, unchanged in logic. Kept only as reference until Langkah 7
# replaces it with the real design (image immutable via GHCR digest, network
# alias instead of host ports, pointer-file slot switch, drain before stop —
# see summary.md §4.2). deploy.yml stays `if: false`; this script is not
# currently invoked by anything.
#
# Known problems with this version (§2.7), not fixed here on purpose:
#   - slot detection via `grep :BLUE_PORT` can match the wrong line
#   - `sed -i` on the Caddyfile is an unanchored global substitute
#   - builds the image ON the VPS (`--build`), no immutable artifact
#   - `caddy reload` assumes a `caddy` binary on the runner's PATH
#   - old slot is torn down immediately, no drain window, no rollback
#
# Expected env: CADDYFILE, DOMAIN, BLUE_PORT, GREEN_PORT (previously supplied
# by the ENV_FILE_DEPLOY GitHub secret; that mechanism is gone, replaced by
# SOPS — see deploy.yml).
set -euo pipefail

# proxy/ is gitignored (per-host config), seed it on first deploy
if [ ! -f "$CADDYFILE" ]; then
  mkdir -p "$(dirname "$CADDYFILE")"
  printf '%s {\n\treverse_proxy :%s\n}\n' "$DOMAIN" "$BLUE_PORT" > "$CADDYFILE"
fi

# figure out which slot is currently live from the proxy config
if grep -q ":${BLUE_PORT}" "$CADDYFILE"; then
  OLD_SLOT=blue; OLD_PORT=$BLUE_PORT
  NEW_SLOT=green; NEW_PORT=$GREEN_PORT
else
  OLD_SLOT=green; OLD_PORT=$GREEN_PORT
  NEW_SLOT=blue; NEW_PORT=$BLUE_PORT
fi
echo "Live slot: $OLD_SLOT ($OLD_PORT) -> deploying: $NEW_SLOT ($NEW_PORT)"

# run migrations once (shared DB, safe to run before either slot serves traffic)
docker compose -f docker-compose.server.yml run --rm server pnpm migrate:deploy

# bring up the new slot alongside the old one (own compose project so `down` can't touch the other slot)
SLOT=$NEW_SLOT SERVER_PORT=$NEW_PORT docker compose -p "nz-app-template-server-${NEW_SLOT}" -f docker-compose.server.yml up -d --force-recreate --build

# wait for the new slot to become healthy
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${NEW_PORT}/health" > /dev/null; then
    echo "New slot healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "New slot failed health check, rolling back"
    SLOT=$NEW_SLOT SERVER_PORT=$NEW_PORT docker compose -p "nz-app-template-server-${NEW_SLOT}" -f docker-compose.server.yml down
    exit 1
  fi
  sleep 2
done

# switch proxy traffic to the new slot
sed -i "s/:${OLD_PORT}/:${NEW_PORT}/" "$CADDYFILE"
caddy reload --config "$CADDYFILE"

# tear down the old slot
SLOT=$OLD_SLOT SERVER_PORT=$OLD_PORT docker compose -p "nz-app-template-server-${OLD_SLOT}" -f docker-compose.server.yml down
