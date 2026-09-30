/**
 * OAuth2 client_credentials against Bright's Okta authorization server.
 *
 * Bright's AS advertises both client_secret_basic and client_secret_post; which one
 * your app accepts is set per-client in their Okta tenant, so we try the configured
 * method and fall back once to the other on invalid_client rather than making you
 * guess. Tokens live 3600s; we refresh 60s early and collapse concurrent refreshes.
 */

import type { BrightConfig, TokenAuthMethod } from "./config.js";

const EXPIRY_SKEW_MS = 60_000;

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly oauthError?: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

export class TokenProvider {
  private cached?: CachedToken;
  private inflight?: Promise<string>;
  /** Sticks to whichever auth method actually worked. */
  private method: TokenAuthMethod;

  constructor(private readonly cfg: BrightConfig) {
    this.method = cfg.tokenAuthMethod;
  }

  /** Current token, fetching or refreshing as needed. */
  async getAccessToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt - EXPIRY_SKEW_MS > Date.now()) {
      return this.cached.value;
    }
    this.inflight ??= this.fetchToken().finally(() => {
      this.inflight = undefined;
    });
    return this.inflight;
  }

  /** Drop the cached token — used after a 401 so the next call re-authenticates. */
  invalidate(): void {
    this.cached = undefined;
  }

  private async fetchToken(): Promise<string> {
    try {
      return await this.requestToken(this.method);
    } catch (err) {
      const other: TokenAuthMethod = this.method === "basic" ? "post" : "basic";
      if (err instanceof AuthError && err.oauthError === "invalid_client") {
        const token = await this.requestToken(other);
        this.method = other;
        return token;
      }
      throw err;
    }
  }

  private async requestToken(method: TokenAuthMethod): Promise<string> {
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    if (this.cfg.scope) body.set("scope", this.cfg.scope);

    const headers: Record<string, string> = {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    };

    if (method === "basic") {
      // RFC 6749 §2.3.1: form-urlencode each half before base64.
      const credentials = `${encodeURIComponent(this.cfg.clientId)}:${encodeURIComponent(this.cfg.clientSecret)}`;
      headers.authorization = `Basic ${Buffer.from(credentials).toString("base64")}`;
    } else {
      body.set("client_id", this.cfg.clientId);
      body.set("client_secret", this.cfg.clientSecret);
    }

    let res: Response;
    try {
      res = await fetch(this.cfg.tokenUrl, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(this.cfg.timeoutMs),
      });
    } catch (cause) {
      throw new AuthError(`Could not reach the Bright token endpoint (${this.cfg.tokenUrl}): ${describeCause(cause)}`);
    }

    const text = await res.text();
    const payload = safeJson(text);

    if (!res.ok) {
      // Okta answers some failures in RFC 6749 form (error/error_description) and
      // others in its own (errorCode/errorSummary) — read both.
      const oauthError = str(payload?.error) ?? str(payload?.errorCode);
      const detail = str(payload?.error_description) ?? str(payload?.errorSummary) ?? text.slice(0, 300);
      throw new AuthError(
        `Bright token request failed (${res.status}${oauthError ? ` ${oauthError}` : ""}): ${detail}`,
        res.status,
        oauthError,
      );
    }

    const accessToken = payload?.access_token;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new AuthError("Bright token response contained no access_token.", res.status);
    }

    const expiresIn = typeof payload?.expires_in === "number" ? payload.expires_in : 3600;
    this.cached = { value: accessToken, expiresAt: Date.now() + expiresIn * 1000 };
    if (this.cfg.debug) {
      process.stderr.write(`[bright-mls] token acquired via ${method}, expires_in=${expiresIn}s\n`);
    }
    return accessToken;
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function safeJson(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export function describeCause(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.name === "TimeoutError" ? "request timed out" : cause.message;
  }
  return String(cause);
}
