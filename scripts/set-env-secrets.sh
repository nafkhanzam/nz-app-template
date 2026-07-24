#!/usr/bin/env bash
set -euo pipefail

# Push local apps/server/.env and apps/web/.env as GitHub Actions secrets
# ENV_FILE_SERVER / ENV_FILE_WEB (used by .github/workflows/deploy.yml).
#
# Usage: ./scripts/set-env-secrets.sh <github-environment-name>
# e.g.:  ./scripts/set-env-secrets.sh production

ENVIRONMENT="${1:?usage: $0 <environment>}"
ENV_FLAGS=(--env "$ENVIRONMENT")

cd "$(dirname "$0")/.."

if [[ -f apps/server/.env ]]; then
  gh secret set ENV_FILE_SERVER "${ENV_FLAGS[@]}" <apps/server/.env
  echo "ENV_FILE_SERVER set from apps/server/.env${ENVIRONMENT:+ (environment: $ENVIRONMENT)}"
else
  echo "skip: apps/server/.env not found" >&2
fi

if [[ -f apps/web/.env ]]; then
  gh secret set ENV_FILE_WEB "${ENV_FLAGS[@]}" <apps/web/.env
  echo "ENV_FILE_WEB set from apps/web/.env${ENVIRONMENT:+ (environment: $ENVIRONMENT)}"
else
  echo "skip: apps/web/.env not found" >&2
fi
