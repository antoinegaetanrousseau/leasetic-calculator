import { useEffect, useState } from "react"

import { ContactsGridView } from "./components/contacts-grid"

export function Page() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => setIsReady(true), [])

  return (
    <main
      className="mx-auto flex min-h-svh w-full max-w-7xl items-start justify-center p-8 pt-12"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        CRM contacts directory
      </h1>
      {isReady ? (
        <ContactsGridView />
      ) : (
        <div className="bg-background min-h-svh w-full" aria-hidden="true" />
      )}
    </main>
  )
}