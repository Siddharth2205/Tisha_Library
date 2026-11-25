import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { AuthProvider } from './lib/AuthContext'
import { useSession, useNeedsPassword } from './lib/authContexts'
import Login from './pages/Login'
import Shelf from './pages/Shelf'

// Split out of the main bundle: BookView pulls in the drawing canvas, which is heavy
const loadAddBook = () => import('./pages/AddBook')
const loadBookView = () => import('./pages/BookView')
const AddBook = lazy(loadAddBook)
const BookView = lazy(loadBookView)
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

// Suspense per lazy route, inside AnimatePresence, so a pending chunk never hides the outgoing page
function Lazy({ children }) {
  return (
    <Suspense fallback={<div className="loading-screen">Loading…</div>}>
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }) {
  const session = useSession()
  const needsPassword = useNeedsPassword()
  if (!session) return <Navigate to="/login" replace />
  if (needsPassword) return <Navigate to="/reset-password" replace />
  return children
}

function PublicRoute({ children }) {
  const session = useSession()
  const needsPassword = useNeedsPassword()
  if (session && needsPassword) return <Navigate to="/reset-password" replace />
  if (session) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const location = useLocation()
  const session = useSession()

  // Once signed in, fetch the lazy pages in the background so navigation (and the
  // shared cover animation from Shelf to BookView) doesn't wait on a network request
  useEffect(() => {
    if (session) {
      loadAddBook()
      loadBookView()
    }
  }, [session])

  return (
    <LayoutGroup>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Shelf />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book/:id"
            element={
              <ProtectedRoute>
                <Lazy><BookView /></Lazy>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <Lazy><AddBook /></Lazy>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reset-password"
            element={<Lazy><ResetPassword /></Lazy>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </LayoutGroup>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
