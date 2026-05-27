import { execSync } from "child_process";

// check requirements to run TurboStarter
checkRequirements();

function checkRequirements() {
  validateNodeInstalled();
  validatePnpmInstalled();
  validatePathNotOneDrive();
}

/**
 * Validates that pnpm is installed.
 * If pnpm is not installed, it exits the script with an error message.
 */
function validatePnpmInstalled() {
  const currentPnpmVersion = execSync("pnpm --version").toString().trim();

  if (!currentPnpmVersion) {
    console.error(
      `\x1b[31m%s\x1b[0m`,
      `You are running TurboStarter from a directory that does not have pnpm installed. Please install pnpm and run "pnpm install" in your project directory.`,
    );

    process.exit(1);
  }
}

/**
 * Validates that Node is installed.
 * If Node is not installed, it exits the script with an error message.
 */
function validateNodeInstalled() {
  const currentNodeVersion = process.versions.node;

  if (!currentNodeVersion) {
    console.error(
      `\x1b[31m%s\x1b[0m`,
      `You are running TurboStarter from a device that does not have Node installed. Please install Node (https://nodejs.org/en/download/) and try again.`,
    );

    process.exit(1);
  }
}

/**
 * Checks if the current working directory is not OneDrive.
 * If the current working directory is OneDrive, it exits the script with an error message.
 */
function validatePathNotOneDrive() {
  const path = process.cwd();

  if (path.includes("OneDrive")) {
    console.error(
      `\x1b[31m%s\x1b[0m`,
      `You are running TurboStarter from OneDrive. Please move your project to a local folder.`,
    );

    process.exit(1);
  }
}
