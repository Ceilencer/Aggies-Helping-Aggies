'use client'

import Image from 'next/image'
import { useState } from 'react'

interface PostImageGridProps {
  images: string[]
  postTitle: string
  className?: string
}

// Extracted so useState can be called at the top level of a component (rules of hooks)
function SingleImageTile({ src, alt, onOpen }: { src: string; alt: string; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <button
      onClick={onOpen}
      className="relative w-full overflow-hidden bg-muted group aspect-[4/3] max-h-[480px]"
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-contain transition-opacity duration-300 group-hover:opacity-90 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        sizes="(max-width: 768px) 100vw, 700px"
        onLoad={() => setLoaded(true)}
      />
    </button>
  )
}

function Tile({
  src,
  alt,
  className = '',
  sizes,
  overlay,
  onOpen,
}: {
  src: string
  alt: string
  className?: string
  sizes: string
  overlay?: React.ReactNode
  onOpen: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <button
      onClick={onOpen}
      className={`relative overflow-hidden bg-muted group ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-300 group-hover:opacity-90 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
      />
      {overlay}
    </button>
  )
}

export function PostImageGrid({ images, postTitle, className = 'mt-3 overflow-hidden rounded-lg border border-border' }: PostImageGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!images || images.length === 0) return null

  const count = images.length
  const visibleCount = Math.min(count, 5)
  const hiddenCount = count - visibleCount

  const tile = (index: number, cls: string, sizes: string) => (
    <Tile
      key={index}
      src={images[index]}
      alt={`${postTitle} — image ${index + 1}`}
      className={cls}
      sizes={sizes}
      overlay={index === visibleCount - 1 && hiddenCount > 0 ? (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none select-none">
          <span className="text-white text-2xl font-bold">+{hiddenCount}</span>
        </div>
      ) : undefined}
      onOpen={() => setSelectedIndex(index)}
    />
  )

  let grid: React.ReactNode

  if (count === 1) {
    grid = (
      <SingleImageTile
        src={images[0]}
        alt={`${postTitle} — image 1`}
        onOpen={() => setSelectedIndex(0)}
      />
    )
  } else if (count === 2) {
    grid = (
      <div className="flex gap-0.5 aspect-[16/9]">
        {tile(0, 'flex-1 h-full', '(max-width: 768px) 50vw, 350px')}
        {tile(1, 'flex-1 h-full', '(max-width: 768px) 50vw, 350px')}
      </div>
    )
  } else if (count === 3) {
    grid = (
      <div className="flex gap-0.5 aspect-[16/9]">
        {tile(0, 'flex-[2] h-full', '(max-width: 768px) 66vw, 460px')}
        <div className="flex-1 flex flex-col gap-0.5">
          {tile(1, 'flex-1 w-full', '(max-width: 768px) 33vw, 230px')}
          {tile(2, 'flex-1 w-full', '(max-width: 768px) 33vw, 230px')}
        </div>
      </div>
    )
  } else if (count === 4) {
    grid = (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 aspect-[4/3]">
        {tile(0, 'h-full', '(max-width: 768px) 50vw, 350px')}
        {tile(1, 'h-full', '(max-width: 768px) 50vw, 350px')}
        {tile(2, 'h-full', '(max-width: 768px) 50vw, 350px')}
        {tile(3, 'h-full', '(max-width: 768px) 50vw, 350px')}
      </div>
    )
  } else {
    grid = (
      <div className="flex flex-col gap-0.5">
        <div className="flex gap-0.5 aspect-[3/1]">
          {tile(0, 'flex-1 h-full', '(max-width: 768px) 50vw, 350px')}
          {tile(1, 'flex-1 h-full', '(max-width: 768px) 50vw, 350px')}
        </div>
        <div className="flex gap-0.5 aspect-[4/1]">
          {tile(2, 'flex-1 h-full', '(max-width: 768px) 33vw, 230px')}
          {tile(3, 'flex-1 h-full', '(max-width: 768px) 33vw, 230px')}
          {tile(4, 'flex-1 h-full', '(max-width: 768px) 33vw, 230px')}
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
