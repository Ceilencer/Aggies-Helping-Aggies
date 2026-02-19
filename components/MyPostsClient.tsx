'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CommentCountButton from '@/components/CommentCountButton'
import PostLikeButton from '@/components/PostLikeButton'
import PostCardHeader from '@/components/PostCardHeader'
import CreatePostModal from '@/components/CreatePostModal'
import PostDetailModal from '@/components/PostDetailModal'
import type { Channel, Post, Profile } from '@/lib/types'

interface FeedPost extends Post {
  author?: Profile
  channel?: Channel
  comment_count?: number
  like_count?: number
  like_id?: string | null
  user_has_liked?: boolean
}

interface MyPostsClientProps {
  profile: Profile
  posts: FeedPost[]
  channels: Channel[]
}

export default function MyPostsClient({
  profile,
  posts,
  channels,
}: MyPostsClientProps) {
  const [postsState, setPostsState] = useState<FeedPost[]>(posts)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)

  const handlePostCreated = (newPost: Post, channel: Channel | null) => {
    const resolvedChannel = channel || channels.find(c => c.id === newPost.channel_id) || undefined
    const hydratedPost: FeedPost = {
      ...newPost,
      author: profile,
      channel: resolvedChannel,
      like_count: 0,
      comment_count: 0,
      user_has_liked: false,
      like_id: null,
      view_count: newPost.view_count ?? 0,
    }

    setPostsState(current => [hydratedPost, ...current])
  }

  const handlePostDeleted = (postId: string) => {
    setPostsState(current => current.filter(post => post.id !== postId))
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader className="bg-dash-header-bg text-dash-header-text">
            <CardTitle className="text-2xl text-dash-header-text">My Posts</CardTitle>
            <CardDescription className="text-dash-header-text/80">
              View all posts you've created
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => setCreatePostOpen(true)}>
                Create New Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts List */}
        <div className="space-y-4">
          {postsState && postsState.length > 0 ? (
            postsState.map((post: FeedPost) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <PostCardHeader
                    post={post}
                    isAdmin={profile?.role === 'Admin'}
                    channels={channels}
                    onPostDeleted={handlePostDeleted}
                  />
                </CardHeader>

                <CardContent className="space-y-3 pb-0">
                  <h3 className="text-xl font-bold text-card-header-text">
                    {post.title}
                  </h3>
                  <p className="text-card-subtext whitespace-pre-wrap">
                    {post.content.length > 300 
                      ? `${post.content.substring(0, 300)}...` 
                      : post.content
                    }
                  </p>

                  <div className="flex items-center justify-between space-x-4 py-4 border-t">
                    <div className="flex items-center space-x-4">
                      <PostLikeButton
                        postId={post.id}
                        likeCount={post.like_count || 0}
                        userHasLiked={post.user_has_liked || false}
                        likeId={post.like_id || null}
                      />
                      <CommentCountButton
                        postId={post.id}
                        commentCount={post.comment_count || 0}
                        onOpenPost={() => setActivePostId(post.id)}
                      />
                      <span className="text-sm text-card-subtext">
                        👁️ {post.view_count} views
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActivePostId(post.id)}>
                      View Full Post
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  You haven't created any posts yet. Share something with the community!
                </p>
                <Button onClick={() => setCreatePostOpen(true)}>
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />

      <PostDetailModal
        isOpen={!!activePostId}
        postId={activePostId}
        onClose={() => setActivePostId(null)}
        onPostDeleted={handlePostDeleted}
      />
    </>
  )
}
