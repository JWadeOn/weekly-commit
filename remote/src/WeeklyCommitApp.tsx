export interface WeeklyCommitAppProps {
  userId: string
  orgId: string
  authToken: string        // our internal JWT — not the OAuth provider token
  onAuthExpired: () => void
}

export default function WeeklyCommitApp(_props: WeeklyCommitAppProps): JSX.Element {
  return <div>Weekly Commit Module</div>
}
