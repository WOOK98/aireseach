import { execSync } from "node:child_process";

export function checkPendingMigrations() {
  try {
    console.info("\x1b[34m%s\x1b[0m", "Checking for pending migrations...");

    const output = execSync("pnpm --filter @workspace/db db:status", {
      encoding: "utf-8",
      stdio: "pipe",
    });

    const lines = output.split("\n");
    const pendingStart = lines.findIndex(
      (line) => line.trim() === "Pending migrations:",
    );

    let pendingMigrations = [];
    if (pendingStart !== -1) {
      for (let i = pendingStart + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;
        if (line === "(none)") break;
        if (line.startsWith("- ")) {
          pendingMigrations.push(line.slice(2).trim());
        } else {
          break;
        }
      }
    } else {
      console.log(
        "\x1b[33m%s\x1b[0m",
        "⚠️  Could not determine pending migrations. Please check manually.",
      );
      return;
    }

    if (pendingMigrations.length > 0) {
      console.log(
        "\x1b[33m%s\x1b[0m",
        "⚠️  There are pending migrations that need to be applied:",
      );
      pendingMigrations.forEach((migration) => console.log(`  - ${migration}`));
      console.log(
        "\nSome functionality may not work as expected until these migrations are applied.",
      );
      console.log(
        '\nAfter testing the migrations in your local environment and ideally in a staging environment, please run "pnpm --filter @workspace/db db:migrate" to apply them to your database. If you have any questions, please open a support ticket.',
      );
    } else {
      console.log("\x1b[32m%s\x1b[0m", "✅ All migrations are up to date.");
    }
  } catch {
    console.log(
      "\x1b[33m%s\x1b[0m",
      "❌ Could not connect to the database. Please ensure your connection string is up to date and your database instance is running.\n",
    );
  }
}
