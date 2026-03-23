'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/lib/types'

interface UserAvatarProps {
  user: Profile | { id: string; full_name: string; avatar_url?: string }
  size?: 'sm' | 'md' | 'lg'
  linkToProfile?: boolean
  className?: string
  onProfileClick?: (userId: string) => void
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg'
}

export default function UserAvatar({
  user,
  size = 'md',
  linkToProfile = true,
  className = '',
  onProfileClick
}: UserAvatarProps) {
  const sizeClass = sizeClasses[size]
  const [imgError, setImgError] = useState(false)

  const avatarElement = user.avatar_url && !imgError ? (
    <div className={`relative overflow-hidden rounded-full ${sizeClass} ${className}`}>
      <Image
        src={user.avatar_url}
        alt={`${user.full_name || 'User'} avatar`}
        fill
        sizes={size === 'sm' ? '32px' : size === 'lg' ? '64px' : '40px'}
        className="object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  ) : (
    <div className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold ${sizeClass} ${className}`}>
      {getInitials(user.full_name || 'Unknown')}
    </div>
  )

  if (!linkToProfile) {
    return avatarElement
  }

  // If we have a callback, use it instead of Link
  if (onProfileClick) {
    return (
      <button 
        onClick={() => onProfileClick(user.id)}
        className="flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
      >
        {avatarElement}
      </button>
    )
  }

  return (
    <Link 
      href={`/users/${user.id}`} 
      className="flex-shrink-0 hover:opacity-80 transition-opacity"
    >
      {avatarElement}
    </Link>
  )
}
