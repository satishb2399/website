import assert from "node:assert/strict";
import { test } from "node:test";
import { fieldsForEntitySet, parseMetadata, partitionKnownFields } from "../src/metadata.js";

const EDMX = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="bright.reso">
      <EntityType Name="Property">
        <Key><PropertyRef Name="ListingKey" /></Key>
        <Property Name="ListingKey" Type="Edm.String" Nullable="false" />
        <Property Name="ListPrice" Type="Edm.Decimal" Nullable="true" />
        <Property Name="CloseDate" Type="Edm.Date" />
        <Property Name="Heating" Type="Collection(bright.reso.Heating)" />
        <NavigationProperty Name="Media" Type="Collection(bright.reso.Media)" />
      </EntityType>
      <EntityType Name="Member">
        <Key><PropertyRef Name="MemberKey" /></Key>
        <Property Name="MemberKey" Type="Edm.String" Nullable="false" />
        <Property Name="MemberFullName" Type="Edm.String" />
      </EntityType>
      <EntityContainer Name="bright">
        <EntitySet Name="Property" EntityType="bright.reso.Property" />
        <EntitySet Name="Member" EntityType="bright.reso.Member" />
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

test("parses entity sets and their types", () => {
  const schema = parseMetadata(EDMX);
  assert.deepEqual(Object.keys(schema.entitySets).sort(), ["Member", "Property"]);
  assert.equal(schema.entitySets.Property, "Property");
});

test("parses properties, keys, types and nullability", () => {
  const schema = parseMetadata(EDMX);
  const property = schema.entityTypes.Property;
  assert.ok(property);
  assert.deepEqual(property.keys, ["ListingKey"]);
  assert.deepEqual(
    property.properties.map((p) => p.name),
    ["ListingKey", "ListPrice", "CloseDate", "Heating"],
  );
  assert.equal(property.properties[0]?.nullable, false);
  // Nullable defaults to true when the attribute is absent.
  assert.equal(property.properties[2]?.nullable, true);
  assert.equal(property.properties[1]?.type, "Edm.Decimal");
});

test("navigation properties are not mistaken for fields", () => {
  const schema = parseMetadata(EDMX);
  assert.ok(!schema.entityTypes.Property?.properties.some((p) => p.name === "Media"));
});

test("fieldsForEntitySet resolves through the entity set name", () => {
  const schema = parseMetadata(EDMX);
  assert.equal(fieldsForEntitySet(schema, "Member")?.length, 2);
  assert.equal(fieldsForEntitySet(schema, "Nope"), undefined);
});

test("partitionKnownFields separates real fields from guesses", () => {
  const schema = parseMetadata(EDMX);
  const properties = fieldsForEntitySet(schema, "Property") ?? [];
  const { known, unknown } = partitionKnownFields(properties, ["ListPrice", "BrightMadeUpField", "CloseDate"]);
  assert.deepEqual(known, ["ListPrice", "CloseDate"]);
  assert.deepEqual(unknown, ["BrightMadeUpField"]);
});
