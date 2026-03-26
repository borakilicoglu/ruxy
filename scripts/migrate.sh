#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5432/ruxy}"

cd "$ROOT_DIR"

psql "$DATABASE_URL" -f infra/postgres/init.sql
