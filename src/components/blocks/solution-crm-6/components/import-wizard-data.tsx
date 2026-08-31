export type ImportStepId =
  | "upload"
  | "map"
  | "preview"
  | "duplicates"
  | "summary"
export type TargetObject = "contacts" | "deals"
export type DuplicateMode = "skip" | "update" | "create"
export type CrmField =
  | "unmapped"
  | "fullName"
  | "email"
  | "account"
  | "phone"
  | "owner"
  | "lifecycle"
  | "leadSource"
  | "dealValue"

export interface ImportStep {
  id: ImportStepId
  step: number
  title: string
  description: string
}

export interface ImportOption<TValue extends string = string> {
  value: TValue
  label: string
  description?: string
}

export interface ColumnMapping {
  id: string
  source: string
  sample: string
  field: CrmField
  required: boolean
}

export interface PreviewRow {
  id: string
  fullName: string
  email: string
  account: string
  flag: "valid" | "warning" | "error"
}

export interface ImportValues {
  fileName: string
  target: TargetObject
  firstRowHeader: boolean
  mappings: ColumnMapping[]
  uniqueKey: CrmField
  duplicateMode: DuplicateMode
}

type ColumnMappingSeed = [
  id: string,
  source: string,
  sample: string,
  field: CrmField,
  required: boolean,
]
type PreviewRowSeed = [
  id: string,
  fullName: string,
  email: string,
  account: string,
  flag: PreviewRow["flag"],
]
function duplicateOption(
  value: DuplicateMode,
  label: string,
  description: string,
  badge: string
) {
  return { value, label, description, badge }
}

function importStep(
  id: ImportStepId,
  step: number,
  title: string,
  description: string
): ImportStep {
  return { id, step, title, description }
}

export const IMPORT_STEPS: ImportStep[] = [
  importStep("upload", 1, "Upload", "Pick files and target object."),
  importStep("map", 2, "Map Columns", "Match 8 columns to CRM fields."),
  importStep("preview", 3, "Preview", "Validate the first rows."),
  importStep("duplicates", 4, "Duplicates", "Choose how matches merge."),
  importStep("summary", 5, "Summary", "Run the import."),
]

export const TARGET_OPTIONS: ImportOption<TargetObject>[] = [
  {
    value: "contacts",
    label: "Contacts",
    description: "Leads and people in the lifecycle.",
  },
  {
    value: "deals",
    label: "Deals",
    description: "Open pipeline by account and stage.",
  },
]

export const CRM_FIELD_OPTIONS: ImportOption<CrmField>[] = [
  { value: "unmapped", label: "Do not import" },
  { value: "fullName", label: "Full name" },
  { value: "email", label: "Email" },
  { value: "account", label: "Account" },
  { value: "phone", label: "Phone" },
  { value: "owner", label: "Owner" },
  { value: "lifecycle", label: "Lifecycle stage" },
  { value: "leadSource", label: "Lead source" },
  { value: "dealValue", label: "Deal value" },
]

export const UNIQUE_KEY_OPTIONS: ImportOption<CrmField>[] = [
  { value: "email", label: "Email", description: "Match on the email column." },
  {
    value: "phone",
    label: "Phone",
    description: "Match on the phone column.",
  },
]

export const DUPLICATE_OPTIONS = [
  duplicateOption(
    "skip",
    "Skip existing",
    "Keep current records. 36 matched contacts stay untouched.",
    "Safest"
  ),
  duplicateOption(
    "update",
    "Update existing",
    "Overwrite mapped fields on the 36 matched contacts.",
    "Recommended"
  ),
  duplicateOption(
    "create",
    "Create new",
    "Add every row as a new contact, duplicates included.",
    "Risky"
  ),
]

const DEFAULT_MAPPING_ROWS: ColumnMappingSeed[] = [
  ["col-name", "Name", "Mira Stone", "fullName", true],
  ["col-email", "Email", "mira.stone@brightwave.io", "email", true],
  ["col-company", "Company", "Brightwave Media", "account", false],
  ["col-phone", "Phone", "+1 415 555 0142", "phone", false],
  ["col-owner", "Owner", "Leo Grant", "unmapped", true],
  ["col-stage", "Lifecycle", "Opportunity", "lifecycle", false],
  ["col-source", "Source", "Referral", "leadSource", false],
  ["col-value", "Deal value", "$48,000", "dealValue", false],
]

export const DEFAULT_MAPPINGS: ColumnMapping[] = DEFAULT_MAPPING_ROWS.map(
  ([id, source, sample, field, required]) => ({
    id,
    source,
    sample,
    field,
    required,
  })
)

export const FLAG_TONE_CLASS: Record<PreviewRow["flag"], string> = {
  valid: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
}

export const FLAG_LABEL: Record<PreviewRow["flag"], string> = {
  valid: "Valid",
  warning: "Warning",
  error: "Error",
}

const PREVIEW_ROW_SEEDS: PreviewRowSeed[] = [
  [
    "row-1",
    "Mira Stone",
    "mira.stone@brightwave.io",
    "Brightwave Media",
    "valid",
  ],
  [
    "row-2",
    "Sana Qureshi",
    "sana.q@apexmfg.com",
    "Apex Manufacturing",
    "valid",
  ],
  ["row-3", "Alex Johnson", "alex.j@cobaltlog", "Cobalt Logistics", "warning"],
  ["row-4", "Michael Rodriguez", "", "Vertex Health", "error"],
  [
    "row-5",
    "Emma Wilson",
    "emma.wilson@meridian.co",
    "Meridian Retail",
    "valid",
  ],
]

export const PREVIEW_ROWS: PreviewRow[] = PREVIEW_ROW_SEEDS.map(
  ([id, fullName, email, account, flag]) => ({
    id,
    fullName,
    email,
    account,
    flag,
  })
)

export const IMPORT_FILE = {
  rowsLabel: "1,248 rows",
  accept:
    ".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/png,image/jpeg,image/webp",
  acceptedTypesLabel: "CSV, Excel, PDF, PNG, or JPG",
  maxSize: 10 * 1024 * 1024,
  maxFiles: 5,
  initialLabel: "northstar-contacts.csv + 1 file",
  initialFiles: [
    {
      id: "crm-import-file-contacts",
      name: "northstar-contacts.csv",
      size: 2468000,
      type: "text/csv",
      url: "#",
    },
    {
      id: "crm-import-file-logos",
      name: "account-logos.png",
      size: 684000,
      type: "image/png",
      url: "#",
    },
  ],
}

export const VALIDATION_SUMMARY = {
  valid: 1212,
  warnings: 24,
  errors: 12,
}

export const IMPORT_RESULT = {
  imported: 1176,
  skipped: 36,
  errors: 12,
}