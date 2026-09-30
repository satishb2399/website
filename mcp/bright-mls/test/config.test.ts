import assert from "node:assert/strict";
import { test } from "node:test";
import { ConfigError, describeConfig, loadConfig } from "../src/config.js";

const creds = { BRIGHT_MLS_CLIENT_ID: "abcdef", BRIGHT_MLS_CLIENT_SECRET: "s3cret" };

function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...creds, ...extra } as NodeJS.ProcessEnv;
}

test("defaults to the test environment, not production", () => {
  const cfg = loadConfig(env());
  assert.equal(cfg.env, "test");
  assert.equal(cfg.serviceRoot, "https://bright-reso.tst.brightmls.com/RESO/OData/bright");
  assert.equal(cfg.tokenUrl, "https://okta.tst.brightmls.com/oauth2/default/v1/token");
});

test("production selects the production endpoints", () => {
  const cfg = loadConfig(env({ BRIGHT_MLS_ENV: "production" }));
  assert.equal(cfg.serviceRoot, "https://bright-reso.brightmls.com/RESO/OData/bright");
  assert.equal(cfg.tokenUrl, "https://okta.brightmls.com/oauth2/default/v1/token");
});

test("missing credentials fail loudly with the onboarding hint", () => {
  assert.throws(() => loadConfig({} as NodeJS.ProcessEnv), (err: unknown) => {
    assert.ok(err instanceof ConfigError);
    assert.match(err.message, /BRIGHT_MLS_CLIENT_ID/);
    assert.match(err.message, /onboarding/);
    return true;
  });
});

test("overrides win and trailing slashes are trimmed", () => {
  const cfg = loadConfig(
    env({ BRIGHT_MLS_BASE_URL: "https://example.test/RESO/OData/bright/", BRIGHT_MLS_TOKEN_URL: "https://t.example/token" }),
  );
  assert.equal(cfg.serviceRoot, "https://example.test/RESO/OData/bright");
  assert.equal(cfg.tokenUrl, "https://t.example/token");
});

test("invalid enum and numeric settings are rejected", () => {
  assert.throws(() => loadConfig(env({ BRIGHT_MLS_ENV: "prod" })), ConfigError);
  assert.throws(() => loadConfig(env({ BRIGHT_MLS_TOKEN_AUTH: "jwt" })), ConfigError);
  assert.throws(() => loadConfig(env({ BRIGHT_MLS_PAGE_SIZE: "0" })), ConfigError);
  assert.throws(() => loadConfig(env({ BRIGHT_MLS_MAX_PAGES: "abc" })), ConfigError);
});

test("describeConfig never exposes the secret and only partially shows the id", () => {
  const described = describeConfig(loadConfig(env()));
  const serialised = JSON.stringify(described);
  assert.ok(!serialised.includes("s3cret"));
  assert.equal(described.clientSecretConfigured, true);
  assert.equal(described.clientId, "abcd…ef");
});
