"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
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
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  DEFAULT_MAPPINGS,
  DUPLICATE_OPTIONS,
  IMPORT_FILE,
  IMPORT_RESULT,
  IMPORT_STEPS,
  type ColumnMapping,
  type CrmField,
  type DuplicateMode,
  type ImportStepId,
  type ImportValues,
  type TargetObject,
} from "./import-wizard-data"
import {
  DuplicatesStepFields,
  MapStepFields,
  PreviewStepFields,
  SummaryStepFields,
  UploadStepFields,
  type WizardErrors,
} from "./import-wizard-steps"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, Tick02Icon, Flag03Icon, ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"

function createDefaultValues(): ImportValues {
  return {
    fileName: IMPORT_FILE.initialLabel,
    target: "contacts",
    firstRowHeader: true,
    mappings: DEFAULT_MAPPINGS.map((mapping) => ({ ...mapping })),
    uniqueKey: "email",
    duplicateMode: "skip",
  }
}

function getUnmappedRequired(mappings: ColumnMapping[]) {
  return mappings.filter(
    (mapping) => mapping.required && mapping.field === "unmapped"
  )
}

function getStepErrors(stepId: ImportStepId, values: ImportValues) {
  const nextErrors: WizardErrors = {}

  if (stepId === "upload" && !values.fileName.trim()) {
    nextErrors.fileName = "Select source files to import."
  }

  if (stepId === "map" && getUnmappedRequired(values.mappings).length > 0) {
    nextErrors.mappings = "Map every required column before continuing."
  }

  return nextErrors
}

function getAllRequiredErrors(values: ImportValues) {
  return {
    ...getStepErrors("upload", values),
    ...getStepErrors("map", values),
  }
}

function getFirstInvalidStep(values: ImportValues) {
  if (Object.keys(getStepErrors("upload", values)).length > 0) return 1
  if (Object.keys(getStepErrors("map", values)).length > 0) return 2

  return null
}

function DotSeparator() {
  return (
    <span
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
      aria-hidden="true"
    />
  )
}

const TOAST_SUCCESS_ICON = (
  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="text-success size-4" aria-hidden="true" />
)

