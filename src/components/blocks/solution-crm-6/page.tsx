import { ImportWizard } from "./components/import-wizard"

export function Page() {
  return (
    <div className="bg-background text-foreground flex min-h-svh w-full items-start justify-center p-4 sm:p-6 lg:p-10">
      <ImportWizard />
    </div>
  )
}