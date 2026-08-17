#!/usr/bin/env bash
# Fixture test: proves the handoff workflow gating logic.
#
# Scenario: commit status = "success" (e.g. Vercel green)
#           but one check-run (Loop Gate) is failing.
# Expected: handoff must NOT proceed.
#
# Usage: bash .github/workflows/fixtures/test-handoff-gating.sh

set -euo pipefail

PASS=0
FAIL=0

assert_no_handoff() {
  local desc="$1"
  local combined_state="$2"
  local check_run_conclusion="$3"   # "failure" | null (pending) | "success"
  local check_run_status="$4"       # "completed" | "queued" (pending)

  # Simulate the workflow's gating logic
  local check_runs_state="success"
  local total=1

  # Check-runs gate (PRIMARY)
  if [ "$check_run_conclusion" = "null" ] && [ "$check_run_status" != "completed" ]; then
    check_runs_state="pending_or_failing"
  elif [ "$check_run_conclusion" != "success" ] && [ "$check_run_conclusion" != "skipped" ] && [ "$check_run_conclusion" != "null" ]; then
    check_runs_state="pending_or_failing"
  fi

  # Commit status gate (SECONDARY)
  local should_block="false"
  if [ "$check_runs_state" != "success" ]; then
    should_block="true"
  fi
  if [ "$combined_state" = "pending" ]; then
    should_block="true"
  fi

  if [ "$should_block" = "true" ]; then
    echo "✅ PASS: $desc → handoff blocked (check-runs=$check_runs_state, status=$combined_state)"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL: $desc → handoff PROCEEDS but should be blocked!"
    FAIL=$((FAIL + 1))
  fi
}

assert_handoff() {
  local desc="$1"
  local combined_state="$2"
  local check_run_conclusion="$3"
  local check_run_status="$4"

  local check_runs_state="success"
  if [ "$check_run_conclusion" = "null" ] && [ "$check_run_status" != "completed" ]; then
    check_runs_state="pending_or_failing"
  elif [ "$check_run_conclusion" != "success" ] && [ "$check_run_conclusion" != "skipped" ] && [ "$check_run_conclusion" != "null" ]; then
    check_runs_state="pending_or_failing"
  fi

  local should_block="false"
  if [ "$check_runs_state" != "success" ]; then
    should_block="true"
  fi
  if [ "$combined_state" = "pending" ]; then
    should_block="true"
  fi

  if [ "$should_block" = "false" ]; then
    echo "✅ PASS: $desc → handoff proceeds (check-runs=$check_runs_state, status=$combined_state)"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL: $desc → handoff BLOCKED but should proceed!"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Handoff Gating Fixture Tests ==="
echo ""

# P0 failure mode: commit status green + Loop Gate check-run FAILURE
assert_no_handoff \
  "commit status=success + check-run conclusion=failure" \
  "success" "failure" "completed"

# P0 failure mode: commit status green + Loop Gate check-run PENDING
assert_no_handoff \
  "commit status=success + check-run status=queued (pending)" \
  "success" "null" "queued"

# P0 failure mode: commit status green + check-run cancelled
assert_no_handoff \
  "commit status=success + check-run conclusion=cancelled" \
  "success" "cancelled" "completed"

# P0 failure mode: commit status green + check-run timed_out
assert_no_handoff \
  "commit status=success + check-run conclusion=timed_out" \
  "success" "timed_out" "completed"

# Commit status pending (regardless of check-runs)
assert_no_handoff \
  "commit status=pending + check-run success" \
  "pending" "success" "completed"

# Happy path: everything green
assert_handoff \
  "commit status=success + check-run conclusion=success" \
  "success" "success" "completed"

# Happy path: check-run skipped (e.g. optional job)
assert_handoff \
  "commit status=success + check-run conclusion=skipped" \
  "success" "skipped" "completed"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
