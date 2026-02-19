'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import CreatePostForm from '@/components/CreatePostForm'

export default function CreatePostPage() {
  const searchParams = useSearchParams()
  const initialChannelSlug = searchParams.get('channel') || undefined

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Loading...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <CreatePostForm initialChannelSlug={initialChannelSlug} />
    </Suspense>
  )
}
