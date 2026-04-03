'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Upload, AlertCircle, Plus, X } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface ImageUploadInputProps {
  onImagesSelected: (files: FileList) => void
  canAddMore: boolean
  remainingSlots: number
  error?: string
  images: Array<{ preview: string; file: File }>
  onRemove: (index: number) => void
}

export function ImageUploadInput({
  onImagesSelected,
  canAddMore,
  remainingSlots,
  error,
  images,
  onRemove,
}: ImageUploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files) {
      onImagesSelected(files)
      e.currentTarget.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-primary/5', 'border-primary')
    if (e.dataTransfer.files) {
      handleChange({ currentTarget: { files: e.dataTransfer.files, value: '' } } as any)
    }
  }

  const dragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      e.currentTarget.classList.add('bg-primary/5', 'border-primary')
    },
    onDragLeave: (e: React.DragEvent) => {
      e.currentTarget.classList.remove('bg-primary/5', 'border-primary')
    },
    onDrop: handleDrop,
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="image-upload" className="dark:text-white">
        Upload Images
      </Label>

      {images.length === 0 ? (
        /* Empty state — full drag-and-drop prompt */
        <div
          onClick={handleClick}
          {...dragHandlers}
          className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10"
        >
          <Upload className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground dark:text-white">
            Drag and drop images here or click to browse
          </p>
          <p className="text-xs text-muted-foreground dark:text-white/70">
            Up to 5 images per post • Max 5MB each • JPEG, PNG, GIF, WebP
          </p>
        </div>
      ) : (
        /* Filled state — thumbnail tray with + button */
        <div
          {...dragHandlers}
          className="border-2 border-dashed border-border rounded-lg p-3 flex items-center gap-3 transition-colors flex-wrap"
        >
          {images.map((image, index) => (
            <div
              key={`${image.file.name}-${index}`}
              className="relative flex-shrink-0 h-20 w-20 group"
            >
              <Image
                src={image.preview}
                alt={image.file.name}
                fill
                className="object-cover rounded-md"
                sizes="80px"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {canAddMore && (
            <button
              type="button"
              onClick={handleClick}
              className="flex-shrink-0 h-20 w-20 rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-6 w-6" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 dark:bg-red-900/20 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-md bg-blue-500/10 border border-blue-500/30 dark:bg-blue-900/20 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold">Privacy Notice:</span> Uploaded images are viewable by all community members. Do not upload personal or sensitive information.
        </p>
      </div>

      <input
        ref={inputRef}
        id="image-upload"
        type="file"
        multiple
        accept="image/*"
        onChange={handleChange}
        disabled={!canAddMore}
        className="hidden"
      />
    </div>
  )
}
