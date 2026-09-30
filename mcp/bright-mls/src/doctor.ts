#!/usr/bin/env node
/**
 * Pre-flight check, run from a terminal (not over MCP): `npm run doctor`.
 *
 * Confirms the endpoints and credentials work, then validates every field name
 * this server sends by default against Bright's live $metadata — the one thing
 * that cannot be verified without credentials, and the most likely cause of a 400.
 */

import { BrightClient } from "./client.js";
import { ConfigError, describeConfig, loadConfig } from "./config.js";
import { COMP_FIELDS, PROPERTY_CORE_FIELDS, PROPERTY_DETAIL_FIELDS } from "./fields.js";
import { fieldsForEntitySet, getSchema, partitionKnownFields } from "./metadata.js";

async function main(): Promise<number> {
  let cfg;
  try {
    cfg = loadConfig();
  } catch (err) {
    console.error(err instanceof ConfigError ? `Configuration error: ${err.message}` : err);
    return 78;
  }

  console.log("Configuration");
  for (const [key, value] of Object.entries(describeConfig(cfg))) {
    console.log(`  ${key.padEnd(24)} ${String(value)}`);
  }

  const client = new BrightClient(cfg);

  console.log("\nAuthentication + one-row read");
  try {
    const probe = await client.getCollection("Property", { select: ["ListingKey"], top: 1 });
    console.log(`  ok — Property returned ${probe.rows.length} row(s)`);
  } catch (err) {
    console.error(`  FAILED — ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  console.log("\n$metadata");
  let schema;
  try {
    schema = await getSchema(client);
    const sets = Object.keys(schema.entitySets).sort();
    console.log(`  ${sets.length} entity set(s): ${sets.join(", ")}`);
  } catch (err) {
    console.error(`  FAILED — ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  const properties = fieldsForEntitySet(schema, "Property");
  if (!properties) {
    console.error('  FAILED — no "Property" entity set in $metadata');
    return 1;
  }

  console.log(`\nDefault field sets vs. Bright's Property type (${properties.length} fields)`);
  let missing = 0;
  for (const [label, fields] of [
    ["core", PROPERTY_CORE_FIELDS],
    ["detail", PROPERTY_DETAIL_FIELDS],
    ["comp", COMP_FIELDS],
  ] as const) {
    const { known, unknown } = partitionKnownFields(properties, fields);
    missing += unknown.length;
    console.log(`  ${label.padEnd(8)} ${known.length}/${fields.length} present${unknown.length ? ` — MISSING: ${unknown.join(", ")}` : ""}`);
  }

  if (missing > 0) {
    console.log(
      "\nEdit src/fields.ts to drop or rename the missing fields — a $select naming one makes Bright reject the whole request.",
    );
    return 2;
  }

  console.log("\nAll checks passed.");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(err);
    process.exit(1);
  },
);
