import type { ReactNode } from "react"
import {
  formatBytes,
  useFileUpload,
  type FileWithPreview,
} from "@/hooks/use-file-upload"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CRM_FIELD_OPTIONS,
  DUPLICATE_OPTIONS,
  FLAG_LABEL,
  FLAG_TONE_CLASS,
  IMPORT_FILE,
  IMPORT_RESULT,
  PREVIEW_ROWS,
  TARGET_OPTIONS,
  UNIQUE_KEY_OPTIONS,
  VALIDATION_SUMMARY,
  type ColumnMapping,
  type CrmField,
  type DuplicateMode,
  type ImportOption,
  type ImportValues,
  type TargetObject,
} from "./import-wizard-data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Upload01Icon, AlertCircleIcon, File02Icon, Cancel01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

export type WizardErrors = Partial<Record<keyof ImportValues, string>>

type ImportValueChange = (
  field: keyof ImportValues,
  value: ImportValues[keyof ImportValues]
) => void

function RequiredMark() {
  return <span className="text-destructive">*</span>
}

function ImportSelectField<TValue extends string>({
  id,
  value,
  options,
  placeholder,
  onValueChange,
}: {
  id: string
  value: TValue
  options: ImportOption<TValue>[]
  placeholder: string
  onValueChange: (value: TValue) => void
}) {
  const selectedOption =
    options.find((option) => option.value === value) ?? null

  return (
    <Select
      value={selectedOption}
      items={options}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue.value)
        }
      }}
    >
      <SelectTrigger id={id} className="w-full [&_small]:hidden">
        <SelectValue>
          {(item: ImportOption<TValue> | null) => item?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option}>
              {option.description ? (
                <span className="flex min-w-0 flex-col items-start gap-px">
                  <span className="truncate font-medium">{option.label}</span>
                  <small className="text-muted-foreground truncate text-xs">
                    {option.description}
                  </small>
                </span>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function SummaryLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground min-w-0 text-right font-medium break-words">
        {value}
      </dd>
    </div>
  )
}

function SummarySection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="border-border/70 flex min-w-0 flex-col gap-3 rounded-md border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function FlagBadge({ flag }: { flag: keyof typeof FLAG_LABEL }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span
        className={cn("size-1.5 shrink-0 rounded-full", FLAG_TONE_CLASS[flag])}
        aria-hidden="true"
      />
      {FLAG_LABEL[flag]}
    </Badge>
  )
}

const VALIDATION_METRICS = [
  [`${VALIDATION_SUMMARY.valid.toLocaleString()} valid`, "bg-emerald-500"],
  [`${VALIDATION_SUMMARY.warnings} warnings`, "bg-amber-500"],
  [`${VALIDATION_SUMMARY.errors} errors`, "bg-rose-500"],
] satisfies [string, string][]

function getUploadFileLabel(files: FileWithPreview[]) {
  if (files.length === 0) return ""

  const firstFile = files[0]
  if (files.length === 1) return firstFile.file.name

  return `${firstFile.file.name} + ${files.length - 1} files`
}

function getFileKindLabel(file: FileWithPreview) {
  const type = file.file.type.toLowerCase()
  const name = file.file.name.toLowerCase()

  if (type.startsWith("image/")) return "Image"
  if (type === "application/pdf" || name.endsWith(".pdf")) return "PDF"
  if (
    type.includes("spreadsheet") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    return "Excel"
  }
  if (type.includes("csv") || name.endsWith(".csv")) return "CSV"

  return "File"
}

