import { execSync } from "child_process";

function validateVisibility() {
  let remoteUrl;

  try {
    remoteUrl = execSync("git config --get remote.origin.url")
      .toString()
      .trim();
  } catch {
    return Promise.resolve();
  }

  if (!remoteUrl.includes("github.com")) {
    return Promise.resolve();
  }

  let ownerRepo;

  if (remoteUrl.startsWith("https://github.com/")) {
    ownerRepo = remoteUrl.slice("https://github.com/".length);
  } else if (remoteUrl.startsWith("git@github.com:")) {
    ownerRepo = remoteUrl.slice("git@github.com:".length);
  } else {
    return;
  }

  ownerRepo = ownerRepo.replace(/\.git$/, "");

  return fetch(`https://api.github.com/repos/${ownerRepo}`)
    .then((res) => {
      if (res.status === 200) {
        return res.json();
      } else if (res.status === 404) {
        return Promise.resolve();
      } else {
        return Promise.reject(
          new Error(
            `GitHub API request failed with status code: ${res.status}`,
          ),
        );
      }
    })
    .then((data) => {
      if (data && !data.private) {
        console.error(
          "The repository has been LEAKED on GitHub. Please delete the repository. A Takedown Request will automatically be requested in the coming hours.",
        );

        process.exit(1);
      }

      return;
    });
}

async function isOnline() {
  const { lookup } = await import("dns");

  try {
    return await new Promise((resolve, reject) => {
      lookup("google.com", (err) => {
        if (err && err.code === "ENOTFOUND") {
          reject(false);
        } else {
          resolve(true);
        }
      });
    }).catch(() => false);
  } catch {
    return false;
  }
}

async function main() {
  const isUserOnline = await isOnline();

  if (!isUserOnline) {
    return process.exit(0);
  }

  await validateVisibility();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
