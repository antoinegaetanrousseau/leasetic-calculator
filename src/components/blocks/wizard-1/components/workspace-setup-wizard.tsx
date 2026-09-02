import { useCallback, useMemo, useState, type FormEvent } from "react"
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper"
import { CheckIcon, LoaderCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  BILLING_CYCLE_OPTIONS,
  COUNTRY_OPTIONS,
  DEFAULT_WIZARD_VALUES,
  ROLE_OPTIONS,
  WIZARD_STEPS,
  type WizardOption,
  type WizardStepId,
  type WizardValues,
} from "./data"
import {
  CompletedStepFields,
  InformationStepFields,
  PaymentStepFields,
  type WizardErrors,
} from "./workspace-setup-steps"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"

function createDefaultValues(): WizardValues {
  return { ...DEFAULT_WIZARD_VALUES }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function getOptionLabel<T extends string>(
  options: WizardOption<T>[],
  value: T | ""
) {
  return options.find((option) => option.value === value)?.label ?? "Not set"
}

function getStepErrors(
  stepId: WizardStepId,
  values: WizardValues
): WizardErrors {
  const nextErrors: WizardErrors = {}

  if (stepId === "information") {
    if (!values.firstName.trim()) {
      nextErrors.firstName = "Enter the billing owner's first name."
    }

    if (!values.lastName.trim()) {
      nextErrors.lastName = "Enter the billing owner's last name."
    }

    if (!values.companyName.trim()) {
      nextErrors.companyName = "Enter the company name."
    }

    if (!isValidEmail(values.email)) {
      nextErrors.email = "Enter a valid contact email address."
    }
  }

  if (stepId === "payment") {
    if (!isValidEmail(values.billingEmail)) {
      nextErrors.billingEmail = "Enter a valid billing email address."
    }

    if (!values.billingCycle) {
      nextErrors.billingCycle = "Choose a billing cycle."
    }
  }

  return nextErrors
}

function getAllRequiredErrors(values: WizardValues) {
  return {
    ...getStepErrors("information", values),
    ...getStepErrors("payment", values),
  }
}

function getFirstInvalidStep(values: WizardValues) {
  if (Object.keys(getStepErrors("information", values)).length > 0) return 1
  if (Object.keys(getStepErrors("payment", values)).length > 0) return 2

  return null
}

export function WorkspaceSetupWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState<WizardValues>(createDefaultValues)
  const [errors, setErrors] = useState<WizardErrors>({})

  const currentStepConfig = useMemo(
    () =>
      WIZARD_STEPS.find((step) => step.step === currentStep) ?? WIZARD_STEPS[0],
    [currentStep]
  )

  const summary = useMemo(
    () => ({
      roleLabel: getOptionLabel(ROLE_OPTIONS, values.role),
      countryLabel: getOptionLabel(COUNTRY_OPTIONS, values.country),
      billingCycleLabel: getOptionLabel(
        BILLING_CYCLE_OPTIONS,
        values.billingCycle
      ),
    }),
    [values]
  )

  const handleValueChange = useCallback(
    (field: keyof WizardValues, value: WizardValues[keyof WizardValues]) => {
      setValues((current) => ({
        ...current,
        [field]: value,
      }))

      setErrors((current) => {
        if (!current[field]) {
          return current
        }

        const nextErrors = { ...current }
        delete nextErrors[field]
        return nextErrors
      })
    },
    []
  )

  const handleStepChange = useCallback(
    (nextStep: number) => {
      if (nextStep <= maxUnlockedStep) {
        setCurrentStep(nextStep)
      }
    },
    [maxUnlockedStep]
  )

  const handleBack = useCallback(() => {
    setCurrentStep((step) => Math.max(1, step - 1))
  }, [])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (currentStepConfig.id !== "completed") {
        const stepErrors = getStepErrors(currentStepConfig.id, values)

        if (Object.keys(stepErrors).length > 0) {
          setErrors((current) => ({ ...current, ...stepErrors }))
          return
        }

        const nextStep = Math.min(currentStep + 1, WIZARD_STEPS.length)
        setMaxUnlockedStep((step) => Math.max(step, nextStep))
        setCurrentStep(nextStep)
        return
      }

      const requiredErrors = getAllRequiredErrors(values)
      const invalidStep = getFirstInvalidStep(values)

      if (Object.keys(requiredErrors).length > 0 && invalidStep !== null) {
        setErrors(requiredErrors)
        setCurrentStep(invalidStep)
        return
      }

      setIsSubmitting(true)
      toast.success("Wizard completed", {
        description: `${values.companyName} is ready for ${summary.billingCycleLabel.toLowerCase()} billing.`,
      })
      setIsSubmitting(false)
    },
    [currentStep, currentStepConfig.id, summary.billingCycleLabel, values]
  )

  const isLastStep = currentStep === WIZARD_STEPS.length

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl flex-col"
      aria-label="Account payment setup wizard"
    >
      <Card>
        <Stepper
          value={currentStep}
          onValueChange={handleStepChange}
          indicators={{
            completed: <CheckIcon className="size-3.5" />,
            loading: <LoaderCircleIcon className="size-3.5 animate-spin" />,
          }}
          className="w-full space-y-3"
        >
          <CardHeader className="flex items-center py-1">
            <StepperNav aria-label="Wizard progress" className="items-center">
              {WIZARD_STEPS.map((step, index) => (
                <StepperItem
                  key={step.id}
                  step={step.step}
                  disabled={step.step > maxUnlockedStep}
                  loading={isSubmitting && step.step === currentStep}
                  className="relative"
                >
                  <StepperTrigger className="flex justify-start gap-1.5">
                    <StepperIndicator className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=completed]:bg-primary data-[state=inactive]:border-border data-[state=inactive]:bg-muted data-[state=inactive]:text-foreground data-[state=active]:before:border-primary relative isolate size-6 overflow-visible rounded-full before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-full before:border before:border-dashed before:border-transparent before:content-[''] data-[state=active]:border-0 data-[state=active]:before:animate-[spin_8s_linear_infinite] motion-reduce:data-[state=active]:before:animate-none">
                      {index + 1}
                    </StepperIndicator>
                    <StepperTitle className="group-data-[state=inactive]/step:text-foreground text-sm">
                      {step.title}
                    </StepperTitle>
                  </StepperTrigger>

                  {WIZARD_STEPS.length > index + 1 ? (
                    <StepperSeparator className="bg-border group-data-[state=completed]/step:bg-primary md:mx-2.5" />
                  ) : null}
                </StepperItem>
              ))}
            </StepperNav>
          </CardHeader>

          <Separator />

          <CardContent>
            <StepperPanel className="text-sm">
              {WIZARD_STEPS.map((step) => (
                <StepperContent key={step.id} value={step.step}>
                  {step.id === "information" ? (
                    <InformationStepFields
                      values={values}
                      errors={errors}
                      onValueChange={handleValueChange}
                    />
                  ) : null}

                  {step.id === "payment" ? (
                    <PaymentStepFields
                      values={values}
                      errors={errors}
                      onValueChange={handleValueChange}
                    />
                  ) : null}

                  {step.id === "completed" ? (
                    <CompletedStepFields values={values} summary={summary} />
                  ) : null}
                </StepperContent>
              ))}
            </StepperPanel>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={handleBack}>
                <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
                Previous Step
              </Button>
            ) : null}
            <Button type="submit">
              {isLastStep ? "Complete Setup" : "Next Step"}
              {!isLastStep ? (
                <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} data-icon="inline-end" aria-hidden="true" />
              ) : null}
            </Button>
          </CardFooter>
        </Stepper>
      </Card>
    </form>
  )
}