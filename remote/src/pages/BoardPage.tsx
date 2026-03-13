import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { commits as commitsApi } from '@/api/client'
import { StrategicBoard } from '@/components/StrategicBoard'
import { useTeamItemsForBoard } from '@/hooks/useManager'
import type { Commit as BoardCommit } from '@/components/StrategicBoard'
import type { WeeklyCommitResponse } from '@/types'

// ── Map a WeeklyCommitResponse's items to BoardCommit format ──
function mapItems(data: WeeklyCommitResponse, contributorName: string): BoardCommit[] {
  return data.items.map((item) => {
    const piece = (item.chessPiece.charAt(0) + item.chessPiece.slice(1).toLowerCase()) as BoardCommit['chessPiece']

    let status: BoardCommit['status']
    if (item.completionStatus === 'COMPLETED' || item.completionStatus === 'PARTIAL') {
      status = 'Done'
    } else if (item.completionStatus === 'BUMPED' || item.carryForward) {
      status = 'Bumped'
    } else {
      status = 'Pending'
    }

    return {
      id: item.id,
      taskName: item.title,
      chessPiece: piece,
      status,
      definingObjective: item.outcomeBreadcrumb.definingObjective,
      contributor: contributorName,
    }
  })
}

// ── Employee board: own commits only ──
function EmployeeBoard() {
  const { user } = useAuthStore()
  const { data, isLoading, isError } = useQuery<WeeklyCommitResponse>({
    queryKey: ['commits', 'current'],
    queryFn: () => commitsApi.current(),
    staleTime: 30_000,
    retry: 1,
  })

  if (isLoading) return <BoardPlaceholder text="Loading your commits…" />
  if (isError || !data) return <BoardPlaceholder text="No commits found for this week." />

  const commits = mapItems(data, user?.fullName ?? user?.email ?? 'Me')
  if (commits.length === 0) return <BoardPlaceholder text="No commits added yet this week." />

  return <StrategicBoard commits={commits} title="My Strategic Board" />
}

// ── Manager board: full team ──
function ManagerBoard() {
  const { commits, loading } = useTeamItemsForBoard()

  if (loading) return <BoardPlaceholder text="Loading team commits…" />
  if (commits.length === 0) return <BoardPlaceholder text="No team commits found for this week." />

  return <StrategicBoard commits={commits} title="Strategic Board" />
}

// ── Visible placeholder (uses app's light bg so it's always readable) ──
function BoardPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <p className="text-sm font-medium text-slate-400">{text}</p>
    </div>
  )
}

// ── Page entry point ──
export function BoardPage(): React.ReactElement {
  const { user } = useAuthStore()
  const isManager = user?.roles.includes('MANAGER') || user?.roles.includes('DUAL_ROLE')

  return isManager ? <ManagerBoard /> : <EmployeeBoard />
}
