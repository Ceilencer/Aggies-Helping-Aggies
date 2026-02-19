'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function UserManagementPage() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearch)

  useEffect(() => {
    if (initialSearch) {
      setSearchInput(initialSearch)
    }
  }, [initialSearch])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search functionality can be extended here
  }

  return (
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
            Search for a specific user by ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter user ID"
              className="flex-1"
            />
            <Button type="submit">Search</Button>
            {searchInput && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput('')
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
