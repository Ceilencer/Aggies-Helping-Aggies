'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'

interface CommentCountButtonProps {
  postId: string
  commentCount: number
}

export default function CommentCountButton({
  postId,
  commentCount,
}: CommentCountButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/dashboard/posts/${postId}`)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="gap-2 text-foreground hover:text-foreground/80"
    >
      <MessageCircle size={16} />
      <span className="text-xs">{commentCount}</span>
    </Button>
  )
}
