#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$HOME/.cargo/env" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.cargo/env"
fi

for command in docker cargo pnpm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5432/ruxy}"
export CORE_API_PORT="${CORE_API_PORT:-8001}"
export PROXY_SERVER_PORT="${PROXY_SERVER_PORT:-8000}"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8001}"
export RUST_LOG="${RUST_LOG:-info}"

echo "Starting PostgreSQL container..."
docker compose up -d db >/dev/null

echo "Waiting for database health..."
for _ in {1..30}; do
  if docker compose ps db | grep -q "healthy"; then
    break
  fi
  sleep 1
done

if ! docker compose ps db | grep -q "healthy"; then
  echo "Database did not become healthy in time." >&2
  exit 1
fi

declare -a PIDS=()

cleanup() {
  local exit_code=$?

  if ((${#PIDS[@]} > 0)); then
    echo
    echo "Stopping local services..."
    kill "${PIDS[@]}" >/dev/null 2>&1 || true
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

trap cleanup INT TERM EXIT

run_service() {
  local name="$1"
  shift

  (
    cd "$ROOT_DIR"
    "$@"
  ) \
    > >(sed -u "s/^/[$name] /") \
    2> >(sed -u "s/^/[$name] /" >&2) &

  PIDS+=("$!")
}

echo "Starting local development services..."
run_service "core-api" cargo run -p core-api
run_service "proxy-server" cargo run -p proxy-server
run_service "worker" cargo run -p worker
run_service "dashboard" pnpm --filter dashboard dev

echo
echo "Local dev stack is starting:"
echo "  Dashboard:    http://localhost:3000"
echo "  Core API:     http://localhost:${CORE_API_PORT}"
echo "  Proxy Server: http://localhost:${PROXY_SERVER_PORT}"
echo "  PostgreSQL:   localhost:5432"
echo
echo "Press Ctrl+C to stop local processes. The database container will keep running."

wait -n "${PIDS[@]}"
