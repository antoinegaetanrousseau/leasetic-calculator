import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { AccessReviewAlert } from "./access-review-alert"
import { BillingSeatSelectionCards } from "./billing-seat-selection-cards"
import { DIGEST_OPTIONS, WORKSPACE_IDENTITY } from "./data"
import {
  BillingAmountField,
  BillingApproversCombobox,
  ProfileAdvancedSelectField,
} from "./profile-form-fields"
import { BillingSummaryFrame } from "./profile-summary-frames"
import { SettingRow } from "./setting-row"

export function BillingTabContent() {
  return (
    <div className="space-y-4">
      <AccessReviewAlert />

      <Frame spacing="sm">
        <FrameHeader>
          <FrameTitle className="capitalize">Billing setup</FrameTitle>
          <FrameDescription>Plan, seats, and invoices.</FrameDescription>
        </FrameHeader>

        <FramePanel className="p-0!">
          <FieldGroup className="gap-0">
            <SettingRow
              title="Current plan"
              description="Includes scale, audit, and admin tools."
              titleAddon={
                <Badge variant="primary-light" size="sm">
                  Current
                </Badge>
              }
            >
              <div className="flex w-full flex-col items-end justify-end text-right">
                <span className="text-sm font-medium">$149 / workspace</span>
                <span className="text-muted-foreground text-sm">
                  Billed monthly
                </span>
              </div>
            </SettingRow>

            <SettingRow
              title="Billing owner"
              description="Primary approver for plan changes."
              labelFor="billing-owner"
            >
              <Input
                id="billing-owner"
                defaultValue={WORKSPACE_IDENTITY.billingOwner}
              />
            </SettingRow>

            <SettingRow
              title="Invoice approvers"
              description="Users who approve plan changes."
            >
              <BillingApproversCombobox />
            </SettingRow>

            <SettingRow title="Invoice email" labelFor="billing-email">
              <Input
                id="billing-email"
                defaultValue={WORKSPACE_IDENTITY.invoiceEmail}
              />
            </SettingRow>

            <SettingRow title="Cost center" labelFor="billing-cost-center">
              <Input
                id="billing-cost-center"
                defaultValue={WORKSPACE_IDENTITY.costCenter}
              />
            </SettingRow>

            <SettingRow
              title="Seat selection"
              description="Set team capacity."
              stacked
              contentClassName="@md/field-group:max-w-none"
              last
            >
              <BillingSeatSelectionCards />
            </SettingRow>
          </FieldGroup>
        </FramePanel>

        <FrameFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline">
            Manage plan
          </Button>
          <Button type="button">Update billing</Button>
        </FrameFooter>
      </Frame>

      <Frame spacing="sm">
        <FrameHeader>
          <FrameTitle className="capitalize">Billing controls</FrameTitle>
          <FrameDescription>Approval and renewal rules.</FrameDescription>
        </FrameHeader>

        <FramePanel className="p-0!">
          <FieldGroup className="gap-0">
            <SettingRow
              title="Auto-add seats"
              description="Add seats when invites exceed your cap."
              labelFor="billing-auto-add-seats"
              compact
            >
              <Switch id="billing-auto-add-seats" />
            </SettingRow>

            <SettingRow
              title="Purchase order required"
              description="Hold invoice changes until a PO is present."
              labelFor="billing-po-required"
              compact
            >
              <Switch id="billing-po-required" defaultChecked />
            </SettingRow>

            <SettingRow
              title="Approval threshold"
              description="Invoices above this need approval."
              compact
            >
              <BillingAmountField id="billing-approval-threshold" />
            </SettingRow>

            <SettingRow title="Invoice reminders" compact last>
              <ProfileAdvancedSelectField
                id="billing-reminders"
                options={DIGEST_OPTIONS}
                defaultValue={DIGEST_OPTIONS[2]}
              />
            </SettingRow>
          </FieldGroup>
        </FramePanel>

        <FrameFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline">
            Review approvals
          </Button>
          <Button type="button" variant="outline">
            Review plans
          </Button>
        </FrameFooter>
      </Frame>

      <BillingSummaryFrame />
    </div>
  )
}