const DB_NAME = 'howdy-helps-drafts'
const DB_VERSION = 1
const STORE_NAME = 'draft-images'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error)
  })
}

export async function saveDraftImages(userId: string, files: File[]): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(files, userId)
      request.onsuccess = () => resolve()
      request.onerror = (e) => reject((e.target as IDBRequest).error)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = (e) => { db.close(); reject((e.target as IDBTransaction).error) }
    })
  } catch (err) {
    console.warn('[ImageDraftDB] Failed to save draft images:', err)
  }
}

export async function loadDraftImages(userId: string): Promise<File[]> {
  if (typeof window === 'undefined') return []
  try {
    const db = await openDB()
    return await new Promise<File[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(userId)
      request.onsuccess = (e) => {
        db.close()
        const result = (e.target as IDBRequest).result
        resolve(Array.isArray(result) ? result : [])
      }
      request.onerror = (e) => { db.close(); reject((e.target as IDBRequest).error) }
    })
  } catch (err) {
    console.warn('[ImageDraftDB] Failed to load draft images:', err)
    return []
  }
}

export async function clearDraftImages(userId: string): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(userId)
      request.onsuccess = () => resolve()
      request.onerror = (e) => reject((e.target as IDBRequest).error)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = (e) => { db.close(); reject((e.target as IDBTransaction).error) }
    })
  } catch (err) {
    console.warn('[ImageDraftDB] Failed to clear draft images:', err)
  }
}
