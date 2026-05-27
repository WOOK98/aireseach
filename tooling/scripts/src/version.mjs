import { execSync } from "node:child_process";

import { checkPendingMigrations } from "./migrations.mjs";

function runGitCommand(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
}

function checkTurboStarterVersion() {
  const fetchResult = runGitCommand("git fetch upstream");

  if (fetchResult === null) {
    console.info(
      "\x1b[33m%s\x1b[0m",
      "⚠️ You have not setup 'upstream'. Please set up the upstream remote so you can update your TurboStarter version.",
    );

    return;
  }

  const behindCount = runGitCommand("git rev-list --count HEAD..upstream/main");

  if (behindCount === null) {
    console.warn(
      "Failed to get commit count. Ensure you're on a branch that tracks upstream/main.",
    );

    return;
  }

  const count = parseInt(behindCount, 10);
  const { severity } = getSeveriyLevel(count);

  if (severity === "critical") {
    console.log(
      "\x1b[31m%s\x1b[0m",
      "❌  Your TurboStarter version is outdated. Please update to the latest version.",
    );
  } else if (severity === "warning") {
    console.log(
      "\x1b[33m%s\x1b[0m",
      "⚠️  Your TurboStarter version is outdated! Best to update to the latest version.",
    );
  } else {
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✅ Your TurboStarter version is up to date!",
    );
  }

  if (count > 0) {
    logInstructions(count);
  }
}

function logInstructions(count) {
  console.log(
    "\x1b[33m%s\x1b[0m",
    `You are ${count} commit(s) behind the latest version.`,
  );

  console.log(
    "\x1b[33m%s\x1b[0m",
    "Please consider updating to the latest version for bug fixes and optimizations that your version does not have.",
  );

  console.log("\x1b[36m%s\x1b[0m", "To update, run: git pull upstream main");
}

function getSeveriyLevel(count) {
  if (count > 5) {
    return {
      severity: "critical",
    };
  }

  if (count > 0) {
    return {
      severity: "warning",
    };
  }

  return {
    severity: "success",
  };
}

checkTurboStarterVersion();
checkPendingMigrations();
