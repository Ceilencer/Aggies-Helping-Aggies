import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
const MAX_IMAGES = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

interface UploadedImage {
  file: File
  preview: string
  url?: string
  uploading?: boolean
  error?: string
}

export function useImageUpload() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [error, setError] = useState<string>('')
  const supabase = createClient()

  const validateFiles = useCallback((files: FileList): { valid: boolean; error: string; validFiles: File[] } => {
    setError('')
    
    // Check new selection won't exceed max
    const totalImages = uploadedImages.length + files.length
    if (totalImages > MAX_IMAGES) {
      const error = `You can upload a maximum of ${MAX_IMAGES} images. You have ${uploadedImages.length} selected.`
      setError(error)
      return { valid: false, error, validFiles: [] }
    }

    const validFiles: File[] = []
    let errorMsg = ''

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errorMsg = 'Only image files (JPEG, PNG, GIF, WebP) are allowed'
        continue
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errorMsg = `Image "${file.name}" exceeds 5MB size limit`
        continue
      }

      validFiles.push(file)
    }

    if (errorMsg && validFiles.length === 0) {
      setError(errorMsg)
      return { valid: false, error: errorMsg, validFiles }
    }

    if (errorMsg) {
      setError(`${errorMsg}. ${validFiles.length} valid image(s) added.`)
    }

    return { valid: validFiles.length > 0, error: errorMsg, validFiles }
  }, [uploadedImages.length])

  const addImages = useCallback((files: FileList) => {
    const { valid, validFiles } = validateFiles(files)
    
    if (!valid) {
      return
    }

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setUploadedImages(prev => [...prev, ...newImages])
  }, [validateFiles])

  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => {
      const newImages = [...prev]
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview)
      }
      newImages.splice(index, 1)
      return newImages
    })
    setError('')
  }, [])

  const uploadImages = useCallback(async (postId: string): Promise<{ success: boolean; urls: string[]; error?: string }> => {
    if (uploadedImages.length === 0) {
      return { success: true, urls: [] }
    }

    try {
      const uploadedUrls: string[] = []
      
      for (let i = 0; i < uploadedImages.length; i++) {
        const image = uploadedImages[i]
        const uniqueId = crypto.randomUUID()
        const fileExt = image.file.name.split('.').pop()
        const fileName = `${postId}/${uniqueId}.${fileExt}`

        try {
          const { data, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, image.file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            throw new Error(`Upload failed for ${image.file.name}: ${uploadError.message}`)
          }

          if (data) {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('post-images')
              .getPublicUrl(fileName)

            uploadedUrls.push(publicUrl)
          }
        } catch (err: any) {
          // Clean up on first error - delete already uploaded files
          for (const url of uploadedUrls) {
            try {
              const fileName = url.split('/').pop()
              if (fileName) {
                await supabase.storage
                  .from('post-images')
                  .remove([`${postId}/${fileName}`])
              }
            } catch (cleanupErr) {
              console.error('Cleanup error:', cleanupErr)
            }
          }
          return {
            success: false,
            urls: [],
            error: err.message || 'Failed to upload images'
          }
        }
      }

      return { success: true, urls: uploadedUrls }
    } catch (err: any) {
      return {
        success: false,
        urls: [],
        error: err.message || 'Image upload failed'
      }
    }
  }, [uploadedImages, supabase])

  const clearImages = useCallback(() => {
    uploadedImages.forEach(image => {
      if (image.preview) {
        URL.revokeObjectURL(image.preview)
      }
    })
    setUploadedImages([])
    setError('')
  }, [uploadedImages])

  return {
    uploadedImages,
    error,
    addImages,
    removeImage,
    uploadImages,
    clearImages,
    canAddMore: uploadedImages.length < MAX_IMAGES,
    remainingSlots: MAX_IMAGES - uploadedImages.length,
  }
}
