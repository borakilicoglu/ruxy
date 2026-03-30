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
declare -a PID_NAMES=()

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
  PID_NAMES+=("$name")
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local attempts="${3:-30}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 1
  done

  echo "$name did not become ready at $url in time." >&2
  return 1
}

wait_for_process_start() {
  local name="$1"
  local pid="$2"
  local seconds="${3:-2}"

  sleep "$seconds"

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    wait "$pid"
    return $?
  fi

  echo "$name started (pid $pid)."
}

start_service() {
  local name="$1"
  local readiness_kind="$2"
  local readiness_target="${3:-}"
  local readiness_attempts="${4:-30}"
  local pid

  shift 4

  echo "Starting $name..."
  run_service "$name" "$@"
  pid="${PIDS[${#PIDS[@]}-1]}"

  case "$readiness_kind" in
    http)
      wait_for_http "$name" "$readiness_target" "$readiness_attempts"
      ;;
    process)
      wait_for_process_start "$name" "$pid" "${readiness_target:-2}"
      ;;
    *)
      echo "Unknown readiness kind for $name: $readiness_kind" >&2
      return 1
      ;;
  esac
}

wait_for_any() {
  if help wait 2>/dev/null | grep -q -- "-n"; then
    wait -n "${PIDS[@]}"
    return $?
  fi

  while true; do
    for pid in "${PIDS[@]}"; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        wait "$pid"
        return $?
      fi
    done

    sleep 1
  done
}

echo "Starting local development services..."
start_service "core-api" "http" "http://127.0.0.1:${CORE_API_PORT}/api/health/summary" "60" cargo run -p core-api
start_service "worker" "process" "2" "0" cargo run -p worker
start_service "proxy-server" "http" "http://127.0.0.1:${PROXY_SERVER_PORT}/health" "60" cargo run -p proxy-server
start_service "dashboard" "http" "http://127.0.0.1:3000/proxies" "60" pnpm --filter dashboard dev

echo
echo "Local dev stack is starting:"
echo "  Dashboard:    http://localhost:3000"
echo "  Core API:     http://localhost:${CORE_API_PORT}"
echo "  Proxy Server: http://localhost:${PROXY_SERVER_PORT}"
echo "  PostgreSQL:   localhost:5432"
echo
echo "Press Ctrl+C to stop local processes. The database container will keep running."

wait_for_any