export function UploadStepFields({
  values,
  errors,
  onValueChange,
  onFileChange,
  onTargetChange,
}: {
  values: ImportValues
  errors: WizardErrors
  onValueChange: ImportValueChange
  onFileChange: (fileName: string) => void
  onTargetChange: (value: TargetObject) => void
}) {
  const [
    { files, isDragging, errors: uploadErrors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: IMPORT_FILE.maxFiles,
    maxSize: IMPORT_FILE.maxSize,
    accept: IMPORT_FILE.accept,
    multiple: true,
    initialFiles: IMPORT_FILE.initialFiles,
    onFilesChange: (nextFiles) => {
      onFileChange(getUploadFileLabel(nextFiles))
    },
  })

  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby="crm-6-upload-title"
    >
      <SectionHeading
        id="crm-6-upload-title"
        title="Upload Files"
        description="Add CRM exports and source assets."
      />

      <FieldGroup className="grid gap-5">
        <Field data-invalid={Boolean(errors.fileName)} className="gap-3">
          <FieldLabel htmlFor="crm-6-file-input">
            Source Files <RequiredMark />
          </FieldLabel>
          <input
            {...getInputProps({
              id: "crm-6-file-input",
              "aria-label": "Source files",
              "aria-describedby": "crm-6-upload-help",
            })}
            className="sr-only"
          />
          <Item
            render={
              <button
                id="crm-6-dropzone"
                type="button"
                aria-invalid={Boolean(errors.fileName)}
                aria-describedby="crm-6-upload-help"
              />
            }
            variant="outline"
            onClick={openFileDialog}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "min-h-40 flex-col items-center justify-center gap-3 border-dashed px-6 py-8 text-center",
              "hover:border-primary/60 hover:bg-muted/40",
              "aria-invalid:border-destructive",
              isDragging && "border-primary bg-primary/5"
            )}
          >
            <ItemMedia
              variant="icon"
              className={cn(
                "mx-auto size-auto",
                isDragging ? "text-primary" : "text-muted-foreground"
              )}
            >
              <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
            </ItemMedia>
            <ItemContent className="flex-none items-center gap-1">
              <ItemTitle className="justify-center">Drop Files</ItemTitle>
              <ItemDescription id="crm-6-upload-help" className="text-center">
                Browse or drag files here.
              </ItemDescription>
              <ItemDescription className="text-center">
                {IMPORT_FILE.acceptedTypesLabel}. Max{" "}
                {formatBytes(IMPORT_FILE.maxSize)} each.
              </ItemDescription>
            </ItemContent>
          </Item>
          {errors.fileName ? <FieldError>{errors.fileName}</FieldError> : null}
          {uploadErrors.length > 0 ? (
            <Alert variant="destructive">
              <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
              <AlertTitle>Upload blocked</AlertTitle>
              <AlertDescription>
                {uploadErrors.map((error, index) => (
                  <p key={`${error}-${index}`}>{error}</p>
                ))}
              </AlertDescription>
            </Alert>
          ) : null}
        </Field>

        {files.length > 0 ? (
          <ItemGroup className="gap-2" aria-label="Selected files">
            {files.map((file) => {
              const kind = getFileKindLabel(file)

              return (
                <Item
                  key={file.id}
                  variant="outline"
                  size="sm"
                  className="gap-3"
                >
                  <ItemMedia variant="icon" className="size-auto">
                    <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="max-w-full truncate">
                      {file.file.name}
                    </ItemTitle>
                    <ItemDescription className="flex flex-wrap items-center gap-1.5">
                      <span>{kind}</span>
                      <span
                        aria-hidden="true"
                        className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
                      />
                      <span>{formatBytes(file.file.size)}</span>
                      {kind === "CSV" ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
                          />
                          <span>{IMPORT_FILE.rowsLabel}</span>
                        </>
                      ) : null}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="gap-2">
                    <Badge variant="success-light">Ready</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeFile(file.id)}
                      aria-label={`Remove ${file.file.name}`}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
                    </Button>
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>
        ) : null}

        <Field className="gap-2">
          <FieldLabel htmlFor="crm-6-target">Import into</FieldLabel>
          <ImportSelectField<TargetObject>
            id="crm-6-target"
            value={values.target}
            options={TARGET_OPTIONS}
            placeholder="Select object"
            onValueChange={onTargetChange}
          />
        </Field>

        <Field orientation="horizontal" className="items-center gap-3">
          <Switch
            id="crm-6-header"
            checked={values.firstRowHeader}
            onCheckedChange={(checked) =>
              onValueChange("firstRowHeader", checked === true)
            }
          />
          <FieldContent>
            <FieldLabel htmlFor="crm-6-header">
              First row is a header
            </FieldLabel>
            <FieldDescription>
              Row 1 holds column names like Name, Email, Company.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
    </section>
  )
}

