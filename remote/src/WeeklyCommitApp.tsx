import React, { useEffect } from 'react'
import { ActiveRallyCryContext } from '@/context/ActiveRallyCryContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { setAuthExpiredHandler } from '@/api/client'
import { CommitPage } from '@/pages/CommitPage'
import { ManagerDashboard } from '@/pages/ManagerDashboard'
import { StrategyPage } from '@/pages/StrategyPage'
import { CommitDetailPage } from '@/pages/CommitDetailPage'
import { CommitHistoryPage } from '@/pages/CommitHistoryPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { BoardPage } from '@/pages/BoardPage'
import { AdminPage } from '@/pages/AdminPage'
import { AppNav } from '@/components/AppNav'
import './index.css'

/** Renders CommitPage (full UI + reconcile) for employee's own commit, or CommitDetailPage (read-only) for manager review. */
function CommitByIdOrDetail(): React.ReactElement {
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId')
  return userId ? <CommitDetailPage /> : <CommitPage />
}

export interface WeeklyCommitAppProps {
  userId: string
  orgId: string
  authToken: string        // our internal JWT — not the OAuth provider token
  onAuthExpired: () => void
  activeRallyCryId?: string  // Optional — host passes current Rally Cry to scope RCDO context
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function RoleRedirect(): React.ReactElement {
  const { user } = useAuthStore()
  console.log('[WeeklyCommitApp] RoleRedirect — user:', user?.roles)
  if (!user) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  const isManager = user.roles.includes('MANAGER') || user.roles.includes('DUAL_ROLE')
  const target = isManager ? '/manager' : '/commits'
  console.log('[WeeklyCommitApp] RoleRedirect — navigating to:', target)
  return <Navigate to={target} replace />
}

function AppContent({ onAuthExpired }: { onAuthExpired: () => void }): React.ReactElement {
  const { fetchUser, isLoading, user } = useAuthStore()

  useEffect(() => {
    console.log('[WeeklyCommitApp] AppContent mounted — calling fetchUser')
    setAuthExpiredHandler(onAuthExpired)
    fetchUser()
  }, [fetchUser, onAuthExpired])

  console.log('[WeeklyCommitApp] AppContent render — isLoading:', isLoading, 'user:', user?.email ?? null)

  // Block until we know auth state — avoids a flash of wrong route on first render
  if (isLoading || (!user && !isLoading)) {
    // If we've never fetched yet (user null, not loading), show spinner while
    // the useEffect fires and fetchUser runs.
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AppNav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/commits" element={<CommitPage />} />
          <Route path="/commits/:id" element={<CommitByIdOrDetail />} />
          <Route path="/history" element={<CommitHistoryPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/strategy" element={<StrategyPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function WeeklyCommitApp({ onAuthExpired, activeRallyCryId }: WeeklyCommitAppProps): JSX.Element {
  console.log('[WeeklyCommitApp] root render')
  return (
    <QueryClientProvider client={queryClient}>
      {/*
        MemoryRouter keeps all routing in memory — never touches window.location.
        This is required for MFEs embedded inside a host app so that internal
        navigation doesn't change the host's browser URL or trigger host re-renders.
      */}
      <MemoryRouter initialEntries={['/']} initialIndex={0}>
        <ActiveRallyCryContext.Provider value={activeRallyCryId}>
          <AppContent onAuthExpired={onAuthExpired} />
        </ActiveRallyCryContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
