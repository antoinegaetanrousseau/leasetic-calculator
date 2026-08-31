"use client"

import { useState } from "react"
import { useFileUpload } from "@/hooks/use-file-upload"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserCircleIcon, Image01Icon, Cancel01Icon, Upload01Icon } from "@hugeicons/core-free-icons"

interface ImageUploadFieldProps {
  ariaLabel: string
  inputId?: string
  variant?: "avatar" | "image"
  defaultImage?: string
  alt?: string
}

export function ImageUploadField({
  ariaLabel,
  inputId,
  variant = "image",
  defaultImage,
  alt = "Uploaded image",
}: ImageUploadFieldProps) {
  const [removedCurrentImage, setRemovedCurrentImage] = useState(false)
  const [{ files }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      accept: "image/*",
    })

  const currentFile = files[0] ?? null
  const hasSavedImage = Boolean(defaultImage) && !removedCurrentImage
  const previewUrl =
    currentFile?.preview ?? (hasSavedImage ? (defaultImage ?? null) : null)
  const fileName = currentFile?.file.name
  const hasImage = Boolean(previewUrl)

  const handleCancelUpload = () => {
    if (!currentFile) {
      return
    }

    removeFile(currentFile.id)
  }

  const handleRemoveImage = () => {
    if (currentFile) {
      removeFile(currentFile.id)
    }

    setRemovedCurrentImage(true)
  }

  return (
    <div className="flex grow flex-wrap items-center justify-start gap-2">
      <div className="relative">
        <Avatar
          className={cn(
            "size-10 border",
            variant === "avatar"
              ? "rounded-full"
              : "rounded-lg after:rounded-lg"
          )}
        >
          <AvatarImage
            src={previewUrl ?? undefined}
            alt={fileName ?? alt}
            className={cn(variant === "avatar" ? "rounded-full" : "rounded-lg")}
          />
          <AvatarFallback
            className={cn(
              "bg-muted text-muted-foreground",
              variant === "avatar" ? "rounded-full" : "rounded-lg"
            )}
          >
            {variant === "avatar" ? (
              <HugeiconsIcon icon={UserCircleIcon} strokeWidth={2} aria-hidden="true" className="size-4 opacity-60" />
            ) : (
              <HugeiconsIcon icon={Image01Icon} strokeWidth={2} aria-hidden="true" className="size-4 opacity-60" />
            )}
          </AvatarFallback>
        </Avatar>

        {currentFile ? (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={handleCancelUpload}
            className="absolute -top-1 -right-1 size-4 rounded-full"
            aria-label={`Cancel ${currentFile.file.name}`}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {/* Actions */}
      <div className="relative inline-flex">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openFileDialog}
          aria-haspopup="dialog"
        >
          <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} aria-hidden="true" />
          {hasImage ? "Change" : "Upload"}
        </Button>
        <input
          {...getInputProps({ id: inputId })}
          className="sr-only"
          aria-label={ariaLabel}
          tabIndex={-1}
        />
      </div>

      {hasImage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemoveImage}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
          Remove
        </Button>
      ) : null}
    </div>
  )
}