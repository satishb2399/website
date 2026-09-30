/**
 * $metadata reader.
 *
 * Bright serves an EDMX document describing every entity set and field. We pull
 * the entity-set names and each entity type's properties so an agent can discover
 * the real schema instead of guessing field names (a bad $select is a 400, not an
 * empty result). Parsed with regex rather than a full XML dependency — it reads
 * element attributes only, which EDMX keeps flat.
 */

import type { BrightClient } from "./client.js";

export interface EntityProperty {
  name: string;
  type: string;
  nullable: boolean;
}

export interface EntityType {
  name: string;
  keys: string[];
  properties: EntityProperty[];
}

export interface ServiceSchema {
  /** Entity set name (what you query, e.g. `Property`) → entity type name. */
  entitySets: Record<string, string>;
  entityTypes: Record<string, EntityType>;
  fetchedAt: string;
}

let cache: ServiceSchema | undefined;

export async function getSchema(client: BrightClient, refresh = false): Promise<ServiceSchema> {
  if (cache && !refresh) return cache;
  const xml = await client.getMetadataXml();
  cache = parseMetadata(xml);
  return cache;
}

export function parseMetadata(xml: string): ServiceSchema {
  const entitySets: Record<string, string> = {};
  for (const match of xml.matchAll(/<EntitySet\b[^>]*?Name="([^"]+)"[^>]*?EntityType="([^"]+)"[^>]*?\/?>/g)) {
    const [, name, type] = match;
    if (name && type) entitySets[name] = shortTypeName(type);
  }

  const entityTypes: Record<string, EntityType> = {};
  for (const match of xml.matchAll(/<EntityType\b([^>]*)>([\s\S]*?)<\/EntityType>/g)) {
    const attrs = match[1] ?? "";
    const inner = match[2] ?? "";
    const name = attr(attrs, "Name");
    if (!name) continue;

    const keys: string[] = [];
    const keyBlock = /<Key>([\s\S]*?)<\/Key>/.exec(inner)?.[1] ?? "";
    for (const ref of keyBlock.matchAll(/<PropertyRef\b[^>]*?Name="([^"]+)"/g)) {
      if (ref[1]) keys.push(ref[1]);
    }

    const properties: EntityProperty[] = [];
    for (const prop of inner.matchAll(/<Property\b([^>]*?)\/?>/g)) {
      const propAttrs = prop[1] ?? "";
      const propName = attr(propAttrs, "Name");
      if (!propName) continue;
      properties.push({
        name: propName,
        type: attr(propAttrs, "Type") ?? "unknown",
        nullable: attr(propAttrs, "Nullable") !== "false",
      });
    }

    entityTypes[name] = { name, keys, properties };
  }

  return { entitySets, entityTypes, fetchedAt: new Date().toISOString() };
}

/** Fields of the entity type behind an entity set, or undefined if unknown. */
export function fieldsForEntitySet(schema: ServiceSchema, entitySet: string): EntityProperty[] | undefined {
  const typeName = schema.entitySets[entitySet];
  if (!typeName) return undefined;
  return schema.entityTypes[typeName]?.properties;
}

/** Splits a requested field list into ones the schema has and ones it doesn't. */
export function partitionKnownFields(
  properties: readonly EntityProperty[],
  requested: readonly string[],
): { known: string[]; unknown: string[] } {
  const available = new Set(properties.map((p) => p.name));
  const known: string[] = [];
  const unknown: string[] = [];
  for (const name of requested) (available.has(name) ? known : unknown).push(name);
  return { known, unknown };
}

function attr(attrs: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
}

function shortTypeName(qualified: string): string {
  const withoutCollection = /^Collection\((.*)\)$/.exec(qualified)?.[1] ?? qualified;
  return withoutCollection.split(".").pop() ?? withoutCollection;
}
