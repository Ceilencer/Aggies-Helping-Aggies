'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'

interface CommentCountButtonProps {
  postId: string
  commentCount: number
  onOpenPost?: () => void
}

export default function CommentCountButton({
  postId,
  commentCount,
  onOpenPost,
}: CommentCountButtonProps) {
  const handleClick = () => {
    if (onOpenPost) {
      onOpenPost()
    }
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
