import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/authContexts'
import DrawingCanvas from './DrawingCanvas'
import './MediaSection.css'

export default function MediaSection({ bookId }) {
  const session = useSession()
  const fileRef = useRef()

  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showDrawing, setShowDrawing] = useState(false)
  const [viewerUrl, setViewerUrl] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadPhotos() {
      const { data } = await supabase
        .from('photos')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })

      let withUrls = []
      if (data?.length) {
        // One request for all signed URLs instead of one per photo
        const { data: urls } = await supabase.storage
          .from('photos')
          .createSignedUrls(data.map((p) => p.image_url), 3600)
        const byPath = new Map((urls || []).map((u) => [u.path, u.signedUrl]))
        withUrls = data.map((p) => ({ ...p, signedUrl: byPath.get(p.image_url) }))
      }
      if (!cancelled) {
        setPhotos(withUrls)
        setLoading(false)
      }
    }

    loadPhotos()
    return () => { cancelled = true }
  }, [bookId])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const MAX_SIZE = 10 * 1024 * 1024

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Only JPEG, PNG, GIF, and WebP images are allowed.')
      return
    }
    if (file.size > MAX_SIZE) {
      alert('Image must be under 10 MB.')
      return
    }

    setUploading(true)

    const resized = await resizeImage(file, 1200)
    // resizeImage may re-encode to JPEG, so name the file after what we actually upload
    const contentType = resized.type || file.type
    const ext = contentType.split('/')[1].replace('jpeg', 'jpg')
    const path = `${session.user.id}/${bookId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(path, resized, { contentType })

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data, error } = await supabase
      .from('photos')
      .insert({
        book_id: bookId,
        user_id: session.user.id,
        image_url: path,
        kind: 'photo',
      })
      .select()
      .single()

    if (error) {
      // Don't leave an orphaned file behind if the DB row failed
      await supabase.storage.from('photos').remove([path])
      alert('Upload failed: ' + error.message)
    } else if (data) {
      const { data: urlData } = await supabase.storage
        .from('photos')
        .createSignedUrl(path, 3600)
      setPhotos((prev) => [
        { ...data, signedUrl: urlData?.signedUrl },
        ...prev,
      ])
    }

    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
  }

  async function handleDrawingSave(blob) {
    const path = `${session.user.id}/${bookId}/drawing-${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(path, blob, { contentType: 'image/png' })

    if (uploadError) {
      alert('Drawing upload failed: ' + uploadError.message)
      return
    }

    const { data, error } = await supabase
      .from('photos')
      .insert({
        book_id: bookId,
        user_id: session.user.id,
        image_url: path,
        kind: 'drawing',
      })
      .select()
      .single()

    if (error) {
      await supabase.storage.from('photos').remove([path])
      alert('Drawing save failed: ' + error.message)
      return
    }
    if (data) {
      const { data: urlData } = await supabase.storage
        .from('photos')
        .createSignedUrl(path, 3600)
      setPhotos((prev) => [
        { ...data, signedUrl: urlData?.signedUrl },
        ...prev,
      ])
    }
    setShowDrawing(false)
  }

  async function deletePhoto(photo) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    // Delete the row first: if that fails nothing is lost; then remove the file
    const { error } = await supabase.from('photos').delete().eq('id', photo.id)
    if (error) {
      // Put back only this photo, keeping any other changes made meanwhile
      setPhotos((prev) =>
        [...prev, photo].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      )
      alert('Could not delete: ' + error.message)
      return
    }
    await supabase.storage.from('photos').remove([photo.image_url])
  }

  if (showDrawing) {
    return (
      <DrawingCanvas
        onSave={handleDrawingSave}
        onCancel={() => setShowDrawing(false)}
      />
    )
  }

  return (
    <div className="media-section">
      <div className="media-actions">
        <button
          className="media-action-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Upload photo'}
        </button>
        <button
          className="media-action-btn"
          onClick={() => setShowDrawing(true)}
        >
          Draw
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleUpload}
        />
      </div>

      {loading ? (
        <p className="media-empty">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="media-empty">No photos or drawings yet.</p>
      ) : (
        <div className="media-grid">
          {photos.map((p) => (
            <div key={p.id} className="media-thumb-wrapper">
              <img
                src={p.signedUrl}
                alt={p.caption || ''}
                className="media-thumb"
                onClick={() => setViewerUrl(p.signedUrl)}
              />
              {p.kind === 'drawing' && (
                <span className="media-badge">drawing</span>
              )}
              <button
                className="media-thumb-delete"
                onClick={() => deletePhoto(p)}
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {viewerUrl && (
        <div className="media-viewer" onClick={() => setViewerUrl(null)}>
          <img src={viewerUrl} alt="" />
          <button className="media-viewer-close">×</button>
        </div>
      )}
    </div>
  )
}

function resizeImage(file, maxSize) {
  return new Promise((resolve) => {
    // Small files and GIFs (canvas would drop the animation) go up unchanged
    if (file.size < 500_000 || file.type === 'image/gif') {
      resolve(file)
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)
    // If the browser can't decode it, upload the original instead of hanging forever
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize
          width = maxSize
        } else {
          width = (width / height) * maxSize
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob || file),
        'image/jpeg',
        0.85
      )
    }
    img.src = url
  })
}
