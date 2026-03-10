import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
} from '@/types'

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
