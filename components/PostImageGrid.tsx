'use client'

import Image from 'next/image'
import { useState } from 'react'

interface PostImageGridProps {
  images: string[]
  postTitle: string
  className?: string
}

export function PostImageGrid({ images, postTitle, className = 'mt-3 overflow-hidden rounded-lg border border-border' }: PostImageGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!images || images.length === 0) return null

  const count = images.length
  // Show at most 5 tiles; anything beyond is collapsed into a "+N" overlay on the 5th tile.
  const visibleCount = Math.min(count, 5)
  const hiddenCount = count - visibleCount

  // A single image tile. The button is positioned (relative) so the fill Image renders correctly.
  const Tile = ({
    index,
    className = '',
    sizes,
  }: {
    index: number
    className?: string
    sizes: string
  }) => (
    <button
      onClick={() => setSelectedIndex(index)}
      className={`relative overflow-hidden bg-muted group ${className}`}
    >
      <Image
        src={images[index]}
        alt={`${postTitle} — image ${index + 1}`}
        fill
        className="object-cover transition-opacity duration-200 group-hover:opacity-90"
        sizes={sizes}
        unoptimized
      />
      {/* "+N" overlay on the last visible tile when images are hidden */}
      {index === visibleCount - 1 && hiddenCount > 0 && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none select-none">
          <span className="text-white text-2xl font-bold">+{hiddenCount}</span>
        </div>
      )}
    </button>
  )

  let grid: React.ReactNode

  if (count === 1) {
    // Single image: full width, natural aspect ratio capped at 480px tall
    grid = (
      <button
        onClick={() => setSelectedIndex(0)}
        className="flex items-center w-full overflow-hidden max-h-[480px] group bg-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt={`${postTitle} — image 1`}
          className="w-full h-auto block transition-opacity duration-200 group-hover:opacity-90"
          loading="lazy"
        />
      </button>
    )
  } else if (count === 2) {
    // Two images: side by side, equal width
    grid = (
      <div className="flex gap-0.5 h-64">
        <Tile index={0} className="flex-1 h-full" sizes="(max-width: 768px) 50vw, 350px" />
        <Tile index={1} className="flex-1 h-full" sizes="(max-width: 768px) 50vw, 350px" />
      </div>
    )
  } else if (count === 3) {
    // Three images: large on left (2/3), two stacked on right (1/3)
    grid = (
      <div className="flex gap-0.5 h-64">
        <Tile index={0} className="flex-[2] h-full" sizes="(max-width: 768px) 66vw, 460px" />
        <div className="flex-1 flex flex-col gap-0.5">
          <Tile index={1} className="flex-1 w-full" sizes="(max-width: 768px) 33vw, 230px" />
          <Tile index={2} className="flex-1 w-full" sizes="(max-width: 768px) 33vw, 230px" />
        </div>
      </div>
    )
  } else if (count === 4) {
    // Four images: 2×2 grid
    grid = (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-80">
        <Tile index={0} className="h-full" sizes="(max-width: 768px) 50vw, 350px" />
        <Tile index={1} className="h-full" sizes="(max-width: 768px) 50vw, 350px" />
        <Tile index={2} className="h-full" sizes="(max-width: 768px) 50vw, 350px" />
        <Tile index={3} className="h-full" sizes="(max-width: 768px) 50vw, 350px" />
      </div>
    )
  } else {
    // 5+ images: two large on top, three smaller on bottom (5th tile gets "+N" overlay)
    grid = (
      <div className="flex flex-col gap-0.5">
        <div className="flex gap-0.5 h-56">
          <Tile index={0} className="flex-1 h-full" sizes="(max-width: 768px) 50vw, 350px" />
          <Tile index={1} className="flex-1 h-full" sizes="(max-width: 768px) 50vw, 350px" />
        </div>
        <div className="flex gap-0.5 h-40">
          <Tile index={2} className="flex-1 h-full" sizes="(max-width: 768px) 33vw, 230px" />
          <Tile index={3} className="flex-1 h-full" sizes="(max-width: 768px) 33vw, 230px" />
          <Tile index={4} className="flex-1 h-full" sizes="(max-width: 768px) 33vw, 230px" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={className}>
        {grid}
      </div>

      {/* Full-screen lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <div
            className="relative w-full max-w-5xl h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={images[selectedIndex]}
              alt={`${postTitle} — image ${selectedIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              unoptimized
            />

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full pointer-events-none select-none">
              {selectedIndex + 1} / {count}
            </div>

            {/* Prev */}
            {count > 1 && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  setSelectedIndex(i => (i === 0 ? count - 1 : (i ?? 0) - 1))
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-3 text-lg leading-none transition-colors"
                aria-label="Previous image"
              >
                ←
              </button>
            )}

            {/* Next */}
            {count > 1 && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  setSelectedIndex(i => (i === count - 1 ? 0 : (i ?? -1) + 1))
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-3 text-lg leading-none transition-colors"
                aria-label="Next image"
              >
                →
              </button>
            )}

            {/* Close */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-2 right-2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 text-lg leading-none transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
