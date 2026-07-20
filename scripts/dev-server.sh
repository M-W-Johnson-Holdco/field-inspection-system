#!/usr/bin/env bash
# Detached Vite dev server on :5173 — survives Cursor/agent shell cleanup.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.vite-dev.pid"
LOG_FILE="$ROOT/.vite-dev.log"
PORT=5173

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

port_in_use() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

case "${1:-start}" in
  start)
    if is_running; then
      echo "Vite already running (pid $(cat "$PID_FILE")) → http://localhost:$PORT/"
      exit 0
    fi
    if port_in_use; then
      echo "Port $PORT is already in use. Stop the other process or run: $0 stop"
      lsof -nP -iTCP:"$PORT" -sTCP:LISTEN || true
      exit 1
    fi
    cd "$ROOT"
    nohup npm run dev >>"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
    # Wait briefly for listen
    for _ in $(seq 1 30); do
      if port_in_use; then
        echo "Vite started (pid $(cat "$PID_FILE")) → http://localhost:$PORT/"
        echo "Logs: $LOG_FILE"
        exit 0
      fi
      sleep 0.2
    done
    echo "Vite may have failed to start. Check $LOG_FILE"
    exit 1
    ;;
  stop)
    if is_running; then
      kill "$(cat "$PID_FILE")" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "Vite stopped."
    else
      # Fallback: kill whatever is on 5173
      if port_in_use; then
        lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN | xargs kill 2>/dev/null || true
        echo "Stopped process(es) on port $PORT."
      else
        echo "Vite is not running."
      fi
    fi
    ;;
  status)
    if is_running && port_in_use; then
      echo "running (pid $(cat "$PID_FILE")) → http://localhost:$PORT/"
    elif port_in_use; then
      echo "port $PORT is listening, but no pid file (started outside this script)"
      lsof -nP -iTCP:"$PORT" -sTCP:LISTEN || true
    else
      echo "stopped"
      exit 1
    fi
    ;;
  restart)
    "$0" stop
    sleep 0.5
    "$0" start
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}"
    exit 1
    ;;
esac
