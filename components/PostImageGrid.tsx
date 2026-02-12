'use client'

import Image from 'next/image'
import { useState } from 'react'

interface PostImageGridProps {
  images: string[]
  postTitle: string
  maxImages?: number
}

/**
 * PostImageGrid - Displays images in a grid format for post listings
 * Shows up to 3 images per row, uniform square thumbnails
 * Includes preview modal on click
 */
export function PostImageGrid({ 
  images, 
  postTitle,
  maxImages = 3 
}: PostImageGridProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  if (!images || images.length === 0) {
    return null
  }

  // Limit displayed images to maxImages
  const displayImages = images.slice(0, maxImages)
  const hasMore = images.length > maxImages

  return (
    <>
      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-2 mt-3 rounded-lg overflow-hidden">
        {displayImages.map((imageUrl, index) => (
          <button
            key={`${imageUrl}-${index}`}
            onClick={() => setSelectedImageIndex(index)}
            className="relative w-full h-20 sm:h-24 bg-muted hover:opacity-75 transition-opacity overflow-hidden"
          >
            <Image
              src={imageUrl}
              alt={`${postTitle} - Image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 80px, 96px"
              unoptimized
            />
          </button>
        ))}

        {/* Remaining Images Counter */}
        {hasMore && (
          <div className="relative w-full h-20 sm:h-24 bg-muted/80 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground dark:text-white">
                +{images.length - maxImages}
              </p>
              <p className="text-xs text-muted-foreground dark:text-white/70">
                more
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Image */}
            <div className="relative w-full h-full bg-black rounded-lg overflow-hidden aspect-auto max-h-[80vh]">
              <Image
                src={images[selectedImageIndex]}
                alt={`${postTitle} - Image ${selectedImageIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
                unoptimized
              />
            </div>

            {/* Navigation and Info */}
            <div className="absolute bottom-0 left-0 right-0 text-white text-sm p-4 bg-gradient-to-t from-black/60 to-transparent">
              <p>
                Image {selectedImageIndex + 1} of {images.length}
              </p>
            </div>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setSelectedImageIndex((prev) =>
                      prev === 0 ? images.length - 1 : (prev ?? 0) - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 transition rounded-full p-2"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  onClick={() =>
                    setSelectedImageIndex((prev) =>
                      prev === images.length - 1 ? 0 : (prev ?? -1) + 1
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 transition rounded-full p-2"
                  aria-label="Next image"
                >
                  →
                </button>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 text-white hover:bg-white/20 transition rounded-full p-2"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
