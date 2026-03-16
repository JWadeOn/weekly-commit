import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commits } from '@/api/client'
import type {
  WeeklyCommitResponse,
  CommitItemResponse,
  TeamOutcomeWeightResponse,
  CreateCommitItemRequest,
  CreateUnplannedItemRequest,
  UpdateCommitItemRequest,
  UpdateStatusRequest,
  ReconcileItemRequest,
  ReorderItem,
} from '@/types'

export function useCurrentCommit() {
  return useQuery<WeeklyCommitResponse>({
    queryKey: ['commits', 'current'],
    queryFn: () => commits.current(),
  })
}

export function useNextCommit() {
  return useQuery<WeeklyCommitResponse>({
    queryKey: ['commits', 'next'],
    queryFn: () => commits.next(),
  })
}

export function useCommit(id: string) {
  return useQuery<WeeklyCommitResponse>({
    queryKey: ['commits', id],
    queryFn: () => commits.getById(id),
    enabled: !!id,
  })
}

export function useCommitHistory(page = 0, size = 10) {
  return useQuery({
    queryKey: ['commits', 'history', page, size],
    queryFn: () => commits.history(page, size),
  })
}

export function useTeamOutcomeWeights() {
  return useQuery<TeamOutcomeWeightResponse>({
    queryKey: ['commits', 'team-outcomes', 'weight'],
    queryFn: () => commits.teamOutcomeWeights(),
    staleTime: 30 * 1000,   // 30 s — matches other team-facing queries
    refetchInterval: 60 * 1000, // re-poll every minute while the page is open
  })
}

export function useUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation<WeeklyCommitResponse, Error, { id: string; body: UpdateStatusRequest }>({
    mutationFn: ({ id, body }) => commits.updateStatus(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(['commits', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['commits'] })
    },
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation<CommitItemResponse, Error, { commitId: string; item: CreateCommitItemRequest }>({
    mutationFn: ({ commitId, item }) => commits.createItem(commitId, item),
    onSuccess: (_, { commitId }) => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['commits', 'next'] })
      queryClient.invalidateQueries({ queryKey: ['commits', commitId] })
    },
  })
}

export function useCreateUnplannedItem() {
  const queryClient = useQueryClient()
  return useMutation<
    CommitItemResponse,
    Error,
    { commitId: string; item: CreateUnplannedItemRequest }
  >({
    mutationFn: ({ commitId, item }) => commits.createUnplannedItem(commitId, item),
    onSuccess: (_, { commitId }) => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['commits', 'next'] })
      queryClient.invalidateQueries({ queryKey: ['commits', commitId] })
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  return useMutation<
    CommitItemResponse,
    Error,
    { commitId: string; itemId: string; item: UpdateCommitItemRequest }
  >({
    mutationFn: ({ commitId, itemId, item }) => commits.updateItem(commitId, itemId, item),
    onSuccess: (_, { commitId }) => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['commits', 'next'] })
      queryClient.invalidateQueries({ queryKey: ['commits', commitId] })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { commitId: string; itemId: string }>({
    mutationFn: ({ commitId, itemId }) => commits.deleteItem(commitId, itemId),
    onSuccess: (_, { commitId }) => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['commits', 'next'] })
      queryClient.invalidateQueries({ queryKey: ['commits', commitId] })
    },
  })
}

export function useReorderItems() {
  const queryClient = useQueryClient()
  return useMutation<
    CommitItemResponse[],
    Error,
    { commitId: string; items: ReorderItem[] },
    { previous: WeeklyCommitResponse | undefined }
  >({
    mutationFn: ({ commitId, items }) => commits.reorderItems(commitId, items),
    // Optimistic update — instant feel per US-1006
    onMutate: async ({ items }) => {
      await queryClient.cancelQueries({ queryKey: ['commits', 'current'] })
      const previous = queryClient.getQueryData<WeeklyCommitResponse>(['commits', 'current'])
      if (previous) {
        const updatedItems = previous.items.map((item) => {
          const reordered = items.find((r) => r.id === item.id)
          return reordered ? { ...item, priorityOrder: reordered.priorityOrder } : item
        })
        queryClient.setQueryData<WeeklyCommitResponse>(['commits', 'current'], {
          ...previous,
          items: updatedItems,
        })
      }
      return { previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['commits', 'current'], context.previous)
      }
    },
    onSettled: (_data, _err, { commitId }) => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['commits', 'next'] })
      queryClient.invalidateQueries({ queryKey: ['commits', commitId] })
    },
  })
}

export function useReconcileItem() {
  const queryClient = useQueryClient()
  return useMutation<
    CommitItemResponse,
    Error,
    { commitId: string; itemId: string; data: ReconcileItemRequest }
  >({
    mutationFn: ({ commitId, itemId, data }) => commits.reconcileItem(commitId, itemId, data),
    onSuccess: (_, { commitId }) => {
      queryClient.invalidateQueries({ queryKey: ['commits', commitId] })
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['commits', 'next'] })
    },
  })
}

export function useCompleteReconciliation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (commitId: string) => commits.completeReconciliation(commitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commits'] })
    },
  })
}
