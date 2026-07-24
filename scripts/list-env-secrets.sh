#!/usr/bin/env bash
set -euo pipefail

# List GitHub Actions secret names (values are never retrievable via the
# GitHub API/CLI, by design). Shows repo-level secrets and, for every
# GitHub Environment defined on the repo, that environment's scoped secrets.
#
# Usage: ./scripts/list-env-secrets.sh

cd "$(dirname "$0")/.."

echo "== repo-level secrets =="
gh secret list

for env in $(gh api "repos/{owner}/{repo}/environments" --jq '.environments[].name'); do
  echo
  echo "== environment '$env' secrets =="
  gh secret list --env "$env"
done
