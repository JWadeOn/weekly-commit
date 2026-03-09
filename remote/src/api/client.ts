import type {
  UserResponse,
  RcDoHierarchyResponse,
  WeeklyCommitResponse,
  CommitSummaryResponse,
  PagedResponse,
  CommitItemResponse,
  TeamMemberApiResponse,
  TeamAlignmentResponse,
  ManagerNoteResponse,
  CreateCommitItemRequest,
  UpdateCommitItemRequest,
  UpdateStatusRequest,
  ReconcileItemRequest,
  ReorderItem,
  ReconcileCommitResponse,
  RcDoAdminResponse,
  OrgMemberDto,
  CreateRallyCryRequest,
  UpdateRallyCryRequest,
  CreateDefiningObjectiveRequest,
  UpdateDefiningObjectiveRequest,
  CreateOutcomeRequest,
  UpdateOutcomeRequest,
} from '@/types'

const BASE_URL = 'http://localhost:8080/api'

let _onAuthExpired: (() => void) | null = null

export function setAuthExpiredHandler(handler: () => void): void {
  _onAuthExpired = handler
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 401) {
    _onAuthExpired?.()
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    let errorData: { code: string; message: string } = { code: 'UNKNOWN_ERROR', message: 'An error occurred' }
    try {
      errorData = await response.json() as typeof errorData
    } catch {
      // ignore parse errors
    }
    const err = new Error(errorData.message)
    ;(err as Error & { code: string }).code = errorData.code
    throw err
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const auth = {
  me: (): Promise<UserResponse> => request('/auth/me'),
  logout: (): Promise<{ message: string }> =>
    request('/auth/logout', { method: 'POST' }),
}

export const rcdo = {
  hierarchy: (): Promise<RcDoHierarchyResponse> => request('/rcdo/hierarchy'),
}

export const commits = {
  current: (): Promise<WeeklyCommitResponse> => request('/commits/current'),

  getById: (id: string): Promise<WeeklyCommitResponse> => request(`/commits/${id}`),

  history: (page = 0, size = 10): Promise<PagedResponse<CommitSummaryResponse>> =>
    request(`/commits/history?page=${page}&size=${size}`),

  updateStatus: (id: string, body: UpdateStatusRequest): Promise<WeeklyCommitResponse> =>
    request(`/commits/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  createItem: (commitId: string, item: CreateCommitItemRequest): Promise<CommitItemResponse> =>
    request(`/commits/${commitId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  updateItem: (commitId: string, itemId: string, item: UpdateCommitItemRequest): Promise<CommitItemResponse> =>
    request(`/commits/${commitId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    }),

  deleteItem: (commitId: string, itemId: string): Promise<void> =>
    request(`/commits/${commitId}/items/${itemId}`, { method: 'DELETE' }),

  reorderItems: (commitId: string, items: ReorderItem[]): Promise<CommitItemResponse[]> =>
    request(`/commits/${commitId}/items/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  reconcileItem: (commitId: string, itemId: string, data: ReconcileItemRequest): Promise<CommitItemResponse> =>
    request(`/commits/${commitId}/items/${itemId}/reconcile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  completeReconciliation: (commitId: string): Promise<ReconcileCommitResponse> =>
    request(`/commits/${commitId}/reconcile`, { method: 'POST' }),
}

export const manager = {
  team: (): Promise<TeamMemberApiResponse[]> =>
    request('/manager/team'),

  getCommit: (userId: string, commitId: string): Promise<WeeklyCommitResponse> =>
    request(`/manager/team/${userId}/commits/${commitId}`),

  addNote: (userId: string, commitId: string, note: string): Promise<ManagerNoteResponse> =>
    request(`/manager/team/${userId}/commits/${commitId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),

  getNotes: (userId: string, commitId: string): Promise<ManagerNoteResponse[]> =>
    request(`/manager/team/${userId}/commits/${commitId}/notes`),

  teamAlignment: (): Promise<TeamAlignmentResponse> =>
    request('/manager/team/alignment'),

  rcdo: {
    getAdminHierarchy: (): Promise<RcDoAdminResponse> =>
      request('/manager/rcdo'),
    getOrgMembers: (): Promise<OrgMemberDto[]> =>
      request('/manager/rcdo/org-members'),
    createRallyCry: (body: CreateRallyCryRequest): Promise<RcDoAdminResponse['rallyCries'][0]> =>
      request('/manager/rcdo/rally-cries', { method: 'POST', body: JSON.stringify(body) }),
    updateRallyCry: (id: string, body: UpdateRallyCryRequest): Promise<RcDoAdminResponse['rallyCries'][0]> =>
      request(`/manager/rcdo/rally-cries/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deactivateRallyCry: (id: string): Promise<void> =>
      request(`/manager/rcdo/rally-cries/${id}`, { method: 'DELETE' }),
    createDefiningObjective: (body: CreateDefiningObjectiveRequest): Promise<RcDoAdminResponse['rallyCries'][0]['definingObjectives'][0]> =>
      request('/manager/rcdo/defining-objectives', { method: 'POST', body: JSON.stringify(body) }),
    updateDefiningObjective: (id: string, body: UpdateDefiningObjectiveRequest): Promise<RcDoAdminResponse['rallyCries'][0]['definingObjectives'][0]> =>
      request(`/manager/rcdo/defining-objectives/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deactivateDefiningObjective: (id: string): Promise<void> =>
      request(`/manager/rcdo/defining-objectives/${id}`, { method: 'DELETE' }),
    createOutcome: (body: CreateOutcomeRequest): Promise<RcDoAdminResponse['rallyCries'][0]['definingObjectives'][0]['outcomes'][0]> =>
      request('/manager/rcdo/outcomes', { method: 'POST', body: JSON.stringify(body) }),
    updateOutcome: (id: string, body: UpdateOutcomeRequest): Promise<RcDoAdminResponse['rallyCries'][0]['definingObjectives'][0]['outcomes'][0]> =>
      request(`/manager/rcdo/outcomes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deactivateOutcome: (id: string): Promise<void> =>
      request(`/manager/rcdo/outcomes/${id}`, { method: 'DELETE' }),
  },
}
