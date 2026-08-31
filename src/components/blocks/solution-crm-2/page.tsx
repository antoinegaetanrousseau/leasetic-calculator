import { DealPipeline } from "./components/deal-pipeline"

export function Page() {
  return (
    <main
      className="bg-background flex min-h-svh w-full justify-center p-4 sm:p-6"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Deal Pipeline
      </h1>
      <DealPipeline />
    </main>
  )
}