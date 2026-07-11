/**
 * Auth helpers for the MCP router. Kept in their own module (no `env` or
 * other heavy imports) so they can be unit tested without pulling in the
 * rest of the API's environment/config graph.
 */

export const getToken = (authorization: string | undefined) => {
  if (!authorization) return "";
  const [scheme, value] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() === "bearer") return value ?? "";
  return authorization;
};

/**
 * A configured key can be a bare token ("abc123") or a "NAME=value" pair
 * (e.g. "team-a=abc123"), so operators can label which client owns which
 * key. Only the part after the first "=" is used for matching.
 */
export const normalizeKey = (raw: string) => {
  const eq = raw.indexOf("=");
  return eq > 0 ? raw.slice(eq + 1) : raw;
};

export const parseConfiguredKeys = (configured: string | undefined) =>
  (configured ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
    .map(normalizeKey);

export const isAuthorizedToken = (
  configuredKeys: string | undefined,
  authorization: string | undefined,
) => {
  const configured = parseConfiguredKeys(configuredKeys);
  if (configured.length === 0) return false;
  return configured.includes(getToken(authorization));
};
