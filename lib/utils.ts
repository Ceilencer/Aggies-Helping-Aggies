import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago", "yesterday").
 * Uses Intl.RelativeTimeFormat for correct locale handling and natural phrasing.
 * ISO timestamps from Supabase include timezone offset so the diff is always correct
 * regardless of the viewer's local timezone.
 */
export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const diffMs = new Date(date).getTime() - Date.now()
  const diffSecs = Math.round(diffMs / 1000)
  const abs = Math.abs(diffSecs)

  if (abs < 60)     return rtf.format(diffSecs, 'second')        // "now", "5 seconds ago"
  if (abs < 3600)   return rtf.format(Math.round(diffSecs / 60), 'minute')   // "3 minutes ago"
  if (abs < 86400)  return rtf.format(Math.round(diffSecs / 3600), 'hour')   // "2 hours ago"
  if (abs < 604800) return rtf.format(Math.round(diffSecs / 86400), 'day')   // "yesterday", "3 days ago"
  if (abs < 2592000) return rtf.format(Math.round(diffSecs / 604800), 'week') // "last week", "2 weeks ago"
  if (abs < 31536000) return rtf.format(Math.round(diffSecs / 2592000), 'month') // "last month", "3 months ago"
  return rtf.format(Math.round(diffSecs / 31536000), 'year')                 // "last year", "2 years ago"
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
      return 'bg-red-500/20 text-red-700 dark:text-red-400 dark:bg-red-900/30'
    case 'Business':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 dark:bg-blue-900/30'
    case 'Charity':
      return 'bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30'
    case 'Personal':
    default:
      return 'bg-gray-500/20 text-gray-700 dark:text-gray-400 dark:bg-gray-800/30'
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

/**
 * Canonical display order for channels across the app (home feed sections, create post dropdown, etc.)
 * Any channel slug not listed here falls to the end.
 */
export const CHANNEL_DISPLAY_ORDER = [
  'general',
  'fundraising',
  'football-tickets',
  'jobs-networking',
  'promotions',
]

export function sortChannelsByDisplayOrder<T extends { slug: string }>(channels: T[]): T[] {
  return [...channels].sort((a, b) => {
    const ai = CHANNEL_DISPLAY_ORDER.indexOf(a.slug)
    const bi = CHANNEL_DISPLAY_ORDER.indexOf(b.slug)
    const aOrder = ai === -1 ? CHANNEL_DISPLAY_ORDER.length : ai
    const bOrder = bi === -1 ? CHANNEL_DISPLAY_ORDER.length : bi
    return aOrder - bOrder
  })
}

