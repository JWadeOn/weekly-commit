import { Suspense, lazy } from 'react'

// Loaded at runtime via Module Federation from the remote service
const WeeklyCommitApp = lazy(() => import('weeklyCommitModule/WeeklyCommitApp'))

export default function App(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading Weekly Commit Module...</div>}>
      <WeeklyCommitApp
        userId="b0000000-0000-0000-0000-000000000002"
        orgId="a0000000-0000-0000-0000-000000000001"
        authToken="stub-auth-token"
        onAuthExpired={() => console.warn('Auth expired — stub handler')}
      />
    </Suspense>
  )
}
