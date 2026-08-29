import { useState } from "react"
import { useFileUpload } from "@/hooks/use-file-upload"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserCircleIcon, Cancel01Icon, Upload01Icon } from "@hugeicons/core-free-icons"

interface ProfilePhotoUploadProps {
  defaultAvatar: string
  alt: string
  inputId: string
}

export function ProfilePhotoUpload({
  defaultAvatar,
  alt,
  inputId,
}: ProfilePhotoUploadProps) {
  const [removedCurrentPhoto, setRemovedCurrentPhoto] = useState(false)
  const [{ files }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      accept: "image/*",
    })

  const currentFile = files[0] ?? null
  const hasSavedPhoto = Boolean(defaultAvatar) && !removedCurrentPhoto
  const previewUrl =
    currentFile?.preview ?? (hasSavedPhoto ? defaultAvatar : null)
  const hasPhoto = Boolean(previewUrl)

  const handleCancelUpload = () => {
    if (!currentFile) {
      return
    }

    removeFile(currentFile.id)
  }

  const handleRemovePhoto = () => {
    if (currentFile) {
      removeFile(currentFile.id)
    }

    setRemovedCurrentPhoto(true)
  }

  return (
    <div className="flex grow flex-wrap items-center justify-start gap-2">
      <div className="relative">
        <Avatar className="size-10">
          <AvatarImage src={previewUrl ?? undefined} alt={alt} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            <HugeiconsIcon icon={UserCircleIcon} strokeWidth={2} aria-hidden="true" className="size-4 opacity-60" />
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
          <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
          {hasPhoto ? "Change" : "Upload"}
        </Button>
        <input
          {...getInputProps({ id: inputId })}
          className="sr-only"
          aria-label="Upload profile photo"
          tabIndex={-1}
        />
      </div>

      {hasPhoto ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemovePhoto}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
          Remove
        </Button>
      ) : null}
    </div>
  )
}