import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/AuthContext'
import { lookupGenre } from '../lib/genres'
import './Shelf.css'

export default function Shelf() {
  const session = useSession()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [genreFilter, setGenreFilter] = useState('All')
  const [authorFilter, setAuthorFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectProgress, setDetectProgress] = useState('')

  useEffect(() => {
    loadBooks()
  }, [])

  async function loadBooks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setBooks(data)
    }
    setLoading(false)
  }

  const genres = useMemo(() => {
    const set = new Set()
    books.forEach((b) => {
      if (b.genre) set.add(b.genre)
    })
    return ['All', ...Array.from(set).sort()]
  }, [books])

  const authors = useMemo(() => {
    const set = new Set()
    books.forEach((b) => {
      if (b.author) set.add(b.author)
    })
    return ['All', ...Array.from(set).sort()]
  }, [books])

  const filteredBooks = useMemo(() => {
    let result = books

    if (genreFilter !== 'All') {
      result = result.filter((b) => b.genre === genreFilter)
    }
    if (authorFilter !== 'All') {
      result = result.filter((b) => b.author === authorFilter)
    }

    switch (sortBy) {
      case 'newest':
        result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        break
      case 'title':
        result = [...result].sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'author':
        result = [...result].sort((a, b) => (a.author || '').localeCompare(b.author || ''))
        break
    }

    return result
  }, [books, genreFilter, authorFilter, sortBy])

  const activeFilterCount =
    (genreFilter !== 'All' ? 1 : 0) + (authorFilter !== 'All' ? 1 : 0)

  const booksWithoutGenre = useMemo(
    () => books.filter((b) => !b.genre),
    [books]
  )

  async function detectGenres() {
    setDetecting(true)
    const toDetect = booksWithoutGenre
    let updated = 0

    for (let i = 0; i < toDetect.length; i++) {
      const book = toDetect[i]
      setDetectProgress(`${i + 1} / ${toDetect.length}`)

      const genre = await lookupGenre(book.title, book.author)
      if (genre) {
        await supabase.from('books').update({ genre }).eq('id', book.id)
        setBooks((prev) =>
          prev.map((b) => (b.id === book.id ? { ...b, genre } : b))
        )
        updated++
      }
    }

    setDetectProgress(`Done! Updated ${updated} book${updated !== 1 ? 's' : ''}.`)
    setDetecting(false)
    setTimeout(() => setDetectProgress(''), 3000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="loading-screen">Loading your books…</div>
  }

  if (error) {
    return <div className="error-screen">Something went wrong: {error}</div>
  }

  return (
    <motion.div
      className="shelf-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <header className="shelf-header">
        <div>
          <h1>Tisha's Library</h1>
          <p className="shelf-user">{session.user.user_metadata?.full_name || session.user.email}</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </header>

      {books.length > 0 && (
        <div className="shelf-controls">
          <button
            className={`shelf-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>

          <select
            className="shelf-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
            <option value="author">Author A–Z</option>
          </select>
        </div>
      )}

      {booksWithoutGenre.length > 0 && (
        <div className="shelf-detect-bar">
          <button
            className="shelf-detect-btn"
            onClick={detectGenres}
            disabled={detecting}
          >
            {detecting
              ? `Detecting genres… ${detectProgress}`
              : `Auto-detect genres (${booksWithoutGenre.length} book${booksWithoutGenre.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}

      {detectProgress && !detecting && (
        <p className="shelf-detect-done">{detectProgress}</p>
      )}

      {showFilters && (
        <div className="shelf-filters">
          {genres.length > 1 && (
            <div className="shelf-filter-group">
              <span className="shelf-filter-label">Genre</span>
              <div className="shelf-filter-chips">
                {genres.map((g) => (
                  <button
                    key={g}
                    className={`shelf-chip ${genreFilter === g ? 'active' : ''}`}
                    onClick={() => setGenreFilter(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {authors.length > 1 && (
            <div className="shelf-filter-group">
              <span className="shelf-filter-label">Author</span>
              <select
                className="shelf-author-select"
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
              >
                {authors.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {activeFilterCount > 0 && (
            <button
              className="shelf-clear-filters"
              onClick={() => {
                setGenreFilter('All')
                setAuthorFilter('All')
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {books.length === 0 ? (
        <div className="shelf-empty">
          <p className="shelf-empty-icon">📚</p>
          <p>Your shelf is empty!</p>
          <p className="shelf-empty-hint">
            Tap the + button to add your first book.
          </p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="shelf-empty">
          <p>No books match your filters.</p>
        </div>
      ) : (
        <>
          <p className="shelf-count">
            {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
          </p>
          <div className="shelf-grid">
            {filteredBooks.map((book) => (
              <Link
                to={`/book/${book.id}`}
                key={book.id}
                className="shelf-book"
              >
                <div className="shelf-cover-wrapper">
                  {book.cover_url ? (
                    <motion.img
                      layoutId={`cover-${book.id}`}
                      src={book.cover_url}
                      alt={book.title}
                      className="shelf-cover"
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    />
                  ) : (
                    <motion.div
                      layoutId={`cover-${book.id}`}
                      className="shelf-cover shelf-cover-placeholder"
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <span>{book.title[0]}</span>
                    </motion.div>
                  )}
                  {book.genre && (
                    <span className="shelf-genre-badge">{book.genre}</span>
                  )}
                </div>
                <p className="shelf-book-title">{book.title}</p>
                {book.author && (
                  <p className="shelf-book-author">{book.author}</p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      <Link to="/add" className="shelf-fab" aria-label="Add book">
        +
      </Link>
    </motion.div>
  )
}
