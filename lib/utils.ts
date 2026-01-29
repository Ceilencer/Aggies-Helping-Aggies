import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`
  }

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`
}

/**
 * Format a number with commas (e.g., 1000 -> 1,000)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Check if email is from TAMU domain
 */
export function isTAMUEmail(email: string): boolean {
  return email.endsWith('@tamu.edu') || email.endsWith('@aggienetwork.com')
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'Admin':
      return 'bg-maroon text-white'
    case 'Business':
      return 'bg-blue-100 text-blue-800'
    case 'Charity':
      return 'bg-green-100 text-green-800'
    case 'Personal':
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get channel icon emoji
 */
export function getChannelIcon(type: string): string {
  switch (type) {
    case 'general':
      return '💬'
    case 'jobs':
      return '💼'
    case 'tickets':
      return '🎟️'
    case 'promotions':
      return '📢'
    case 'announcements':
      return '📌'
    case 'aggie_ring':
      return '💍'
    default:
      return '📁'
  }
}

/**
 * Extract initials from full name
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
