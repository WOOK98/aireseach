#!/usr/bin/env bats
# Test: handoff workflow gate logic (#145)
#
# Proves: commit status "success" + check-run failure/pending
#         → NO handoff (no label swap, no comment)
#
# Usage: bats scripts/test/handoff-gate-check.bats

setup() {
  # Extract the gate logic into a testable function
  evaluate_gate() {
    local combined_state="$1"
    local check_runs_json="$2"

    CHECK_RUNS_STATE="success"
    CHECK_RUNS_DETAIL=""
    TOTAL=$(echo "$check_runs_json" | jq '.check_runs | length')
    if [ "$TOTAL" -gt 0 ]; then
      NON_SUCCESS=$(echo "$check_runs_json" | jq '[.check_runs[] | select(.conclusion != "success" and .conclusion != "skipped" and .conclusion != null)] | length')
      PENDING=$(echo "$check_runs_json" | jq '[.check_runs[] | select(.conclusion == null and .status != "completed")] | length')
      if [ "$NON_SUCCESS" -gt 0 ] || [ "$PENDING" -gt 0 ]; then
        CHECK_RUNS_STATE="pending_or_failing"
        CHECK_RUNS_DETAIL=$(echo "$check_runs_json" | jq -r '[.check_runs[] | select((.conclusion != "success" and .conclusion != "skipped" and .conclusion != null) or (.conclusion == null and .status != "completed")) | .name] | join(", ")')
      fi
    fi

    # Gate: BOTH must be green
    if [ "$combined_state" != "success" ] || [ "$CHECK_RUNS_STATE" != "success" ]; then
      echo "BLOCKED"
    else
      echo "CLEAR"
    fi
  }
}

# Scenario 1: Everything green → handoff allowed
@test "all-green: combined=success, all check-runs=success → CLEAR" {
  combined="success"
  checks='{"check_runs": [
    {"name": "Loop Gate", "status": "completed", "conclusion": "success"},
    {"name": "lint", "status": "completed", "conclusion": "success"}
  ]}'
  result=$(evaluate_gate "$combined" "$checks")
  [ "$result" = "CLEAR" ]
}

# Scenario 2 (THE BUG): Vercel green + Loop Gate failing → must BLOCK
@test "bug-repro: combined=success, Loop Gate=failure → BLOCKED" {
  combined="success"
  checks='{"check_runs": [
    {"name": "Loop Gate", "status": "completed", "conclusion": "failure"},
    {"name": "lint", "status": "completed", "conclusion": "success"}
  ]}'
  result=$(evaluate_gate "$combined" "$checks")
  [ "$result" = "BLOCKED" ]
}

# Scenario 3: Vercel green + Loop Gate pending → must BLOCK
@test "bug-repro: combined=success, Loop Gate=pending → BLOCKED" {
  combined="success"
  checks='{"check_runs": [
    {"name": "Loop Gate", "status": "in_progress", "conclusion": null},
    {"name": "lint", "status": "completed", "conclusion": "success"}
  ]}'
  result=$(evaluate_gate "$combined" "$checks")
  [ "$result" = "BLOCKED" ]
}

# Scenario 4: Combined failure + check-runs green → BLOCKED
@test "combined-failure: combined=failure, checks=success → BLOCKED" {
  combined="failure"
  checks='{"check_runs": [
    {"name": "Loop Gate", "status": "completed", "conclusion": "success"},
    {"name": "lint", "status": "completed", "conclusion": "success"}
  ]}'
  result=$(evaluate_gate "$combined" "$checks")
  [ "$result" = "BLOCKED" ]
}

# Scenario 5: No check-runs at all → depends on combined status
@test "no-checks: combined=success, no check-runs → CLEAR" {
  combined="success"
  checks='{"check_runs": []}'
  result=$(evaluate_gate "$combined" "$checks")
  [ "$result" = "CLEAR" ]
}

@test "no-checks: combined=pending, no check-runs → BLOCKED" {
  combined="pending"
  checks='{"check_runs": []}'
  result=$(evaluate_gate "$combined" "$checks")
  [ "$result" = "BLOCKED" ]
}

# Scenario 6: Multiple failures
@test "multiple-failures: combined=success, two checks failing → BLOCKED" {
  combined="success"
  checks='{"check_runs": [
    {"name": "Loop Gate", "status": "completed", "conclusion": "failure"},
    {"name": "Vercel", "status": "completed", "conclusion": "failure"},
    {"name": "lint", "status": "completed", "conclusion": "success"}
  ]}'
  result=$(evaluate_gate "$combined" "$checks")
  [ "$result" = "BLOCKED" ]
}

# Scenario 7: Skipped checks are OK
@test "skipped-ok: combined=success, one check skipped → CLEAR" {
  combined="success"
  checks='{"check_runs": [
    {"name": "Loop Gate", "status": "completed", "conclusion": "success"},
    {"name": "optional-check", "status": "completed", "conclusion": "skipped"}
  ]}'
  result=$(evaluate_gate "$combined" "$checks")
  [ "$result" = "CLEAR" ]
}
