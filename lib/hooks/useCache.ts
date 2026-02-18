import { useEffect, useRef, useState } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class ClientCache {
  private cache: Map<string, CacheEntry<any>> = new Map()

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear() {
    this.cache.clear()
  }

  delete(key: string) {
    this.cache.delete(key)
  }
}

// Global client cache instance
const globalCache = new ClientCache()

/**
 * Hook to cache async data on the client side
 * Useful for preventing redundant fetch calls during component re-renders
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes
): { data: T | null; loading: boolean; error: Error | null } {
  const cacheRef = useRef(globalCache)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const cachedData = cacheRef.current.get<T>(key)
    
    if (cachedData) {
      setData(cachedData)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchFn()
        if (!cancelled && isMountedRef.current) {
          cacheRef.current.set(key, result, ttl)
          setData(result)
        }
      } catch (err) {
        if (!cancelled && isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [key, fetchFn, ttl])

  return { data, loading, error }
}

/**
 * Invalidate cache for a specific key
 */
export function invalidateCache(key: string) {
  globalCache.delete(key)
}

/**
 * Clear all cached data
 */
export function clearAllCache() {
  globalCache.clear()
}
