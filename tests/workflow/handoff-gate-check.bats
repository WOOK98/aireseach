#!/usr/bin/env bats
# Fixture proof for #145: commit status green + check-run failure → no handoff
# Run: bats tests/workflow/handoff-gate-check.bats
#
# Tests the CI-check logic from openclaw-codex-handoff.yml
# Validates that check-runs are ALWAYS inspected (not just as fallback)

setup() {
  export -f check_ci_gate
}

check_ci_gate() {
  local combined_state="$1"
  local check_runs_json="$2"

  local check_runs_state="success"
  local total failed pending
  total=$(echo "$check_runs_json" | jq '.check_runs | length')
  if [ "$total" -gt 0 ]; then
    failed=$(echo "$check_runs_json" | jq '[.check_runs[] | select(.conclusion != "success" and .conclusion != "skipped" and .conclusion != null)] | length')
    pending=$(echo "$check_runs_json" | jq '[.check_runs[] | select(.conclusion == null and .status != "completed")] | length')
    if [ "$failed" -gt 0 ] || [ "$pending" -gt 0 ]; then
      check_runs_state="pending_or_failing"
    fi
  fi

  if [ "$combined_state" != "success" ] || [ "$check_runs_state" = "pending_or_failing" ]; then
    echo "BLOCKED"
    return 1
  fi

  echo "PASS"
  return 0
}

# --- Tests ---

@test "BLOCKS: commit status green + check-run failure" {
  run check_ci_gate "success" '{"check_runs":[{"name":"Loop Gate","status":"completed","conclusion":"failure"}]}'
  [ "$status" -eq 1 ]
  [ "$output" = "BLOCKED" ]
}

@test "BLOCKS: commit status green + check-run pending" {
  run check_ci_gate "success" '{"check_runs":[{"name":"Loop Gate","status":"in_progress","conclusion":null}]}'
  [ "$status" -eq 1 ]
  [ "$output" = "BLOCKED" ]
}

@test "BLOCKS: commit status green + check-run cancelled" {
  run check_ci_gate "success" '{"check_runs":[{"name":"Loop Gate","status":"completed","conclusion":"cancelled"}]}'
  [ "$status" -eq 1 ]
  [ "$output" = "BLOCKED" ]
}

@test "BLOCKS: commit status green + check-run timed_out" {
  run check_ci_gate "success" '{"check_runs":[{"name":"Loop Gate","status":"completed","conclusion":"timed_out"}]}'
  [ "$status" -eq 1 ]
  [ "$output" = "BLOCKED" ]
}

@test "PASSES: commit status green + all check-runs success" {
  run check_ci_gate "success" '{"check_runs":[{"name":"Loop Gate","status":"completed","conclusion":"success"}]}'
  [ "$status" -eq 0 ]
  [ "$output" = "PASS" ]
}

@test "PASSES: commit status green + check-runs skipped" {
  run check_ci_gate "success" '{"check_runs":[{"name":"Loop Gate","status":"completed","conclusion":"skipped"}]}'
  [ "$status" -eq 0 ]
  [ "$output" = "PASS" ]
}

@test "PASSES: commit status green + no check-runs" {
  run check_ci_gate "success" '{"check_runs":[]}'
  [ "$status" -eq 0 ]
  [ "$output" = "PASS" ]
}

@test "BLOCKS: commit status pending even if check-runs green" {
  run check_ci_gate "pending" '{"check_runs":[{"name":"Loop Gate","status":"completed","conclusion":"success"}]}'
  [ "$status" -eq 1 ]
  [ "$output" = "BLOCKED" ]
}

@test "BLOCKS: commit status green + mixed check-runs (one failing)" {
  run check_ci_gate "success" '{"check_runs":[{"name":"Loop Gate","status":"completed","conclusion":"success"},{"name":"Redline grep","status":"completed","conclusion":"failure"}]}'
  [ "$status" -eq 1 ]
  [ "$output" = "BLOCKED" ]
}

@test "PASSES: commit status green + multiple check-runs all success/skipped" {
  run check_ci_gate "success" '{"check_runs":[{"name":"Loop Gate","status":"completed","conclusion":"success"},{"name":"Redline grep","status":"completed","conclusion":"skipped"}]}'
  [ "$status" -eq 0 ]
  [ "$output" = "PASS" ]
}
