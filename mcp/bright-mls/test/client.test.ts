import assert from "node:assert/strict";
import { test } from "node:test";
import { BrightApiError, BrightClient } from "../src/client.js";
import { loadConfig } from "../src/config.js";

const cfg = loadConfig({
  BRIGHT_MLS_CLIENT_ID: "id",
  BRIGHT_MLS_CLIENT_SECRET: "secret",
  BRIGHT_MLS_PAGE_SIZE: "2",
} as NodeJS.ProcessEnv);

const ROOT = cfg.serviceRoot;

type Reply = { status: number; body?: unknown; text?: string; headers?: Record<string, string> };

/** Stubs the token endpoint automatically; `handler` serves the data requests. */
function stubFetch(handler: (url: string, dataCall: number) => Reply) {
  const original = globalThis.fetch;
  const dataUrls: string[] = [];
  let tokenCalls = 0;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === cfg.tokenUrl) {
      tokenCalls += 1;
      return new Response(JSON.stringify({ access_token: `tok-${tokenCalls}`, expires_in: 3600 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    dataUrls.push(url);
    const reply = handler(url, dataUrls.length);
    return new Response(reply.text ?? JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { "content-type": "application/json", ...reply.headers },
    });
  }) as typeof fetch;

  return {
    dataUrls,
    get tokenCalls() {
      return tokenCalls;
    },
    restore() {
      globalThis.fetch = original;
    },
  };
}

test("resourceUrl builds a service-root query and rejects junk resource names", () => {
  const client = new BrightClient(cfg);
  const raw = client.resourceUrl("Property", { filter: "City eq 'York'", top: 5 });
  // `$` must stay literal on the wire, not arrive as %24.
  assert.equal(raw, `${ROOT}/Property?$filter=City%20eq%20'York'&$top=5`);
  const url = new URL(raw);
  assert.equal(url.searchParams.get("$filter"), "City eq 'York'");
  assert.equal(url.searchParams.get("$top"), "5");
  for (const bad of ["Property/x", "../Property", "Property?x=1", ""]) {
    assert.throws(() => client.resourceUrl(bad), BrightApiError);
  }
});

test("follows @odata.nextLink up to the page ceiling and flags truncation", async (t) => {
  const stub = stubFetch((_url, call) => ({
    status: 200,
    body: { value: [{ n: call * 2 - 1 }, { n: call * 2 }], "@odata.nextLink": `${ROOT}/Property?page=${call + 1}` },
  }));
  t.after(stub.restore);

  const result = await new BrightClient(cfg).getCollection("Property", {}, { maxPages: 3 });
  assert.equal(result.pagesFetched, 3);
  assert.equal(result.rows.length, 6);
  assert.equal(result.truncated, true);
  assert.equal(stub.dataUrls.length, 3);
  // The default page size becomes $top on the first request only.
  assert.match(stub.dataUrls[0]!, /\$top=2/);
  assert.equal(stub.dataUrls[1], `${ROOT}/Property?page=2`);
});

test("stops cleanly when the server sends no nextLink", async (t) => {
  const stub = stubFetch(() => ({ status: 200, body: { value: [{ n: 1 }], "@odata.count": 1 } }));
  t.after(stub.restore);

  const result = await new BrightClient(cfg).getCollection("Property", { count: true }, { maxPages: 5 });
  assert.equal(result.pagesFetched, 1);
  assert.equal(result.truncated, false);
  assert.equal(result.totalCount, 1);
});

test("a caller-supplied top is a hard row cap across pages", async (t) => {
  const stub = stubFetch(() => ({
    status: 200,
    body: { value: [{ n: 1 }, { n: 2 }], "@odata.nextLink": `${ROOT}/Property?more=1` },
  }));
  t.after(stub.restore);

  const result = await new BrightClient(cfg).getCollection("Property", { top: 3 }, { maxPages: 10 });
  assert.equal(result.rows.length, 3);
  assert.equal(result.truncated, true);
  assert.equal(stub.dataUrls.length, 2);
});

test("retries a 429 once the Retry-After delay elapses", async (t) => {
  const stub = stubFetch((_url, call) =>
    call === 1
      ? { status: 429, body: { error: { message: "slow down" } }, headers: { "retry-after": "0" } }
      : { status: 200, body: { value: [{ n: 1 }] } },
  );
  t.after(stub.restore);

  const result = await new BrightClient(cfg).getCollection("Property", {});
  assert.equal(result.rows.length, 1);
  assert.equal(stub.dataUrls.length, 2);
});

test("re-authenticates once on a 401 instead of failing the call", async (t) => {
  const stub = stubFetch((_url, call) => (call === 1 ? { status: 401, body: {} } : { status: 200, body: { value: [] } }));
  t.after(stub.restore);

  await new BrightClient(cfg).getCollection("Property", {});
  assert.equal(stub.dataUrls.length, 2);
  assert.equal(stub.tokenCalls, 2, "the stale token should be dropped and a fresh one fetched");
});

test("gives up after the retry budget and surfaces the status", async (t) => {
  const stub = stubFetch(() => ({ status: 503, body: { error: { message: "unavailable" } }, headers: { "retry-after": "0" } }));
  t.after(stub.restore);

  await assert.rejects(() => new BrightClient(cfg).getCollection("Property", {}), (err: unknown) => {
    assert.ok(err instanceof BrightApiError);
    assert.equal(err.status, 503);
    assert.match(err.message, /unavailable/);
    return true;
  });
  assert.equal(stub.dataUrls.length, 3);
});

test("a 400 is not retried and reports the OData error message", async (t) => {
  const stub = stubFetch(() => ({
    status: 400,
    body: { error: { code: "BadRequest", message: "Could not find a property named 'Nope'" } },
  }));
  t.after(stub.restore);

  await assert.rejects(() => new BrightClient(cfg).getCollection("Property", {}), (err: unknown) => {
    assert.ok(err instanceof BrightApiError);
    assert.match(err.message, /BadRequest: Could not find a property named 'Nope'/);
    return true;
  });
  assert.equal(stub.dataUrls.length, 1);
});

test("getEntityByKey returns undefined on 404 and quotes the key safely", async (t) => {
  const stub = stubFetch((url) => (url.includes("missing") ? { status: 404, body: {} } : { status: 200, body: { ListingKey: "k" } }));
  t.after(stub.restore);

  const client = new BrightClient(cfg);
  assert.equal(await client.getEntityByKey("Property", "missing"), undefined);

  const found = await client.getEntityByKey("Property", "abc'123", ["ListingKey"]);
  assert.deepEqual(found, { ListingKey: "k" });
  assert.ok(stub.dataUrls.some((u) => u.includes("%27") && !u.includes("abc'123")), "the key's quote must be percent-encoded");
});

test("a non-JSON body is reported rather than thrown as a parse error", async (t) => {
  const stub = stubFetch(() => ({ status: 200, text: "<html>gateway</html>" }));
  t.after(stub.restore);

  await assert.rejects(() => new BrightClient(cfg).getCollection("Property", {}), /non-JSON body/);
});
