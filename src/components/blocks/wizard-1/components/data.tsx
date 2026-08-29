export type WizardStepId = "information" | "payment" | "completed"
export type WizardRole =
  | "procurement-owner"
  | "finance-admin"
  | "operations-lead"
export type WizardCountry = "us" | "ca" | "gb" | "de" | "uz"
export type BillingCycle = "monthly" | "quarterly" | "annual"

export interface WizardStep {
  id: WizardStepId
  step: number
  title: string
  description: string
}

export interface WizardOption<T extends string = string> {
  value: T
  label: string
  description?: string
}

export interface WizardValues {
  firstName: string
  lastName: string
  companyName: string
  publicHandle: string
  role: WizardRole | ""
  country: WizardCountry | ""
  email: string
  mobile: string
  billingEmail: string
  billingCycle: BillingCycle | ""
  taxId: string
  poNumber: string
  spendLimit: string
  receiptCopies: string
  billingAlerts: boolean
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "information",
    step: 1,
    title: "Information",
    description: "Profile, company, and contact details.",
  },
  {
    id: "payment",
    step: 2,
    title: "Payment",
    description: "Billing owner and controls.",
  },
  {
    id: "completed",
    step: 3,
    title: "Completed",
    description: "Review the setup before activation.",
  },
]

export const ROLE_OPTIONS: WizardOption<WizardRole>[] = [
  {
    value: "procurement-owner",
    label: "Procurement owner",
    description: "Owns purchasing, approvals, and renewal routing.",
  },
  {
    value: "finance-admin",
    label: "Finance admin",
    description: "Manages payment settings and invoice delivery.",
  },
  {
    value: "operations-lead",
    label: "Operations lead",
    description: "Coordinates setup, seats, and support handoff.",
  },
]

export const COUNTRY_OPTIONS: WizardOption<WizardCountry>[] = [
  {
    value: "us",
    label: "United States",
  },
  {
    value: "ca",
    label: "Canada",
  },
  {
    value: "gb",
    label: "United Kingdom",
  },
  {
    value: "de",
    label: "Germany",
  },
  {
    value: "uz",
    label: "Uzbekistan",
  },
]

export const BILLING_CYCLE_OPTIONS: WizardOption<BillingCycle>[] = [
  {
    value: "monthly",
    label: "Monthly",
    description: "Best for short pilots and flexible seat counts.",
  },
  {
    value: "quarterly",
    label: "Quarterly",
    description: "Matches most operating budget reviews.",
  },
  {
    value: "annual",
    label: "Annual",
    description: "Preferred for contracted production rollouts.",
  },
]

export const DEFAULT_WIZARD_VALUES: WizardValues = {
  firstName: "Mara",
  lastName: "Chen",
  companyName: "Kepler Works",
  publicHandle: "kepler-works",
  role: "procurement-owner",
  country: "us",
  email: "mara@kepler.works",
  mobile: "+1 415 5151",
  billingEmail: "billing@kepler.works",
  billingCycle: "quarterly",
  taxId: "US-2849-771",
  poNumber: "PO-2026-184",
  spendLimit: "25000",
  receiptCopies: "receipts@kepler.works",
  billingAlerts: true,
}