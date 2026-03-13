import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { CommitPage } from '@/pages/CommitPage'
import { ManagerDashboard } from '@/pages/ManagerDashboard'
import { StrategyPage } from '@/pages/StrategyPage'
import { CommitDetailPage } from '@/pages/CommitDetailPage'
import { CommitHistoryPage } from '@/pages/CommitHistoryPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { BoardPage } from '@/pages/BoardPage'
import { LoginPage } from '@/pages/LoginPage'
import { AppNav } from '@/components/AppNav'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function RoleRouter(): React.ReactElement {
  const { user } = useAuthStore()
  if (!user) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  const isManager = user.roles.includes('MANAGER') || user.roles.includes('DUAL_ROLE')
  return <Navigate to={isManager ? '/manager' : '/commits'} replace />
}

function AppRoutes(): React.ReactElement {
  const { fetchUser, isLoading, user } = useAuthStore()
  // Prevents a flash of LoginPage before the first fetchUser call resolves
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    fetchUser().finally(() => setHasFetched(true))
  }, [fetchUser])

  if (!hasFetched || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <AppNav />
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f1f5f9' }}>
        <Routes>
          <Route path="/" element={<RoleRouter />} />
          <Route path="/commits" element={<CommitPage />} />
          <Route path="/commits/:id" element={<CommitDetailPage />} />
          <Route path="/history" element={<CommitHistoryPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/strategy" element={<StrategyPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
