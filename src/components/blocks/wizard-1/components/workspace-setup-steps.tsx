import type { ReactNode } from "react"
import { Badge } from "@/components/reui/badge"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
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
  BILLING_CYCLE_OPTIONS,
  COUNTRY_OPTIONS,
  ROLE_OPTIONS,
  type BillingCycle,
  type WizardCountry,
  type WizardOption,
  type WizardRole,
  type WizardValues,
} from "./data"

export type WizardErrors = Partial<Record<keyof WizardValues, string>>

type WizardValueChange = (
  field: keyof WizardValues,
  value: WizardValues[keyof WizardValues]
) => void

interface WizardSummary {
  roleLabel: string
  countryLabel: string
  billingCycleLabel: string
}

function RequiredMark() {
  return <span className="text-destructive">*</span>
}

function WizardSelectField<T extends string>({
  id,
  value,
  options,
  placeholder,
  onValueChange,
}: {
  id: string
  value: T | ""
  options: WizardOption<T>[]
  placeholder: string
  onValueChange: (value: T) => void
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
          {(item: WizardOption<T> | null) => item?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option}>
              {option.description ? (
                <span className="flex w-full max-w-[calc(var(--anchor-width)-3rem)] min-w-0 flex-col gap-px">
                  <span className="w-full truncate font-medium">
                    {option.label}
                  </span>
                  <small className="text-muted-foreground w-full truncate text-xs">
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
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={[
        "border-border/70 flex min-w-0 flex-col gap-3 rounded-lg border p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function SummaryStatus({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-foreground text-sm font-medium">{value}</dd>
    </div>
  )
}

export function InformationStepFields({
  values,
  errors,
  onValueChange,
}: {
  values: WizardValues
  errors: WizardErrors
  onValueChange: WizardValueChange
}) {
  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="wizard-info-title"
    >
      <div className="flex flex-col gap-1">
        <h2 id="wizard-info-title" className="text-base font-semibold">
          Your Information
        </h2>
        <p className="text-muted-foreground text-sm">Billing owner details.</p>
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.firstName)} className="gap-2">
          <FieldLabel htmlFor="wizard-first-name">
            First Name <RequiredMark />
          </FieldLabel>
          <Input
            id="wizard-first-name"
            value={values.firstName}
            onChange={(event) => onValueChange("firstName", event.target.value)}
            aria-invalid={Boolean(errors.firstName)}
            autoComplete="given-name"
          />
          {errors.firstName ? (
            <FieldError>{errors.firstName}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(errors.lastName)} className="gap-2">
          <FieldLabel htmlFor="wizard-last-name">
            Last Name <RequiredMark />
          </FieldLabel>
          <Input
            id="wizard-last-name"
            value={values.lastName}
            onChange={(event) => onValueChange("lastName", event.target.value)}
            aria-invalid={Boolean(errors.lastName)}
            autoComplete="family-name"
          />
          {errors.lastName ? <FieldError>{errors.lastName}</FieldError> : null}
        </Field>

        <Field data-invalid={Boolean(errors.companyName)} className="gap-2">
          <FieldLabel htmlFor="wizard-company-name">
            Company <RequiredMark />
          </FieldLabel>
          <Input
            id="wizard-company-name"
            value={values.companyName}
            onChange={(event) =>
              onValueChange("companyName", event.target.value)
            }
            aria-invalid={Boolean(errors.companyName)}
            autoComplete="organization"
          />
          {errors.companyName ? (
            <FieldError>{errors.companyName}</FieldError>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="wizard-public-handle">Public Handle</FieldLabel>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>@</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="wizard-public-handle"
              value={values.publicHandle}
              onChange={(event) =>
                onValueChange("publicHandle", event.target.value)
              }
              autoComplete="off"
            />
          </InputGroup>
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="wizard-role">Role</FieldLabel>
          <WizardSelectField<WizardRole>
            id="wizard-role"
            value={values.role}
            options={ROLE_OPTIONS}
            placeholder="Select role"
            onValueChange={(value) => onValueChange("role", value)}
          />
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="wizard-country">Country</FieldLabel>
          <WizardSelectField<WizardCountry>
            id="wizard-country"
            value={values.country}
            options={COUNTRY_OPTIONS}
            placeholder="Select country"
            onValueChange={(value) => onValueChange("country", value)}
          />
        </Field>

        <Field data-invalid={Boolean(errors.email)} className="gap-2">
          <FieldLabel htmlFor="wizard-email">
            Email Address <RequiredMark />
          </FieldLabel>
          <Input
            id="wizard-email"
            value={values.email}
            onChange={(event) => onValueChange("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            type="email"
            autoComplete="email"
          />
          <FieldDescription>Receipts go here.</FieldDescription>
          {errors.email ? <FieldError>{errors.email}</FieldError> : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="wizard-mobile">Mobile</FieldLabel>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>US</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="wizard-mobile"
              value={values.mobile}
              onChange={(event) => onValueChange("mobile", event.target.value)}
              autoComplete="tel"
            />
          </InputGroup>
        </Field>
      </FieldGroup>
    </section>
  )
}

export function PaymentStepFields({
  values,
  errors,
  onValueChange,
}: {
  values: WizardValues
  errors: WizardErrors
  onValueChange: WizardValueChange
}) {
  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="wizard-payment-title"
    >
      <div className="flex flex-col gap-1">
        <h2 id="wizard-payment-title" className="text-base font-semibold">
          Payment Details
        </h2>
        <p className="text-muted-foreground text-sm">Billing controls.</p>
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.billingEmail)} className="gap-2">
          <FieldLabel htmlFor="wizard-billing-email">
            Billing Email <RequiredMark />
          </FieldLabel>
          <Input
            id="wizard-billing-email"
            value={values.billingEmail}
            onChange={(event) =>
              onValueChange("billingEmail", event.target.value)
            }
            aria-invalid={Boolean(errors.billingEmail)}
            type="email"
            autoComplete="email"
          />
          {errors.billingEmail ? (
            <FieldError>{errors.billingEmail}</FieldError>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="wizard-receipt-copies">
            Receipt Copies
          </FieldLabel>
          <Input
            id="wizard-receipt-copies"
            value={values.receiptCopies}
            onChange={(event) =>
              onValueChange("receiptCopies", event.target.value)
            }
            type="email"
          />
        </Field>

        <Field data-invalid={Boolean(errors.billingCycle)} className="gap-2">
          <FieldLabel htmlFor="wizard-billing-cycle">
            Billing Cycle <RequiredMark />
          </FieldLabel>
          <WizardSelectField<BillingCycle>
            id="wizard-billing-cycle"
            value={values.billingCycle}
            options={BILLING_CYCLE_OPTIONS}
            placeholder="Select cycle"
            onValueChange={(value) => onValueChange("billingCycle", value)}
          />
          {errors.billingCycle ? (
            <FieldError>{errors.billingCycle}</FieldError>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="wizard-tax-id">Tax ID</FieldLabel>
          <Input
            id="wizard-tax-id"
            value={values.taxId}
            onChange={(event) => onValueChange("taxId", event.target.value)}
          />
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="wizard-po-number">PO Number</FieldLabel>
          <Input
            id="wizard-po-number"
            value={values.poNumber}
            onChange={(event) => onValueChange("poNumber", event.target.value)}
          />
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="wizard-spend-limit">Spend Limit</FieldLabel>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>$</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="wizard-spend-limit"
              value={values.spendLimit}
              onChange={(event) =>
                onValueChange("spendLimit", event.target.value)
              }
              inputMode="numeric"
            />
          </InputGroup>
        </Field>

        <label
          htmlFor="wizard-billing-alerts"
          className="flex cursor-pointer flex-col gap-0.5 sm:col-span-2"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="text-sm font-medium">Billing alerts</span>
            <Switch
              id="wizard-billing-alerts"
              checked={values.billingAlerts}
              onCheckedChange={(checked) =>
                onValueChange("billingAlerts", checked)
              }
              size="sm"
            />
          </span>
          <span className="text-muted-foreground text-xs">
            Send renewal and receipt reminders
          </span>
        </label>
      </FieldGroup>
    </section>
  )
}

export function CompletedStepFields({
  values,
  summary,
}: {
  values: WizardValues
  summary: WizardSummary
}) {
  return (
    <section
      className="flex flex-col gap-5"
      aria-labelledby="wizard-completed-title"
    >
      <div className="flex flex-col gap-1">
        <h2 id="wizard-completed-title" className="text-base font-semibold">
          Ready To Complete
        </h2>
        <p className="text-muted-foreground text-sm">
          Confirm before activation.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummarySection title="Account">
          <dl className="flex flex-col gap-2.5">
            <SummaryLine
              label="Owner"
              value={`${values.firstName} ${values.lastName}`.trim()}
            />
            <SummaryLine label="Company" value={values.companyName} />
            <SummaryLine label="Handle" value={`@${values.publicHandle}`} />
            <SummaryLine label="Role" value={summary.roleLabel} />
          </dl>
        </SummarySection>

        <SummarySection title="Billing">
          <dl className="flex flex-col gap-2.5">
            <SummaryLine label="Email" value={values.billingEmail} />
            <SummaryLine label="Cycle" value={summary.billingCycleLabel} />
            <SummaryLine
              label="Limit"
              value={values.spendLimit ? `$${values.spendLimit}` : "Not set"}
            />
          </dl>
        </SummarySection>

        <SummarySection title="Activation" className="sm:col-span-2">
          <dl className="grid gap-3 sm:grid-cols-2">
            <SummaryStatus label="Country" value={summary.countryLabel} />
            <SummaryStatus
              label="Billing alerts"
              value={
                values.billingAlerts ? (
                  <Badge variant="success-light">Enabled</Badge>
                ) : (
                  "Disabled"
                )
              }
            />
          </dl>
        </SummarySection>
      </div>
    </section>
  )
}