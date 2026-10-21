#!/bin/bash
# (re)starts the test server using a pidfile (never pkill -f: it can match its own shell)
cd "$(dirname "$0")/../.."
[ -f /home/claude/.e2e.pid ] && kill "$(cat /home/claude/.e2e.pid)" 2>/dev/null; sleep 0.5
nohup node tests/e2e/server.js > /home/claude/.e2e.log 2>&1 &
echo $! > /home/claude/.e2e.pid; sleep 1.5; cat /home/claude/.e2e.log
