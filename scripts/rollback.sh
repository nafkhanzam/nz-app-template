#!/usr/bin/env bash
set -euo pipefail

REF="${1:?usage: $0 <branch>}"
gh workflow run rollback.yml --ref "$REF"
