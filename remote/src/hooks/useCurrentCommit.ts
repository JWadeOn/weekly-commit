import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commits } from '@/api/client'
import type {
  WeeklyCommitResponse,
  CommitItemResponse,
  CreateCommitItemRequest,
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

export function useUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation<WeeklyCommitResponse, Error, { id: string; body: UpdateStatusRequest }>({
    mutationFn: ({ id, body }) => commits.updateStatus(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(['commits', 'current'], data)
      queryClient.invalidateQueries({ queryKey: ['commits'] })
    },
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation<CommitItemResponse, Error, { commitId: string; item: CreateCommitItemRequest }>({
    mutationFn: ({ commitId, item }) => commits.createItem(commitId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { commitId: string; itemId: string }>({
    mutationFn: ({ commitId, itemId }) => commits.deleteItem(commitId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['commits', 'current'] })
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
