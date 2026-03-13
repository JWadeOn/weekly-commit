import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { manager } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import type {
  RcDoAdminResponse,
  OrgMemberDto,
  CreateRallyCryRequest,
  UpdateRallyCryRequest,
  CreateDefiningObjectiveRequest,
  UpdateDefiningObjectiveRequest,
  CreateOutcomeRequest,
  UpdateOutcomeRequest,
  UpdateOutcomeCurrentValueRequest,
  OutcomeUpdateDto,
} from '@/types'

export function useRcdoAdmin() {
  const user = useAuthStore((s) => s.user)
  const isManager = user?.roles.some((r) => r === 'MANAGER' || r === 'DUAL_ROLE') ?? false
  return useQuery<RcDoAdminResponse>({
    queryKey: ['manager', 'rcdo'],
    queryFn: () => manager.rcdo.getAdminHierarchy(),
    enabled: isManager,
  })
}

export function useOrgMembers() {
  return useQuery<OrgMemberDto[]>({
    queryKey: ['manager', 'rcdo', 'org-members'],
    queryFn: () => manager.rcdo.getOrgMembers(),
  })
}

export function useCreateRallyCry() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRallyCryRequest) => manager.rcdo.createRallyCry(body),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useUpdateRallyCry() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRallyCryRequest }) =>
      manager.rcdo.updateRallyCry(id, body),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useDeactivateRallyCry() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => manager.rcdo.deactivateRallyCry(id),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useCreateDefiningObjective() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDefiningObjectiveRequest) => manager.rcdo.createDefiningObjective(body),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useUpdateDefiningObjective() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDefiningObjectiveRequest }) =>
      manager.rcdo.updateDefiningObjective(id, body),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useDeactivateDefiningObjective() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => manager.rcdo.deactivateDefiningObjective(id),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useCreateOutcome() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOutcomeRequest) => manager.rcdo.createOutcome(body),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useUpdateOutcome() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOutcomeRequest }) =>
      manager.rcdo.updateOutcome(id, body),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useDeactivateOutcome() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => manager.rcdo.deactivateOutcome(id),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
    },
  })
}

export function useUpdateOutcomeCurrentValue() {
  const q = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOutcomeCurrentValueRequest }) =>
      manager.rcdo.updateOutcomeCurrentValue(id, body),
    onSuccess: (_data, { id }) => {
      q.invalidateQueries({ queryKey: ['manager', 'rcdo'] })
      q.invalidateQueries({ queryKey: ['rcdo'] })
      q.invalidateQueries({ queryKey: ['manager', 'rcdo', 'outcomes', id, 'history'] })
    },
  })
}

export function useOutcomeHistory(outcomeId: string | null) {
  return useQuery<OutcomeUpdateDto[]>({
    queryKey: ['manager', 'rcdo', 'outcomes', outcomeId, 'history'],
    queryFn: () => manager.rcdo.getOutcomeHistory(outcomeId!),
    enabled: outcomeId != null,
  })
}
