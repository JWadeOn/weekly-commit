import { useQuery } from '@tanstack/react-query'
import { rcdo } from '@/api/client'
import type { RcDoHierarchyResponse } from '@/types'

export function useRcdo() {
  return useQuery<RcDoHierarchyResponse>({
    queryKey: ['rcdo'],
    queryFn: () => rcdo.hierarchy(),
    staleTime: 5 * 60 * 1000, // 5 minutes — hierarchy rarely changes
  })
}
