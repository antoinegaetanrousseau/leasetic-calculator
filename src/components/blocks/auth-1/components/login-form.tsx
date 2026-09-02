import { type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { AuthLogo } from "./auth-logo"
import { AUTH_PROVIDERS } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewOffSlashIcon, ViewIcon } from "@hugeicons/core-free-icons"

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>
type FormSubmitEvent = Parameters<FormSubmitHandler>[0]

export function LoginForm({
  showPassword,
  onTogglePassword,
  onSubmit,
}: {
  showPassword: boolean
  onTogglePassword: () => void
  onSubmit: (event: FormSubmitEvent) => void
}) {
  return (
    <section
      data-auth-surface
      className="flex min-w-0 flex-col justify-between py-4 sm:py-6 lg:py-8"
    >
      {/* Heading */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto flex w-full max-w-90 flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <AuthLogo />

            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">
                Sign in to ReUI
              </h1>
              <p className="text-muted-foreground text-sm">Welcome back.</p>
            </div>
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <FieldGroup className="gap-3.5">
              <Field className="gap-2">
                <FieldLabel htmlFor="auth-1-identifier">
                  Email or username
                </FieldLabel>
                <Input
                  id="auth-1-identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Email or username"
                  className="bg-background"
                />
              </Field>

              <Field className="gap-2">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="auth-1-password">Password</FieldLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="text-muted-foreground h-auto p-0 text-xs font-normal"
                  >
                    Forgot password?
                  </Button>
                </div>

                <InputGroup className="bg-background w-full">
                  <InputGroupInput
                    id="auth-1-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      onClick={onTogglePassword}
                    >
                      {showPassword ? (
                        <HugeiconsIcon icon={ViewOffSlashIcon} strokeWidth={2} aria-hidden="true" className="size-4" />
                      ) : (
                        <HugeiconsIcon icon={ViewIcon} strokeWidth={2} aria-hidden="true" className="size-4" />
                      )}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs">
              Or continue with
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {AUTH_PROVIDERS.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="w-full"
              >
                {provider.logo}
                {provider.label}
              </Button>
            ))}
          </div>

          <p className="text-muted-foreground text-center text-sm">
            Need an account?{" "}
            <Button type="button" variant="link" className="h-auto p-0">
              Sign up
            </Button>
          </p>
        </div>
      </div>
    </section>
  )
}