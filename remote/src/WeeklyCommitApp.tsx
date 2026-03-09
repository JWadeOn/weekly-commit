import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { setAuthExpiredHandler } from '@/api/client'
import { CommitPage } from '@/pages/CommitPage'
import { ManagerDashboard } from '@/pages/ManagerDashboard'
import { CommitDetailPage } from '@/pages/CommitDetailPage'
import './index.css'

export interface WeeklyCommitAppProps {
  userId: string
  orgId: string
  authToken: string        // our internal JWT — not the OAuth provider token
  onAuthExpired: () => void
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
  if (!user) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  const isManager = user.roles.includes('MANAGER') || user.roles.includes('DUAL_ROLE')
  return <Navigate to={isManager ? '/manager' : '/commits'} replace />
}

function AppContent({ onAuthExpired }: { onAuthExpired: () => void }): React.ReactElement {
  const { fetchUser, isLoading } = useAuthStore()

  useEffect(() => {
    setAuthExpiredHandler(onAuthExpired)
    fetchUser()
  }, [fetchUser, onAuthExpired])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/commits" element={<CommitPage />} />
      <Route path="/commits/:id" element={<CommitDetailPage />} />
      <Route path="/manager" element={<ManagerDashboard />} />
    </Routes>
  )
}

export default function WeeklyCommitApp({ onAuthExpired }: WeeklyCommitAppProps): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent onAuthExpired={onAuthExpired} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
