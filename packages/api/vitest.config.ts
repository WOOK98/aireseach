import baseConfig from "@workspace/vitest-config/base";

// Set env vars needed for integration tests that import route handlers.
// These must be set before any module imports (envin validation runs on import).
// turbo-ignore-next-line: test-only env bootstrap
const env = { ...process.env };
for (const key of [
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "LLM_API_KEY",
  "BETTER_AUTH_SECRET",
]) {
  if (!env[key]) env[key] = "***";
}
Object.assign(process.env, env);

export default baseConfig;
