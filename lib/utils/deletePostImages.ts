import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'post-images'

/**
 * Deletes all images in the post-images bucket that belong to a given post.
 * Images are stored under the path `{postId}/` so we list that folder and
 * bulk-remove every file found.
 *
 * Errors are logged but do not throw — a storage cleanup failure should never
 * block the post deletion itself.
 */
export async function deletePostImages(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(postId)

    if (listError) {
      console.error(`[deletePostImages] Failed to list files for post ${postId}:`, listError)
      return
    }

    if (!files || files.length === 0) return

    const paths = files.map((f) => `${postId}/${f.name}`)
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths)

    if (removeError) {
      console.error(`[deletePostImages] Failed to remove files for post ${postId}:`, removeError)
    }
  } catch (err) {
    console.error(`[deletePostImages] Unexpected error for post ${postId}:`, err)
  }
}
