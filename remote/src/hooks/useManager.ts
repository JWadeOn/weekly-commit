import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { manager } from '@/api/client'
import type { TeamResponse, WeeklyCommitResponse, ManagerNoteResponse } from '@/types'

export function useTeamDashboard() {
  return useQuery<TeamResponse>({
    queryKey: ['manager', 'team'],
    queryFn: () => manager.team(),
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
    mutationFn: ({ commitId, note }) => manager.addNote(commitId, note),
    onSuccess: (_, { userId, commitId }) => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'notes', userId, commitId] })
    },
  })
}
