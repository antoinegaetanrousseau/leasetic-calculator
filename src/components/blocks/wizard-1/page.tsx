import { WorkspaceSetupWizard } from "./components/workspace-setup-wizard"

export function Page() {
  return (
    <main
      className="mx-auto flex min-h-svh w-full items-center justify-center p-6 sm:p-10 md:p-12"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Account payment setup wizard
      </h1>
      <WorkspaceSetupWizard />
    </main>
  )
}