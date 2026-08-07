import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import tcLogo from '../assets/tc_logo.png'
import ptLogo from '../assets/pt_logo.png'

const AUTH_SCOPE = 'openid email profile'

export default function LoginScreen() {
  const { login } = useAuth()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const googleLogin = useGoogleLogin({
    scope: AUTH_SCOPE,
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch user info')
        const userInfo = await res.json()
        const result = await login(userInfo, tokenResponse.access_token)
        if (result?.error) setError(result.error)
      } catch {
        setError('Sign-in failed. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    onError: () => {
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    },
  })

  function handleSignIn() {
    setError(null)
    setLoading(true)
    googleLogin()
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <img src={ptLogo} alt="PT Roofing & Restorations" style={styles.logo} />
          <img src={tcLogo} alt="TC Roofing & Restorations" style={styles.logo} />
        </div>
        <p style={styles.subtitle}>Field Inspection System</p>
        <div style={styles.divider} />
        <button style={styles.googleBtn} onClick={handleSignIn} disabled={loading}>
          <svg style={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
        <p style={styles.footer}>Authorized personnel only</p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#EAEEF5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '40px 32px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    width: '100%',
  },
  logo: {
    flex: '1 1 0',
    width: '100%',
    maxWidth: '150px',
    maxHeight: '72px',
    height: 'auto',
    objectFit: 'contain',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'rgb(45,110,181)',
    margin: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '13px',
    color: '#888',
    margin: 0,
  },
  divider: {
    width: '100%',
    height: '1px',
    background: '#EAEEF5',
    margin: '4px 0',
  },
  error: {
    fontSize: '13px',
    color: '#B71C1C',
    background: '#FFEBEE',
    padding: '10px 14px',
    borderRadius: '6px',
    width: '100%',
    textAlign: 'center',
    margin: 0,
    boxSizing: 'border-box',
  },
  footer: {
    fontSize: '11px',
    color: '#bbb',
    margin: '8px 0 0',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    background: '#fff',
    color: '#3c4043',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  googleIcon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
}
