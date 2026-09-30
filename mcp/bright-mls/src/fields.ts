/**
 * Curated RESO Data Dictionary field sets.
 *
 * Bright's Property payload runs to hundreds of fields; returning all of them
 * buries the useful ones and burns context. These are the fields an acquisitions
 * workflow actually reads. They are standard RESO Data Dictionary names, but every
 * MLS publishes a subset — run `npm run doctor` (or the bright_describe_resource
 * tool) against live credentials to confirm which exist in Bright's model, and
 * pass an explicit `fields` array on any tool call to override.
 */

export const PROPERTY_CORE_FIELDS = [
  "ListingKey",
  "ListingId",
  "StandardStatus",
  "MlsStatus",
  "PropertyType",
  "PropertySubType",
  "UnparsedAddress",
  "City",
  "StateOrProvince",
  "PostalCode",
  "CountyOrParish",
  "ListPrice",
  "OriginalListPrice",
  "ClosePrice",
  "CloseDate",
  "DaysOnMarket",
  "BedroomsTotal",
  "BathroomsTotalInteger",
  "LivingArea",
  "LotSizeAcres",
  "YearBuilt",
  "ListingContractDate",
  "ModificationTimestamp",
] as const;

/** Core plus the detail worth having on a single-listing read or a comp row. */
export const PROPERTY_DETAIL_FIELDS = [
  ...PROPERTY_CORE_FIELDS,
  "StreetNumber",
  "StreetName",
  "SubdivisionName",
  "BathroomsFull",
  "BathroomsHalf",
  "LotSizeSquareFeet",
  "GarageSpaces",
  "TaxAnnualAmount",
  "TaxAssessedValue",
  "ListOfficeName",
  "OnMarketDate",
  "PublicRemarks",
  "Latitude",
  "Longitude",
] as const;

/** Enough to price a comp; no remarks, so comp sets stay compact. */
export const COMP_FIELDS = [
  "ListingKey",
  "ListingId",
  "UnparsedAddress",
  "City",
  "PostalCode",
  "PropertySubType",
  "ClosePrice",
  "ListPrice",
  "OriginalListPrice",
  "CloseDate",
  "DaysOnMarket",
  "BedroomsTotal",
  "BathroomsTotalInteger",
  "LivingArea",
  "LotSizeAcres",
  "YearBuilt",
  "StandardStatus",
] as const;

/**
 * StandardStatus values in the RESO Data Dictionary. `Closed` drives comps;
 * `Active` drives inventory; `Expired`/`Canceled`/`Withdrawn` are the
 * lead-source statuses worth watching (CLAUDE.md §8).
 */
export const STANDARD_STATUSES = [
  "Active",
  "ActiveUnderContract",
  "Pending",
  "Closed",
  "Expired",
  "Canceled",
  "Withdrawn",
  "Hold",
  "ComingSoon",
  "Delete",
  "Incomplete",
] as const;

export type StandardStatus = (typeof STANDARD_STATUSES)[number];

/** Counties the venture underwrites (CLAUDE.md header). Convenience, not a limit. */
export const TARGET_COUNTIES = ["Cumberland", "Dauphin", "York"] as const;
