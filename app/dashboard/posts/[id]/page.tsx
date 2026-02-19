'use client'

import { useParams } from 'next/navigation'
import PostDetailPanel from '@/components/PostDetailPanel'

export default function PostDetailPage() {
  const params = useParams()
  const postId = params.id as string

  return <PostDetailPanel postId={postId} showBackButton />
}
