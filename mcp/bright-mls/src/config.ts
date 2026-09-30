/**
 * Configuration for the Bright MLS RESO Web API.
 *
 * Endpoints are the ones Bright publishes on developer.brightmls.com. Both are
 * overridable so the server keeps working if Bright moves a host or issues you a
 * tenant-specific one during onboarding.
 */

export type BrightEnvName = "test" | "production";

export type TokenAuthMethod = "basic" | "post";

const ENDPOINTS: Record<BrightEnvName, { serviceRoot: string; tokenUrl: string }> = {
  test: {
    serviceRoot: "https://bright-reso.tst.brightmls.com/RESO/OData/bright",
    tokenUrl: "https://okta.tst.brightmls.com/oauth2/default/v1/token",
  },
  production: {
    serviceRoot: "https://bright-reso.brightmls.com/RESO/OData/bright",
    tokenUrl: "https://okta.brightmls.com/oauth2/default/v1/token",
  },
};

export interface BrightConfig {
  env: BrightEnvName;
  serviceRoot: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  /** Space-delimited OAuth scopes. Bright assigns these at onboarding; omitted when unset. */
  scope?: string;
  tokenAuthMethod: TokenAuthMethod;
  /** Default $top per request. */
  pageSize: number;
  /** Hard ceiling on pages followed via @odata.nextLink for one tool call. */
  maxPages: number;
  timeoutMs: number;
  /** Log request URLs (never credentials) to stderr. */
  debug: boolean;
}

export class ConfigError extends Error {}

function int(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new ConfigError(`${name} must be an integer, got ${JSON.stringify(raw)}`);
  if (n < min || n > max) throw new ConfigError(`${name} must be between ${min} and ${max}, got ${n}`);
  return n;
}

function stripTrailingSlash(u: string): string {
  return u.replace(/\/+$/, "");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BrightConfig {
  const envName = (env.BRIGHT_MLS_ENV ?? "test").toLowerCase();
  if (envName !== "test" && envName !== "production") {
    throw new ConfigError(`BRIGHT_MLS_ENV must be "test" or "production", got ${JSON.stringify(env.BRIGHT_MLS_ENV)}`);
  }

  const clientId = env.BRIGHT_MLS_CLIENT_ID?.trim();
  const clientSecret = env.BRIGHT_MLS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new ConfigError(
      "BRIGHT_MLS_CLIENT_ID and BRIGHT_MLS_CLIENT_SECRET are required. " +
        "Bright issues them during API onboarding (data-support@brightmls.com).",
    );
  }

  const authMethod = (env.BRIGHT_MLS_TOKEN_AUTH ?? "basic").toLowerCase();
  if (authMethod !== "basic" && authMethod !== "post") {
    throw new ConfigError(`BRIGHT_MLS_TOKEN_AUTH must be "basic" or "post", got ${JSON.stringify(env.BRIGHT_MLS_TOKEN_AUTH)}`);
  }

  const defaults = ENDPOINTS[envName];

  return {
    env: envName,
    serviceRoot: stripTrailingSlash(env.BRIGHT_MLS_BASE_URL?.trim() || defaults.serviceRoot),
    tokenUrl: env.BRIGHT_MLS_TOKEN_URL?.trim() || defaults.tokenUrl,
    clientId,
    clientSecret,
    scope: env.BRIGHT_MLS_SCOPE?.trim() || undefined,
    tokenAuthMethod: authMethod,
    pageSize: int(env, "BRIGHT_MLS_PAGE_SIZE", 100, 1, 1000),
    maxPages: int(env, "BRIGHT_MLS_MAX_PAGES", 5, 1, 100),
    timeoutMs: int(env, "BRIGHT_MLS_TIMEOUT_MS", 30_000, 1_000, 120_000),
    debug: env.BRIGHT_MLS_DEBUG === "1" || env.BRIGHT_MLS_DEBUG === "true",
  };
}

/** Safe-to-print view of the config: never includes the secret. */
export function describeConfig(cfg: BrightConfig) {
  return {
    env: cfg.env,
    serviceRoot: cfg.serviceRoot,
    tokenUrl: cfg.tokenUrl,
    clientId: `${cfg.clientId.slice(0, 4)}…${cfg.clientId.slice(-2)}`,
    clientSecretConfigured: cfg.clientSecret.length > 0,
    scope: cfg.scope ?? "(none sent)",
    tokenAuthMethod: cfg.tokenAuthMethod,
    pageSize: cfg.pageSize,
    maxPages: cfg.maxPages,
    timeoutMs: cfg.timeoutMs,
  };
}
