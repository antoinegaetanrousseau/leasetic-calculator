"use client"

import { useState, type ComponentProps } from "react"

import { AuthPreviewPanel } from "./auth-preview-panel"
import { LoginForm } from "./login-form"

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>
type FormSubmitEvent = Parameters<FormSubmitHandler>[0]

export function Auth() {
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
  }

  return (
    <div className="mx-auto grid w-full max-w-[76rem] items-center justify-center gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,450px)] lg:gap-24 xl:grid-cols-[minmax(0,420px)_minmax(0,490px)] xl:gap-28">
      {/* Form */}
      <LoginForm
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword((current) => !current)}
        onSubmit={handleSubmit}
      />
      {/* Preview */}
      <AuthPreviewPanel />
    </div>
  )
}