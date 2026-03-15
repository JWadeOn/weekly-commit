import { Suspense, lazy, useEffect, useState } from 'react'

const WeeklyCommitApp = lazy(() => import('weeklyCommitModule/WeeklyCommitApp'))

/** Set at build time (VITE_API_URL). Use '/api' for same-origin. */
const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '')
const _raw = API_BASE.startsWith('http') ? API_BASE.replace(/\/api.*$/, '') : window.location.origin
/** Ensure absolute URL for OAuth so the link is never relative (avoids "doubled" URL on current origin). */
const BACKEND_ORIGIN = _raw.startsWith('http') ? _raw : _raw.includes('.') ? 'https://' + _raw.replace(/\/api.*$/, '').replace(/^\/+/, '') : window.location.origin

function oauthUrl(): string {
  const u = BACKEND_ORIGIN.startsWith('http') ? BACKEND_ORIGIN : BACKEND_ORIGIN.includes('.') ? 'https://' + BACKEND_ORIGIN.replace(/\/api.*$/, '').replace(/^\/+/, '') : window.location.origin
  return u + '/oauth2/authorization/oidc'
}

/** Sign-up URL: passes screen_hint=signup so Auth0 (and similar IdPs) show sign-up instead of sign-in. */
function oauthSignUpUrl(): string {
  return oauthUrl() + '?screen_hint=signup'
}

interface UserInfo {
  userId: string
  orgId: string
  email: string
  fullName: string
}

export default function App(): JSX.Element {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json() as Promise<UserInfo>
      })
      .then((data) => {
        setUser(data)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setChecking(false))
  }, [])

  const handleLogout = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        setUser(null)
        // Full navigation so host re-fetches /auth/me and shows login
        window.location.href = window.location.origin + '/'
      } else {
        setUser(null)
        window.location.href = oauthUrl()
      }
    } catch {
      setUser(null)
      window.location.href = oauthUrl()
    }
  }

  const handleAuthExpired = (): void => {
    setUser(null)
    window.location.href = oauthUrl()
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    )
  }

  if (!user) {
    const linkStyle = {
      display: 'inline-block',
      padding: '0.5rem 1.5rem',
      borderRadius: '0.375rem',
      textDecoration: 'none' as const,
      fontWeight: 500,
    }
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Weekly Commit</h1>
        <p style={{ color: '#6b7280' }}>Sign in or create an account to access your weekly commits.</p>
        <p style={{ color: '#9ca3af', fontSize: '0.8125rem', margin: 0 }}>
          New? Sign Up creates an account with our identity provider; then you can sign in.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href={oauthUrl()}
            style={{ ...linkStyle, backgroundColor: '#1e293b', color: 'white' }}
          >
            Sign In
          </a>
          <a
            href={oauthSignUpUrl()}
            style={{ ...linkStyle, backgroundColor: 'white', color: '#1e293b', border: '1px solid #1e293b' }}
          >
            Sign Up
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      {/* Host shell top bar */}
      <header style={{
        borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
      }}>
        <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Weekly Commit</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user.email}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.25rem 0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Remote app */}
      <main style={{ flex: 1 }}>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
          <WeeklyCommitApp
            userId={user.userId}
            orgId={user.orgId}
            authToken="cookie"
            onAuthExpired={handleAuthExpired}
            activeRallyCryId={undefined}
          />
        </Suspense>
      </main>
    </div>
  )
}