export function MapStepFields({
  values,
  errors,
  unmappedRequired,
  onMappingChange,
}: {
  values: ImportValues
  errors: WizardErrors
  unmappedRequired: ColumnMapping[]
  onMappingChange: (id: string, field: CrmField) => void
}) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="crm-6-map-title">
      <SectionHeading
        id="crm-6-map-title"
        title="Map Columns"
        description="Match each CSV column to a Contacts field."
      />

      {unmappedRequired.length > 0 ? (
        <Alert variant="warning">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
          <AlertTitle>Required field not mapped</AlertTitle>
          <AlertDescription>
            <p>
              {unmappedRequired.map((column) => column.source).join(", ")}{" "}
              {unmappedRequired.length === 1 ? "needs" : "need"} a target field
              before validation.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={Boolean(errors.mappings)} className="gap-3">
        <div className="overflow-x-auto rounded-md border">
          <Table
            aria-label="Column mapping"
            className="w-full min-w-[640px] table-auto"
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%]">CSV column</TableHead>
                <TableHead className="w-[26%]">Sample</TableHead>
                <TableHead>CRM field</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {values.mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="align-middle">
                    <span className="flex items-center gap-1.5 font-medium">
                      {mapping.source}
                      {mapping.required ? <RequiredMark /> : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground align-middle">
                    {mapping.sample}
                  </TableCell>
                  <TableCell className="align-middle">
                    <ImportSelectField<CrmField>
                      id={`crm-6-map-${mapping.id}`}
                      value={mapping.field}
                      options={CRM_FIELD_OPTIONS}
                      placeholder="Select field"
                      onValueChange={(value) =>
                        onMappingChange(mapping.id, value)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {errors.mappings ? <FieldError>{errors.mappings}</FieldError> : null}
      </Field>
    </section>
  )
}

export function PreviewStepFields({
  values,
  onValueChange,
}: {
  values: ImportValues
  onValueChange: ImportValueChange
}) {
  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby="crm-6-preview-title"
    >
      <SectionHeading
        id="crm-6-preview-title"
        title="Preview Rows"
        description="First 5 of 1,248 rows after mapping."
      />

      <FieldGroup className="grid gap-6">
        <Field className="gap-3">
          <div className="overflow-x-auto rounded-md border">
            <Table
              aria-label="Row preview"
              className="w-full min-w-[640px] table-auto"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[26%]">Full name</TableHead>
                  <TableHead className="w-[30%]">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Account
                  </TableHead>
                  <TableHead className="w-24 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PREVIEW_ROWS.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="align-middle font-medium">
                      {row.fullName}
                    </TableCell>
                    <TableCell className="text-muted-foreground align-middle">
                      {row.email || "Missing"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden align-middle sm:table-cell">
                      {row.account}
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <FlagBadge flag={row.flag} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Field>

        <div className="grid gap-2 sm:grid-cols-3">
          {VALIDATION_METRICS.map(([label, dotClassName]) => (
            <Item key={label} variant="outline" size="sm" className="gap-2">
              <span
                className={cn("size-1.5 shrink-0 rounded-full", dotClassName)}
                aria-hidden="true"
              />
              <ItemContent>
                <ItemTitle className="tabular-nums">{label}</ItemTitle>
              </ItemContent>
            </Item>
          ))}
        </div>

        <Field className="gap-2">
          <FieldLabel htmlFor="crm-6-key">Unique key</FieldLabel>
          <ImportSelectField<CrmField>
            id="crm-6-key"
            value={values.uniqueKey}
            options={UNIQUE_KEY_OPTIONS}
            placeholder="Select key"
            onValueChange={(value) => onValueChange("uniqueKey", value)}
          />
          <FieldDescription>
            Rows match existing contacts on this column.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </section>
  )
}

export function DuplicatesStepFields({
  values,
  onDuplicateChange,
}: {
  values: ImportValues
  onDuplicateChange: (value: DuplicateMode) => void
}) {
  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby="crm-6-duplicates-title"
    >
      <SectionHeading
        id="crm-6-duplicates-title"
        title="Duplicate Handling"
        description="36 rows match an existing contact by email."
      />

      <RadioGroup
        value={values.duplicateMode}
        onValueChange={(value) => {
          if (value) {
            onDuplicateChange(value as DuplicateMode)
          }
        }}
        aria-label="Duplicate handling"
      >
        <ItemGroup className="gap-2">
          {DUPLICATE_OPTIONS.map((option) => {
            const fieldId = `crm-6-duplicate-${option.value}`
            const isSelected = values.duplicateMode === option.value

            return (
              <Item
                key={option.value}
                variant="outline"
                size="sm"
                className={cn(
                  "hover:bg-muted/50 gap-3 transition-colors",
                  isSelected && "border-primary bg-primary/5"
                )}
              >
                <Field
                  orientation="horizontal"
                  className="w-full flex-wrap gap-3 sm:flex-nowrap"
                >
                  <RadioGroupItem id={fieldId} value={option.value} />
                  <FieldLabel
                    htmlFor={fieldId}
                    className="min-w-0 flex-1 items-start"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-medium">{option.label}</span>
                        <Badge
                          variant={
                            option.value === "create"
                              ? "warning-light"
                              : option.value === "update"
                                ? "info-light"
                                : "success-light"
                          }
                        >
                          {option.badge}
                        </Badge>
                      </span>
                      <span className="text-muted-foreground text-sm font-normal">
                        {option.description}
                      </span>
                    </span>
                  </FieldLabel>
                </Field>
              </Item>
            )
          })}
        </ItemGroup>
      </RadioGroup>
    </section>
  )
}

export function SummaryStepFields({
  values,
  duplicateLabel,
}: {
  values: ImportValues
  duplicateLabel: string
}) {
  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby="crm-6-summary-title"
    >
      <SectionHeading
        id="crm-6-summary-title"
        title="Run Import"
        description="Review the plan before it writes to the CRM."
      />

      <FieldGroup className="grid gap-6">
        <Alert variant="success">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
          <AlertTitle>Ready to import</AlertTitle>
          <AlertDescription>
            <p>
              {IMPORT_RESULT.imported.toLocaleString()} contacts import into the
              CRM, {IMPORT_RESULT.skipped} skipped, {IMPORT_RESULT.errors}{" "}
              errors held back.
            </p>
          </AlertDescription>
        </Alert>

        <SummarySection title="Import plan">
          <dl className="flex flex-col gap-2.5">
            <SummaryLine label="File" value={values.fileName || "Not set"} />
            <SummaryLine label="Object" value="Contacts" />
            <SummaryLine label="Unique key" value="Email" />
            <SummaryLine label="Duplicates" value={duplicateLabel} />
          </dl>
        </SummarySection>
      </FieldGroup>
    </section>
  )
}