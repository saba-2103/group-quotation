// Superset of census columns the backend understands.
//
// Source of truth: group-pas/issuance/IssuanceCommand/src/main/java/com/anaira/
//                  issuance/command/CensusSubmissionCommands.java (parseRow).
// Required columns are non-negotiable — the parser refuses a CSV without them.
// Optional columns are read when present and surfaced as MemberData fields.
// loanOutstanding is added for GCL plans that use it as the cover-formula
// attribute (catalog StubProductCatalogClient.gclBasic()).
//
// This is the menu shown in the Census file-format column picker. Selecting
// columns produces a Frictionless Table Schema in `censusFileFormat.schemaJson`.

export type CensusColumnType = "string" | "number" | "integer" | "date" | "boolean";

export interface CensusColumnDef {
  name: string;
  label: string;
  type: CensusColumnType;
  required: boolean; // true = backend rejects upload without this column
  description: string;
  formulaAttribute?: boolean; // shown in AmountFormula attribute dropdowns
}

export const CENSUS_COLUMN_SUPERSET: CensusColumnDef[] = [
  {
    name: "memberId",
    label: "Member ID",
    type: "string",
    required: true,
    description: "Stable identifier for the member within the broker's census.",
  },
  {
    name: "name",
    label: "Name",
    type: "string",
    required: true,
    description: "Full legal name of the member.",
  },
  {
    name: "planNo",
    label: "Plan number",
    type: "string",
    required: true,
    description:
      "Plan the member is allocated to. Must match one of the Quote's planNo values.",
  },
  {
    name: "sumInsured",
    label: "Sum insured",
    type: "number",
    required: true,
    description: "Cover amount allocated to the member (currency: quote default).",
  },
  {
    name: "dob",
    label: "Date of birth",
    type: "date",
    required: false,
    description: "ISO-8601 date (YYYY-MM-DD). Drives age-banded pricing.",
  },
  {
    name: "gender",
    label: "Gender",
    type: "string",
    required: false,
    description: "Free-text or coded (M/F/O). Drives gender-banded pricing.",
    formulaAttribute: true,
  },
  {
    name: "salary",
    label: "Annual salary",
    type: "number",
    required: false,
    description:
      "Drives salary-multiple cover formulas (e.g. GTL 3× / 4× / 5× salary).",
    formulaAttribute: true,
  },
  {
    name: "occupation",
    label: "Occupation",
    type: "string",
    required: false,
    description: "Used for occupation-class loading / lookups.",
    formulaAttribute: true,
  },
  {
    name: "loanOutstanding",
    label: "Loan outstanding",
    type: "number",
    required: false,
    description:
      "GCL only — outstanding loan principal. Drives 1× loanOutstanding cover formula.",
    formulaAttribute: true,
  },
];

export const CENSUS_REQUIRED_COLUMN_NAMES = CENSUS_COLUMN_SUPERSET.filter(
  (c) => c.required,
).map((c) => c.name);

export interface FrictionlessField {
  name: string;
  type: CensusColumnType;
  constraints?: { required?: boolean };
}

export interface FrictionlessSchema {
  fields: FrictionlessField[];
}

// Build the Frictionless Table Schema string the backend expects in
// CensusFileFormat.schemaJson. `selected` is the set of column names the
// user picked; required columns are auto-included even if missing from
// `selected` so the resulting schema is always parseable.
export function buildSchemaJson(selected: Set<string>): string {
  const fields: FrictionlessField[] = [];
  for (const col of CENSUS_COLUMN_SUPERSET) {
    if (col.required || selected.has(col.name)) {
      fields.push({
        name: col.name,
        type: col.type,
        constraints: { required: col.required },
      });
    }
  }
  const schema: FrictionlessSchema = { fields };
  return JSON.stringify(schema);
}

// Read a stored schemaJson back into the set of selected column names. Unknown
// columns are dropped (they'll surface in the Advanced JSON editor).
export function parseSchemaJson(
  schemaJson: string | undefined | null,
): { selected: Set<string>; unknown: FrictionlessField[] } {
  const selected = new Set<string>();
  const unknown: FrictionlessField[] = [];
  if (!schemaJson) return { selected, unknown };
  try {
    const parsed = JSON.parse(schemaJson) as Partial<FrictionlessSchema> & {
      columns?: FrictionlessField[];
    };
    // Accept both "fields" (Frictionless canonical) and "columns" (older
    // mock shape) for backwards compat.
    const rawFields = Array.isArray(parsed.fields)
      ? parsed.fields
      : Array.isArray(parsed.columns)
      ? parsed.columns
      : [];
    const known = new Set(CENSUS_COLUMN_SUPERSET.map((c) => c.name));
    for (const f of rawFields) {
      if (!f?.name) continue;
      if (known.has(f.name)) selected.add(f.name);
      else unknown.push(f);
    }
  } catch {
    // fall through with empty sets
  }
  return { selected, unknown };
}
