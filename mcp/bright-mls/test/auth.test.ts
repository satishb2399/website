import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthError, TokenProvider } from "../src/auth.js";
import { loadConfig } from "../src/config.js";

function cfg(extra: Record<string, string> = {}) {
  return loadConfig({
    BRIGHT_MLS_CLIENT_ID: "client id",
    BRIGHT_MLS_CLIENT_SECRET: "secret/with+chars",
    ...extra,
  } as NodeJS.ProcessEnv);
}

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: URLSearchParams;
}

function stubFetch(handler: (captured: Captured, call: number) => { status: number; body: unknown }) {
  const calls: Captured[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const captured: Captured = {
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: new URLSearchParams(String(init?.body ?? "")),
    };
    calls.push(captured);
    const { status, body } = handler(captured, calls.length);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

test("sends client_credentials with basic auth by default", async (t) => {
  const stub = stubFetch(() => ({ status: 200, body: { access_token: "tok-1", expires_in: 3600 } }));
  t.after(stub.restore);

  const token = await new TokenProvider(cfg()).getAccessToken();
  assert.equal(token, "tok-1");
  assert.equal(stub.calls.length, 1);

  const call = stub.calls[0]!;
  assert.equal(call.url, "https://okta.tst.brightmls.com/oauth2/default/v1/token");
  assert.equal(call.body.get("grant_type"), "client_credentials");
  assert.equal(call.body.get("client_secret"), null, "secret must not be in the body under basic auth");

  // RFC 6749 §2.3.1: each half is form-urlencoded before base64.
  const decoded = Buffer.from(call.headers.authorization!.replace("Basic ", ""), "base64").toString();
  assert.equal(decoded, "client%20id:secret%2Fwith%2Bchars");
});

test("post mode puts the credentials in the form body", async (t) => {
  const stub = stubFetch(() => ({ status: 200, body: { access_token: "tok-2", expires_in: 3600 } }));
  t.after(stub.restore);

  await new TokenProvider(cfg({ BRIGHT_MLS_TOKEN_AUTH: "post" })).getAccessToken();
  const call = stub.calls[0]!;
  assert.equal(call.headers.authorization, undefined);
  assert.equal(call.body.get("client_id"), "client id");
  assert.equal(call.body.get("client_secret"), "secret/with+chars");
});

test("scope is sent only when configured", async (t) => {
  const stub = stubFetch(() => ({ status: 200, body: { access_token: "tok", expires_in: 3600 } }));
  t.after(stub.restore);

  await new TokenProvider(cfg()).getAccessToken();
  assert.equal(stub.calls[0]?.body.get("scope"), null);

  await new TokenProvider(cfg({ BRIGHT_MLS_SCOPE: "bright.reso.read" })).getAccessToken();
  assert.equal(stub.calls[1]?.body.get("scope"), "bright.reso.read");
});

test("invalid_client under basic auth falls back to post once", async (t) => {
  const stub = stubFetch((captured) =>
    captured.headers.authorization
      ? { status: 401, body: { error: "invalid_client", error_description: "auth method not allowed" } }
      : { status: 200, body: { access_token: "tok-post", expires_in: 3600 } },
  );
  t.after(stub.restore);

  const provider = new TokenProvider(cfg());
  assert.equal(await provider.getAccessToken(), "tok-post");
  assert.equal(stub.calls.length, 2);

  // The working method sticks: a later refresh does not retry basic.
  provider.invalidate();
  assert.equal(await provider.getAccessToken(), "tok-post");
  assert.equal(stub.calls.length, 3);
  assert.equal(stub.calls[2]?.headers.authorization, undefined);
});

test("other OAuth errors surface with the description, not a fallback loop", async (t) => {
  const stub = stubFetch(() => ({ status: 400, body: { error: "invalid_scope", error_description: "scope not granted" } }));
  t.after(stub.restore);

  await assert.rejects(() => new TokenProvider(cfg()).getAccessToken(), (err: unknown) => {
    assert.ok(err instanceof AuthError);
    assert.equal(err.oauthError, "invalid_scope");
    assert.match(err.message, /scope not granted/);
    return true;
  });
  assert.equal(stub.calls.length, 1);
});

test("a token is cached until it nears expiry, and concurrent calls share one request", async (t) => {
  let issued = 0;
  const stub = stubFetch(() => {
    issued += 1;
    return { status: 200, body: { access_token: `tok-${issued}`, expires_in: 3600 } };
  });
  t.after(stub.restore);

  const provider = new TokenProvider(cfg());
  const [a, b] = await Promise.all([provider.getAccessToken(), provider.getAccessToken()]);
  assert.equal(a, "tok-1");
  assert.equal(b, "tok-1");
  assert.equal(await provider.getAccessToken(), "tok-1");
  assert.equal(stub.calls.length, 1);
});

test("a token expiring inside the skew window is refreshed", async (t) => {
  let issued = 0;
  const stub = stubFetch(() => {
    issued += 1;
    return { status: 200, body: { access_token: `tok-${issued}`, expires_in: 30 } };
  });
  t.after(stub.restore);

  const provider = new TokenProvider(cfg());
  assert.equal(await provider.getAccessToken(), "tok-1");
  assert.equal(await provider.getAccessToken(), "tok-2");
});

test("a response without an access_token is an error", async (t) => {
  const stub = stubFetch(() => ({ status: 200, body: { token_type: "Bearer" } }));
  t.after(stub.restore);
  await assert.rejects(() => new TokenProvider(cfg()).getAccessToken(), /no access_token/);
});

test("Okta's own error shape is read as well as the RFC 6749 one", async (t) => {
  const stub = stubFetch((captured) =>
    captured.headers.authorization
      ? {
          status: 401,
          body: { errorCode: "invalid_client", errorSummary: "Invalid value for 'client_id' parameter." },
        }
      : { status: 200, body: { access_token: "tok-post", expires_in: 3600 } },
  );
  t.after(stub.restore);

  // The fallback to post auth has to fire off errorCode, not just `error`.
  assert.equal(await new TokenProvider(cfg()).getAccessToken(), "tok-post");
  assert.equal(stub.calls.length, 2);
});

test("an Okta-shaped failure keeps its summary in the message", async (t) => {
  const stub = stubFetch(() => ({
    status: 400,
    body: { errorCode: "invalid_scope", errorSummary: "The scope requested is not granted." },
  }));
  t.after(stub.restore);

  await assert.rejects(() => new TokenProvider(cfg()).getAccessToken(), (err: unknown) => {
    assert.ok(err instanceof AuthError);
    assert.equal(err.oauthError, "invalid_scope");
    assert.match(err.message, /The scope requested is not granted\./);
    return true;
  });
});
