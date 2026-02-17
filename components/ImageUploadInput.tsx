'use client'

import { useRef } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { useImageUpload } from '@/lib/hooks/useImageUpload'

interface ImageUploadInputProps {
  onImagesSelected: (files: FileList) => void
  canAddMore: boolean
  remainingSlots: number
  error?: string
}

export function ImageUploadInput({
  onImagesSelected,
  canAddMore,
  remainingSlots,
  error,
}: ImageUploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files) {
      onImagesSelected(files)
      // Reset input so same file can be selected again
      e.currentTarget.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="image-upload" className="dark:text-white">
        Upload Images
      </Label>
      
      {/* Drag and Drop Area */}
      <div
        onClick={handleClick}
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('bg-primary/5', 'border-primary')
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-primary/5', 'border-primary')
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('bg-primary/5', 'border-primary')
          if (e.dataTransfer.files) {
            handleChange({
              currentTarget: { files: e.dataTransfer.files, value: '' },
            } as any)
          }
        }}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10"
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground dark:text-white">
          Drag and drop images here or click to browse
        </p>
        <p className="text-xs text-muted-foreground dark:text-white/70 mt-1">
          Up to 5 images per post • Max 5MB each • JPEG, PNG, GIF, WebP
        </p>
        {canAddMore && (
          <p className="text-xs text-primary dark:text-blue-400 mt-1 font-medium">
            {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
          </p>
        )}
        {!canAddMore && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 font-medium">
            Maximum images reached
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 dark:bg-red-900/20 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Privacy Disclaimer */}
      <div className="rounded-md bg-blue-500/10 border border-blue-500/30 dark:bg-blue-900/20 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold">Privacy Notice:</span> Uploaded images are viewable by all community members. Do not upload personal or sensitive information.
        </p>
      </div>

      {/* Hidden Input */}
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
