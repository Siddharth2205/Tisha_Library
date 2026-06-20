import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/AuthContext'
import { detectGenre } from '../lib/genres'
import './AddBook.css'

export default function AddBook() {
  const navigate = useNavigate()
  const session = useSession()
  const fileRef = useRef()

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const [uploading, setUploading] = useState(false)

  async function searchCovers() {
    if (!title.trim()) return
    setSearching(true)
    setSearched(true)
    setSearchResults([])

    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(title.trim())}&limit=6`
      )
      const data = await res.json()
      const results = data.docs
        .filter((doc) => doc.cover_i && Number.isInteger(doc.cover_i))
        .slice(0, 6)
        .map((doc) => ({
          key: doc.key,
          title: String(doc.title || '').slice(0, 500),
          author: String(doc.author_name?.[0] || '').slice(0, 300),
          coverId: doc.cover_i,
          coverUrl: `https://covers.openlibrary.org/b/id/${Number(doc.cover_i)}-L.jpg`,
          genre: detectGenre(doc.subject) || detectGenre(doc.subject_facet) || null,
        }))
      setSearchResults(results)
    } catch {
      setError('Could not search Open Library. Try uploading a cover instead.')
    }
    setSearching(false)
  }

  function pickResult(result) {
    setCoverUrl(result.coverUrl)
    if (!author.trim() && result.author) {
      setAuthor(result.author)
    }
    if (!genre && result.genre) {
      setGenre(result.genre)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const MAX_SIZE = 5 * 1024 * 1024

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are allowed.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Cover image must be under 5 MB.')
      return
    }

    setUploading(true)
    setError(null)

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${session.user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    setCoverUrl(data.publicUrl)
    setUploading(false)
  }

  async function handleSave() {
    if (!title.trim()) return
    if (title.trim().length > 500 || author.trim().length > 300 || genre.trim().length > 100) {
      setError('Text fields are too long.')
      return
    }
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('books').insert({
      title: title.trim(),
      author: author.trim() || null,
      genre: genre.trim() || null,
      cover_url: coverUrl || null,
      user_id: session.user.id,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    navigate('/')
  }

  return (
    <div className="add-page">
      <header className="add-header">
        <button className="add-back" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Add Book</h1>
      </header>

      <div className="add-form">
        <label className="add-label">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Book title"
          />
        </label>

        <label className="add-label">
          Author
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author name"
          />
        </label>

        <label className="add-label">
          Genre
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Auto-detected or type your own"
          />
          {genre && (
            <span className="add-genre-badge">{genre}</span>
          )}
        </label>

        <div className="add-cover-section">
          <p className="add-section-title">Cover</p>

          {coverUrl && (
            <div className="add-cover-preview">
              <img src={coverUrl} alt="Selected cover" />
              <button
                className="add-cover-clear"
                onClick={() => setCoverUrl('')}
              >
                Remove
              </button>
            </div>
          )}

          {!coverUrl && (
            <>
              <button
                className="add-search-btn"
                onClick={searchCovers}
                disabled={!title.trim() || searching}
              >
                {searching ? 'Searching…' : 'Search cover by title'}
              </button>

              {searched && searchResults.length === 0 && !searching && (
                <p className="add-hint">No covers found. Try uploading one.</p>
              )}

              {searchResults.length > 0 && (
                <div className="add-cover-grid">
                  {searchResults.map((r) => (
                    <button
                      key={r.key}
                      className="add-cover-option"
                      onClick={() => pickResult(r)}
                    >
                      <img src={r.coverUrl} alt={r.title} />
                      <span className="add-cover-option-title">{r.title}</span>
                      {r.genre && (
                        <span className="add-cover-option-genre">{r.genre}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="add-divider">
                <span>or</span>
              </div>

              <button
                className="add-upload-btn"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Upload cover image'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleUpload}
              />
            </>
          )}
        </div>

        {error && <p className="add-error">{error}</p>}

        <button
          className="add-save-btn"
          onClick={handleSave}
          disabled={!title.trim() || saving}
        >
          {saving ? 'Saving…' : 'Add to shelf'}
        </button>
      </div>
    </div>
  )
}
