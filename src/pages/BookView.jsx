import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/authContexts'
import MediaSection from '../components/MediaSection'
import './BookView.css'

export default function BookView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useSession()

  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Writing section
  const [highlights, setHighlights] = useState([])
  const [entryType, setEntryType] = useState('highlight')
  const [entryText, setEntryText] = useState('')
  const [entryNote, setEntryNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Active tab
  const [tab, setTab] = useState('writing')

  // Error from an action (add/delete) — shown inline, doesn't replace the page
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Book not found')
        else setBook(data)
        setLoading(false)
      })

    supabase
      .from('highlights')
      .select('*')
      .eq('book_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setHighlights(data)
      })

    return () => { cancelled = true }
  }, [id])

  async function addEntry() {
    if (!entryText.trim()) return
    if (entryText.length > 5000 || entryNote.length > 1000) {
      setActionError('Entry is too long (max 5000 characters, note max 1000).')
      return
    }
    setActionError(null)
    setSubmitting(true)

    const row = {
      book_id: id,
      user_id: session.user.id,
      text: entryText.trim(),
      note: entryNote.trim() || null,
      type: entryType,
    }

    const { data, error } = await supabase
      .from('highlights')
      .insert(row)
      .select()
      .single()

    if (error) {
      setActionError(`Could not save: ${error.message}`)
    } else if (data) {
      setHighlights((prev) => [data, ...prev])
      setEntryText('')
      setEntryNote('')
    }
    setSubmitting(false)
  }

  async function deleteEntry(entry) {
    setHighlights((prev) => prev.filter((h) => h.id !== entry.id))
    const { error } = await supabase.from('highlights').delete().eq('id', entry.id)
    if (error) {
      // Put back only this entry, so other adds/deletes made meanwhile are kept
      setHighlights((prev) => sortNewestFirst([...prev, entry]))
      setActionError(`Could not delete: ${error.message}`)
    }
  }

  async function deleteBook() {
    if (!window.confirm(`Delete "${book.title}" and all its entries?`)) return
    setActionError(null)

    // Note the file paths before the rows go away
    const { data: photos } = await supabase
      .from('photos')
      .select('image_url')
      .eq('book_id', id)

    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) {
      setActionError(`Could not delete book: ${error.message}`)
      return
    }

    // Only after the book is gone, clean up its photos/drawings so files aren't orphaned
    if (photos?.length) {
      await supabase.storage.from('photos').remove(photos.map((p) => p.image_url))
    }
    navigate('/')
  }

  if (loading) return <div className="loading-screen">Loading…</div>
  if (error) return <div className="error-screen">{error}</div>

  return (
    <motion.div
      className="book-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
    >
      <header className="book-header">
        <button className="book-back" onClick={() => navigate('/')}>
          ← Back
        </button>
        <button className="book-delete-btn" onClick={deleteBook}>
          Delete book
        </button>
      </header>

      <div className="book-info">
        {book.cover_url ? (
          <motion.img
            layoutId={`cover-${book.id}`}
            src={book.cover_url}
            alt={book.title}
            className="book-thumb"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            layoutId={`cover-${book.id}`}
            className="book-thumb book-thumb-placeholder"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {book.title[0]}
          </motion.div>
        )}
        <div>
          <h1 className="book-title">{book.title}</h1>
          {book.author && <p className="book-author">{book.author}</p>}
        </div>
      </div>

      {actionError && <p className="book-action-error" role="alert">{actionError}</p>}

      <div className="book-tabs">
        <button
          className={`book-tab ${tab === 'writing' ? 'active' : ''}`}
          onClick={() => setTab('writing')}
        >
          Writing
        </button>
        <button
          className={`book-tab ${tab === 'media' ? 'active' : ''}`}
          onClick={() => setTab('media')}
        >
          Media
        </button>
      </div>

      {tab === 'writing' && (
        <div className="book-writing">
          <div className="entry-form">
            <div className="entry-type-toggle">
              <button
                className={`entry-type-btn ${entryType === 'highlight' ? 'active' : ''}`}
                onClick={() => setEntryType('highlight')}
              >
                Highlight
              </button>
              <button
                className={`entry-type-btn ${entryType === 'note' ? 'active' : ''}`}
                onClick={() => setEntryType('note')}
              >
                Note
              </button>
            </div>

            <textarea
              className="entry-input"
              placeholder={
                entryType === 'highlight'
                  ? 'A favorite line from the book…'
                  : 'Your thoughts…'
              }
              value={entryText}
              onChange={(e) => setEntryText(e.target.value)}
              rows={3}
            />

            {entryType === 'highlight' && (
              <input
                className="entry-note-input"
                type="text"
                placeholder="Page number or note (optional)"
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
              />
            )}

            <button
              className="entry-save-btn"
              onClick={addEntry}
              disabled={!entryText.trim() || submitting}
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>

          {highlights.length === 0 ? (
            <p className="book-empty">
              No highlights or notes yet. Add your first one above!
            </p>
          ) : (
            <div className="entries-list">
              {highlights.map((h) => (
                <div
                  key={h.id}
                  className={`entry-card ${h.type === 'highlight' ? 'entry-highlight' : 'entry-note'}`}
                >
                  <div className="entry-card-content">
                    {h.type === 'highlight' ? (
                      <p className="entry-quote">"{h.text}"</p>
                    ) : (
                      <p className="entry-text">{h.text}</p>
                    )}
                    {h.note && <p className="entry-meta">{h.note}</p>}
                  </div>
                  <button
                    className="entry-delete"
                    onClick={() => deleteEntry(h)}
                    aria-label="Delete"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'media' && <MediaSection bookId={id} />}
    </motion.div>
  )
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}
