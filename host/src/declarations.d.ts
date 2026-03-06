// Type declaration for the federated remote module.
// Mirrors the WeeklyCommitAppProps contract defined in remote/src/WeeklyCommitApp.tsx.
declare module 'weeklyCommitModule/WeeklyCommitApp' {
  import { type ComponentType } from 'react'

  export interface WeeklyCommitAppProps {
    userId: string
    orgId: string
    authToken: string
    onAuthExpired: () => void
  }

  const WeeklyCommitApp: ComponentType<WeeklyCommitAppProps>
  export default WeeklyCommitApp
}
