'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export default function ChannelPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [channel, setChannel] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadChannelData = () => {
      // Check for admin session
      const hasAdminSession = document.cookie.includes('admin_session=true')

      if (!hasAdminSession) {
        // Redirect to login if not in admin session
        router.push('/login')
        return
      }

      // Mock channels
      const mockChannels = [
        { id: '1', name: 'General', slug: 'general', description: 'General community discussions', type: 'general', requires_mfa: false, is_read_only: false, icon: '💬', color: '#500000' },
        { id: '2', name: 'Promotions', slug: 'promotions', description: 'Business promotions and events', type: 'promotions', requires_mfa: false, is_read_only: false, icon: '📢', color: '#500000' },
        { id: '3', name: 'Job/Internship/Networking', slug: 'jobs-networking', description: 'Job opportunities, internships, and networking', type: 'jobs', requires_mfa: false, is_read_only: false, icon: '💼', color: '#500000' },
        { id: '4', name: 'Fundraising', slug: 'fundraising', description: 'Support Aggie causes and fundraising efforts', type: 'aggie_ring', requires_mfa: false, is_read_only: false, icon: '💍', color: '#500000' },
        { id: '5', name: 'Football Tickets', slug: 'football-tickets', description: 'Buy, sell, or trade football game tickets', type: 'tickets', requires_mfa: true, is_read_only: false, icon: '🎟️', color: '#500000' },
        { id: '6', name: 'Announcements', slug: 'announcements', description: 'Official platform announcements', type: 'announcements', requires_mfa: false, is_read_only: true, icon: '📌', color: '#500000' }
      ]

      const foundChannel = mockChannels.find(c => c.slug === slug)
      setChannel(foundChannel)

      if (foundChannel) {
        // Get posts from localStorage
        const storedPosts = localStorage.getItem('mockPosts')
        let allPosts = []

        if (storedPosts) {
          allPosts = JSON.parse(storedPosts)
        } else {
          // Default mock posts
          allPosts = [
            {
              id: 1,
              channel_id: '1',
              title: 'Welcome to the Aggie Community!',
              content: 'Excited to be part of this platform connecting current and former students. Looking forward to networking and helping fellow Aggies succeed!',
              created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              author: { full_name: 'John Smith', role: 'Personal' },
              channel: { name: 'General', icon: '💬' },
              is_pinned: false
            },
            {
              id: 2,
              channel_id: '3',
              title: 'Job Opportunity: Software Engineer at Tech Company',
              content: 'We\'re hiring! Looking for talented software engineers with experience in React and Node.js. Competitive salary and benefits. Remote work available.',
              created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              author: { full_name: 'Jane Doe', role: 'Business' },
              channel: { name: 'Job/Internship/Networking', icon: '💼' },
              is_pinned: false
            },
            {
              id: 3,
              channel_id: '4',
              title: 'Aggie Ring Fundraiser',
              content: 'Help a fellow Aggie achieve their ring! We\'re raising funds for graduation rings. Every contribution makes a difference. #AggiePride',
              created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              author: { full_name: 'Bob Johnson', role: 'Charity' },
              channel: { name: 'Fundraising', icon: '💍' },
              is_pinned: false
            }
          ]
          // Save defaults to localStorage
          localStorage.setItem('mockPosts', JSON.stringify(allPosts))
        }

        const channelPosts = allPosts.filter((post: any) => post.channel_id === foundChannel.id)
        setPosts(channelPosts)
      }

      setLoading(false)
    }

    loadChannelData()
  }, [slug, router])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Channel Not Found</h1>
            <p className="text-gray-600 mb-6">The channel you're looking for doesn't exist.</p>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-maroon hover:text-maroon-700 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="flex items-center space-x-3 mb-2">
          <span className="text-3xl">{channel.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-maroon">{channel.name}</h1>
            <p className="text-gray-600">{channel.description}</p>
          </div>
        </div>

        {channel.requires_mfa && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800">
            🔒 Requires Two-Factor Authentication
          </div>
        )}
      </div>

      {/* Create Post Button */}
      {!channel.is_read_only && (
        <div className="mb-6">
          <Link href={`/post-creation?channel=${channel.slug}`}>
            <Button size="lg">
              Create Post in {channel.name}
            </Button>
          </Link>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-maroon">Posts</h2>

        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {/* Author Avatar */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-maroon text-white font-semibold">
                      {getInitials(post.author?.full_name || 'Unknown')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-900">
                          {post.author?.full_name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.author?.role)}`}>
                          {post.author?.role}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{post.channel?.icon} {post.channel?.name}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(post.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {post.is_pinned && (
                    <span className="text-maroon text-sm font-medium">📌 Pinned</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">
                  {post.title}
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {post.content.length > 300
                    ? `${post.content.substring(0, 300)}...`
                    : post.content
                  }
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">
                No posts in this channel yet. Be the first to share something!
              </p>
              {!channel.is_read_only && (
                <Link href={`/post-creation?channel=${channel.slug}`}>
                  <Button>Create First Post</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}