export function ImportWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState<ImportValues>(createDefaultValues)
  const [errors, setErrors] = useState<WizardErrors>({})

  const currentStepConfig = useMemo(
    () =>
      IMPORT_STEPS.find((step) => step.step === currentStep) ?? IMPORT_STEPS[0],
    [currentStep]
  )

  const unmappedRequired = useMemo(
    () => getUnmappedRequired(values.mappings),
    [values.mappings]
  )

  const duplicateLabel = useMemo(
    () =>
      DUPLICATE_OPTIONS.find((option) => option.value === values.duplicateMode)
        ?.label ?? "Skip existing",
    [values.duplicateMode]
  )

  const handleValueChange = useCallback(
    (field: keyof ImportValues, value: ImportValues[keyof ImportValues]) => {
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

  const handleFileChange = useCallback((fileName: string) => {
    setValues((current) => ({ ...current, fileName }))

    setErrors((current) => {
      if (!current.fileName) return current
      const nextErrors = { ...current }
      delete nextErrors.fileName
      return nextErrors
    })
  }, [])

  const handleTargetChange = useCallback((value: TargetObject) => {
    setValues((current) => ({ ...current, target: value }))
  }, [])

  const handleMappingChange = useCallback((id: string, field: CrmField) => {
    setValues((current) => ({
      ...current,
      mappings: current.mappings.map((mapping) =>
        mapping.id === id ? { ...mapping, field } : mapping
      ),
    }))

    setErrors((current) => {
      if (!current.mappings) return current
      const nextErrors = { ...current }
      delete nextErrors.mappings
      return nextErrors
    })
  }, [])

  const handleDuplicateChange = useCallback((value: DuplicateMode) => {
    setValues((current) => ({ ...current, duplicateMode: value }))
  }, [])

  const handleBack = useCallback(() => {
    setCurrentStep((step) => Math.max(1, step - 1))
  }, [])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (isSubmitting) {
        return
      }

      if (currentStepConfig.id !== "summary") {
        const stepErrors = getStepErrors(currentStepConfig.id, values)

        if (Object.keys(stepErrors).length > 0) {
          setErrors((current) => ({ ...current, ...stepErrors }))
          return
        }

        const nextStep = Math.min(currentStep + 1, IMPORT_STEPS.length)
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
      window.setTimeout(() => {
        setIsSubmitting(false)
        toast.success("Import started", {
          description: `${IMPORT_RESULT.imported.toLocaleString()} contacts queued · ${IMPORT_RESULT.skipped} skipped.`,
          icon: TOAST_SUCCESS_ICON,
        })
      }, 900)
    },
    [currentStep, currentStepConfig.id, isSubmitting, values]
  )

  const isLastStep = currentStep === IMPORT_STEPS.length
  const canGoBack = currentStep > 1 && !isSubmitting
  const fileLabel = values.fileName || "No file selected"
  const rowLabel = values.fileName ? IMPORT_FILE.rowsLabel : "Waiting for CSV"

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-3xl flex-col"
      aria-label="CSV import wizard"
    >
      <Stepper
        value={currentStep}
        onValueChange={setCurrentStep}
        indicators={{
          completed: (
            <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
          ),
          loading: <Spinner className="size-3.5" />,
        }}
        className="w-full"
      >
        <Frame stacked={true} className="w-full">
          <FrameHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-px">
                <FrameTitle>Import Wizard</FrameTitle>
                <FrameDescription className="inline-flex min-w-0 items-center gap-1.5 text-sm">
                  <span className="shrink-0">{fileLabel}</span>
                  <DotSeparator />
                  <span className="truncate">{rowLabel}</span>
                </FrameDescription>
              </div>
              <Badge variant="info-light">Contacts</Badge>
            </div>
          </FrameHeader>

          <FramePanel className="flex items-center overflow-x-auto">
            <StepperNav
              aria-label="Wizard progress"
              className="min-w-full items-center"
            >
              {IMPORT_STEPS.map((step, index) => (
                <StepperItem
                  key={step.id}
                  step={step.step}
                  loading={isSubmitting && step.step === currentStep}
                  className="relative min-w-0"
                >
                  <StepperTrigger
                    type="button"
                    className="min-w-0 justify-start gap-2 disabled:opacity-100"
                  >
                    <StepperIndicator className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=completed]:bg-primary data-[state=inactive]:border-border data-[state=inactive]:text-foreground data-[state=active]:before:border-primary relative isolate size-6 overflow-visible rounded-full border before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-full before:border before:border-dashed before:border-transparent before:content-[''] data-[state=active]:border-0 data-[state=active]:before:animate-[spin_8s_linear_infinite] motion-reduce:data-[state=active]:before:animate-none">
                      {index + 1}
                    </StepperIndicator>
                    <StepperTitle className="text-foreground hidden truncate text-sm capitalize sm:block">
                      {step.title}
                    </StepperTitle>
                  </StepperTrigger>

                  {IMPORT_STEPS.length > index + 1 ? (
                    <StepperSeparator className="bg-border group-data-[state=completed]/step:bg-primary mx-2" />
                  ) : null}
                </StepperItem>
              ))}
            </StepperNav>
          </FramePanel>

          <FramePanel>
            <StepperPanel className="text-sm">
              {IMPORT_STEPS.map((step) => (
                <StepperContent key={step.id} value={step.step}>
                  {step.id === "upload" ? (
                    <UploadStepFields
                      values={values}
                      errors={errors}
                      onValueChange={handleValueChange}
                      onFileChange={handleFileChange}
                      onTargetChange={handleTargetChange}
                    />
                  ) : null}

                  {step.id === "map" ? (
                    <MapStepFields
                      values={values}
                      errors={errors}
                      unmappedRequired={unmappedRequired}
                      onMappingChange={handleMappingChange}
                    />
                  ) : null}

                  {step.id === "preview" ? (
                    <PreviewStepFields
                      values={values}
                      onValueChange={handleValueChange}
                    />
                  ) : null}

                  {step.id === "duplicates" ? (
                    <DuplicatesStepFields
                      values={values}
                      onDuplicateChange={handleDuplicateChange}
                    />
                  ) : null}

                  {step.id === "summary" ? (
                    <SummaryStepFields
                      values={values}
                      duplicateLabel={duplicateLabel}
                    />
                  ) : null}
                </StepperContent>
              ))}
            </StepperPanel>
          </FramePanel>

          <FrameFooter className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FrameDescription className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
              <HugeiconsIcon icon={Flag03Icon} strokeWidth={2} className="size-4 shrink-0" aria-hidden="true" />
              {currentStepConfig.description}
            </FrameDescription>

            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              {canGoBack ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="shrink-0"
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
                  Back
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="shrink-0"
              >
                {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                {isLastStep ? "Import" : "Next Step"}
                {!isLastStep && !isSubmitting ? (
                  <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} data-icon="inline-end" aria-hidden="true" />
                ) : null}
              </Button>
            </div>
          </FrameFooter>
        </Frame>
      </Stepper>
    </form>
  )
}