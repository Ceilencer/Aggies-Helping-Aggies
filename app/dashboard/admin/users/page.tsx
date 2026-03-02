'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import UserProfileModal from '@/components/UserProfileModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type UserSearchResult = {
  id: string
  full_name: string
  email: string
  role: string
}

export default function UserManagementPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const handleUserDeleted = (deletedId: string) => {
    setResults(prev => prev.filter(u => u.id !== deletedId))
    setSelectedUserId(null)
  }

  useEffect(() => {
    if (initialSearch) {
      setSearchInput(initialSearch)
    }
  }, [initialSearch])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    const queryText = searchInput.trim().replace(/\s+/g, ' ')
    if (!queryText) {
      setResults([])
      setSearchError(null)
      return
    }

    setIsSearching(true)
    setSearchError(null)

    const nameParts = queryText.split(' ')

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true })
      .limit(25)

    if (nameParts.length >= 2) {
      const firstName = nameParts[0]
      const lastName = nameParts[nameParts.length - 1]
      query = query
        .ilike('full_name', `%${firstName}%`)
        .ilike('full_name', `%${lastName}%`)
    } else {
      query = query.ilike('full_name', `%${queryText}%`)
    }

    const { data, error } = await query

    if (error) {
      setSearchError('Failed to search users. Please try again.')
      setResults([])
    } else {
      setResults(data || [])
    }

    setIsSearching(false)
  }

  return (
    <>
      <UserProfileModal
        isOpen={selectedUserId !== null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onDeleted={() => handleUserDeleted(selectedUserId!)}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage platform users
          </p>
        </div>

        {/* Search for specific user */}
        <Card>
          <CardHeader>
            <CardTitle>Search User</CardTitle>
            <CardDescription>
              Search for a specific user by first and last name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter first and last name"
                className="flex-1"
              />
              <Button type="submit" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
              {searchInput && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchInput('')
                    setResults([])
                    setSearchError(null)
                  }}
                >
                  Clear
                </Button>
              )}
            </form>

            {searchError && (
              <p className="mt-3 text-sm text-red-600">{searchError}</p>
            )}

            {!searchError && results.length > 0 && (
              <ul className="mt-4 space-y-2">
                {results.map((user) => (
                  <li key={user.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email} · {user.role}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!searchError && !isSearching && searchInput.trim() && results.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">No users found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
