import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/AuthContext'
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

  useEffect(() => {
    loadBook()
    loadHighlights()
  }, [id])

  async function loadBook() {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setError('Book not found')
    } else {
      setBook(data)
    }
    setLoading(false)
  }

  async function loadHighlights() {
    const { data } = await supabase
      .from('highlights')
      .select('*')
      .eq('book_id', id)
      .order('created_at', { ascending: false })

    if (data) setHighlights(data)
  }

  async function addEntry() {
    if (!entryText.trim()) return
    if (entryText.length > 5000 || entryNote.length > 1000) return
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

    if (!error && data) {
      setHighlights((prev) => [data, ...prev])
      setEntryText('')
      setEntryNote('')
    }
    setSubmitting(false)
  }

  async function deleteEntry(entryId) {
    setHighlights((prev) => prev.filter((h) => h.id !== entryId))
    await supabase.from('highlights').delete().eq('id', entryId)
  }

  async function deleteBook() {
    if (!window.confirm(`Delete "${book.title}" and all its entries?`)) return
    await supabase.from('books').delete().eq('id', id)
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
                    onClick={() => deleteEntry(h.id)}
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
