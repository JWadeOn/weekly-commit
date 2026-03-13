import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { manager } from '@/api/client'
import type {
  TeamResponse,
  TeamMemberResponse,
  TeamMemberApiResponse,
  TeamAlignmentResponse,
  WeeklyCommitResponse,
  ManagerNoteResponse,
  CommitStatus,
  RcDoAdminResponse,
  PivotRadarItemDto,
} from '@/types'
import type { Commit as BoardCommit } from '@/components/StrategicBoard'

/** Backend returns an array; normalize to TeamResponse for the UI */
function toTeamResponse(raw: TeamMemberApiResponse[]): TeamResponse {
  const teamMembers: TeamMemberResponse[] = raw.map((m) => ({
    userId: m.userId,
    fullName: m.fullName,
    email: m.email,
    alignmentTrend: m.alignmentTrend ?? (m.alignmentScore != null ? [Math.round(m.alignmentScore)] : []),
    lastUpdated: m.lastUpdated ?? null,
    currentCommit:
      m.currentCommitId && m.currentCommitStatus
        ? {
            id: m.currentCommitId,
            status: m.currentCommitStatus as CommitStatus,
            itemCount: m.itemCount,
            totalWeight: 0,
            alignmentScore: m.alignmentScore,
            lockedAt: null,
            viewedAt: null,
            hasCarriedForwardItems: m.hasCarriedForwardItems ?? false,
            hasObjectiveDecay: m.hasObjectiveDecay ?? false,
            maxCarryForwardCount: m.maxCarryForwardCount ?? 0,
          }
        : null,
  }))
  const scores = teamMembers
    .map((m) => m.currentCommit?.alignmentScore)
    .filter((s): s is number => s != null)
  const teamAlignmentScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  return {
    teamMembers,
    teamAlignmentScore,
    underSupportedRallyCries: [],
  }
}

export function useTeamDashboard() {
  return useQuery<TeamResponse>({
    queryKey: ['manager', 'team'],
    queryFn: async () => {
      const raw = await manager.team()
      return toTeamResponse(raw)
    },
    refetchInterval: 30_000,
  })
}

export function useTeamAlignment() {
  return useQuery<TeamAlignmentResponse>({
    queryKey: ['manager', 'team', 'alignment'],
    queryFn: () => manager.teamAlignment(),
    refetchInterval: 30_000,
  })
}

export function usePivotRadar(weeks = 2) {
  return useQuery<PivotRadarItemDto[]>({
    queryKey: ['manager', 'pivot-radar', weeks],
    queryFn: () => manager.pivotRadar(weeks),
    refetchInterval: 30_000,
  })
}

export function useRcdoHierarchy() {
  return useQuery<RcDoAdminResponse>({
    queryKey: ['manager', 'rcdo'],
    queryFn: () => manager.rcdo.getAdminHierarchy(),
  })
}

export function useManagerCommit(userId: string, commitId: string) {
  return useQuery<WeeklyCommitResponse>({
    queryKey: ['manager', 'commit', userId, commitId],
    queryFn: () => manager.getCommit(userId, commitId),
    enabled: !!userId && !!commitId,
  })
}

export function useManagerNotes(userId: string, commitId: string) {
  return useQuery<ManagerNoteResponse[]>({
    queryKey: ['manager', 'notes', userId, commitId],
    queryFn: () => manager.getNotes(userId, commitId),
    enabled: !!userId && !!commitId,
  })
}

export function useAddNote() {
  const queryClient = useQueryClient()
  return useMutation<ManagerNoteResponse, Error, { commitId: string; userId: string; note: string }>({
    mutationFn: ({ userId, commitId, note }) => manager.addNote(userId, commitId, note),
    onSuccess: (_, { userId, commitId }) => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'notes', userId, commitId] })
    },
  })
}

/** Fetch every team member's current commit in parallel and map to StrategicBoard format. */
export function useTeamItemsForBoard(): { commits: BoardCommit[]; loading: boolean } {
  const { data: team, isLoading: teamLoading } = useTeamDashboard()

  const membersWithCommit = (team?.teamMembers ?? []).filter(
    (m): m is TeamMemberResponse & { currentCommit: NonNullable<TeamMemberResponse['currentCommit']> } =>
      m.currentCommit != null,
  )

  const results = useQueries({
    queries: membersWithCommit.map((m) => ({
      queryKey: ['manager', 'commit', m.userId, m.currentCommit.id],
      queryFn: () => manager.getCommit(m.userId, m.currentCommit.id),
      staleTime: 30_000,
    })),
  })

  const loading = teamLoading || results.some((r) => r.isLoading)

  const commits: BoardCommit[] = results.flatMap((r, idx) => {
    const commit = r.data as WeeklyCommitResponse | undefined
    const member = membersWithCommit[idx]
    if (!member) return []
    if (!commit) return []
    return commit.items.map((item): BoardCommit => {
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
        definingObjective: item.outcomeBreadcrumb?.definingObjective ?? '',
        contributor: member.fullName,
      }
    })
  })

  return { commits, loading }
}
