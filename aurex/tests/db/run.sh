#!/bin/bash
# Rebuilds the scratch DB `t` from the stub of the live 001 schema, applies 002 + 004, runs the tests. Local only.
cd "$(dirname "$0")/../.."
P="psql -X -q -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1"
$P -d postgres -c "drop database if exists t" -c "create database t" || exit 1
$P -d t -f tests/db/stub_001.sql -f supabase/migrations/002_trading_logic.sql -f supabase/migrations/004_features.sql -f tests/db/test_flows.sql -f tests/db/test_features.sql 2>&1 | grep -v "^psql:.*NOTICE:  \(drop\|trigger\)" | grep -E "ASSERT|ERROR|PASSED|FAILED|ok  -" | tail -${1:-25}
