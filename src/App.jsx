import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { AuthProvider, useSession } from './lib/AuthContext'
import Login from './pages/Login'
import Shelf from './pages/Shelf'
import AddBook from './pages/AddBook'
import BookView from './pages/BookView'
import ResetPassword from './pages/ResetPassword'

function ProtectedRoute({ children }) {
  const session = useSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const session = useSession()
  if (session) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const location = useLocation()

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
                <BookView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <AddBook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
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
