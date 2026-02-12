'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImagePreviewProps {
  images: Array<{
    preview: string
    file: File
  }>
  onRemove: (index: number) => void
}

export function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  if (images.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-foreground dark:text-white">
        Selected Images ({images.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={`${image.file.name}-${index}`}
            className="relative group"
          >
            {/* Image Container */}
            <div className="relative w-full h-24 sm:h-32 bg-muted rounded-lg overflow-hidden border border-border">
              <Image
                src={image.preview}
                alt={image.file.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 hover:bg-red-500/20 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* File Name Tooltip */}
            <p className="text-xs text-muted-foreground dark:text-white/70 mt-1 truncate">
              {image.file.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
