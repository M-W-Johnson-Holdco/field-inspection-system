import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PermissionsProvider } from './context/PermissionsContext'
import LoginScreen from './components/LoginScreen'
import AppShell from './components/AppShell'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginScreen />}
      />
      <Route
        path="/"
        element={<ProtectedRoute><AppShell /></ProtectedRoute>}
      />
    </Routes>
  )
}

export default function App() {
  useEffect(() => {
    function isToolbarTarget(event) {
      return event.target instanceof Element && Boolean(event.target.closest('.action-bar'))
    }

    function preventPageGesture(event) {
      if (isToolbarTarget(event)) return
      event.preventDefault()
    }

    function preventPagePinch(event) {
      if (event.touches.length > 1 && !isToolbarTarget(event)) {
        event.preventDefault()
      }
    }

    function preventPageWheelZoom(event) {
      if (event.ctrlKey && !isToolbarTarget(event)) {
        event.preventDefault()
      }
    }

    document.addEventListener('gesturestart', preventPageGesture, { passive: false })
    document.addEventListener('gesturechange', preventPageGesture, { passive: false })
    document.addEventListener('gestureend', preventPageGesture, { passive: false })
    document.addEventListener('touchmove', preventPagePinch, { passive: false })
    document.addEventListener('wheel', preventPageWheelZoom, { passive: false })

    return () => {
      document.removeEventListener('gesturestart', preventPageGesture)
      document.removeEventListener('gesturechange', preventPageGesture)
      document.removeEventListener('gestureend', preventPageGesture)
      document.removeEventListener('touchmove', preventPagePinch)
      document.removeEventListener('wheel', preventPageWheelZoom)
    }
  }, [])

  return (
    <>
      <div className="orientation-lock" role="alert" aria-live="polite">
        <div className="orientation-lock__card">
          <div className="orientation-lock__mark">TC</div>
          <h2>Rotate Back to Portrait</h2>
          <p>This field app is designed for portrait mode on phones.</p>
        </div>
      </div>
      <AuthProvider>
        <HashRouter>
          <PermissionsProvider>
            <AppRoutes />
          </PermissionsProvider>
        </HashRouter>
      </AuthProvider>
    </>
  )
}
