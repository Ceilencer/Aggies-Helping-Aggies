'use client'

import Image from 'next/image'
import { useState } from 'react'

interface PostImageDisplayProps {
  images: string[]
  postTitle: string
}

/**
 * PostImageDisplay - Displays images in full post view
 * Responsive width, maintains aspect ratio
 * Includes hover effects and preview modal for mobile
 */
export function PostImageDisplay({ images, postTitle }: PostImageDisplayProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  if (!images || images.length === 0) {
    return null
  }

  return (
    <>
      {/* Image Gallery */}
      <div className="space-y-3 my-4">
        {images.map((imageUrl, index) => (
          <button
            key={`${imageUrl}-${index}`}
            onClick={() => setSelectedImageIndex(index)}
            className="relative w-full rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
          >
            <div className="relative w-full h-64 sm:h-80 md:h-96 bg-muted">
              <Image
                src={imageUrl}
                alt={`${postTitle} - Image ${index + 1}`}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 85vw, 80vw"
                priority={index === 0}
                unoptimized
              />
            </div>
          </button>
        ))}
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
            <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
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
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) =>
                      prev === 0 ? images.length - 1 : (prev ?? 0) - 1
                    )
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 transition rounded-full p-2 text-2xl leading-none"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) =>
                      prev === images.length - 1 ? 0 : (prev ?? -1) + 1
                    )
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 transition rounded-full p-2 text-2xl leading-none"
                  aria-label="Next image"
                >
                  →
                </button>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 text-white hover:bg-white/20 transition rounded-full p-2 text-2xl leading-none"
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
