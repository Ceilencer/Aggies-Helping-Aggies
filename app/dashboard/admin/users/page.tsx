'use client'

import { useState } from 'react'
import UserBanManager from '@/components/UserBanManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function UserManagementPage() {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      setSelectedUserId(searchInput.trim())
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage user bans and timeouts
        </p>
      </div>

      {/* Search for specific user */}
      <Card>
        <CardHeader>
          <CardTitle>Search User</CardTitle>
          <CardDescription>
            Search for a specific user by ID to view or manage their bans
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
            {selectedUserId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedUserId('')
                  setSearchInput('')
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Ban Manager */}
      <UserBanManager userId={selectedUserId || undefined} />
    </div>
  )
}
