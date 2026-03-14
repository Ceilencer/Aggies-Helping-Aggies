'use client'

import { useState } from 'react'

export function useModalState() {
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [createPostChannelSlug, setCreatePostChannelSlug] = useState<string | undefined>(undefined)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [previewEditPostId, setPreviewEditPostId] = useState<string | null>(null)

  const openCreatePost = (channelSlug?: string) => {
    setCreatePostChannelSlug(channelSlug)
    setCreatePostOpen(true)
  }

  return {
    activePostId,
    setActivePostId,
    createPostOpen,
    setCreatePostOpen,
    createPostChannelSlug,
    openCreatePost,
    editingPostId,
    setEditingPostId,
    selectedUserId,
    setSelectedUserId,
    previewEditPostId,
    setPreviewEditPostId,
  }
}
