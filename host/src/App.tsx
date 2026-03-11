import { Suspense, lazy, useEffect, useState } from 'react'

const WeeklyCommitApp = lazy(() => import('weeklyCommitModule/WeeklyCommitApp'))

const API_BASE = 'http://localhost:8080/api'

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
        window.location.href = 'http://localhost:8080/oauth2/authorization/oidc'
      }
    } catch {
      setUser(null)
      window.location.href = 'http://localhost:8080/oauth2/authorization/oidc'
    }
  }

  const handleAuthExpired = (): void => {
    setUser(null)
    window.location.href = 'http://localhost:8080/oauth2/authorization/oidc'
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Weekly Commit</h1>
        <p style={{ color: '#6b7280' }}>Sign in to access your weekly commits.</p>
        <a
          href="http://localhost:8080/oauth2/authorization/oidc"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1.5rem',
            backgroundColor: '#1e293b',
            color: 'white',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          Sign In
        </a>
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
