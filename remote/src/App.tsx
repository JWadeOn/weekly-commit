import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { CommitPage } from '@/pages/CommitPage'
import { ManagerDashboard } from '@/pages/ManagerDashboard'
import { CommitDetailPage } from '@/pages/CommitDetailPage'

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
  const { fetchUser, isLoading } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<RoleRouter />} />
      <Route path="/commits" element={<CommitPage />} />
      <Route path="/commits/:id" element={<CommitDetailPage />} />
      <Route path="/manager" element={<ManagerDashboard />} />
    </Routes>
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
