export interface UserResponse {
  userId: string
  orgId: string
  email: string
  fullName: string
  roles: UserRole[]
  expiresAt: string
}

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'DUAL_ROLE'

export type ChessPiece = 'KING' | 'QUEEN' | 'ROOK' | 'BISHOP' | 'KNIGHT' | 'PAWN'

export type CommitStatus = 'DRAFT' | 'LOCKED' | 'RECONCILING' | 'RECONCILED'

export type CompletionStatus = 'COMPLETED' | 'PARTIAL' | 'NOT_COMPLETED'

export const CHESS_WEIGHT: Record<ChessPiece, number> = {
  KING: 100,
  QUEEN: 80,
  ROOK: 60,
  BISHOP: 40,
  KNIGHT: 20,
  PAWN: 10,
}

export const CHESS_ICON: Record<ChessPiece, string> = {
  KING: '♔',
  QUEEN: '♕',
  ROOK: '♖',
  BISHOP: '♗',
  KNIGHT: '♘',
  PAWN: '♙',
}

export interface OutcomeBreadcrumbDto {
  rallyCry: string
  definingObjective: string
  outcome: string
}

export interface CommitItemResponse {
  id: string
  weeklyCommitId: string
  outcomeId: string
  outcomeBreadcrumb: OutcomeBreadcrumbDto
  title: string
  description: string | null
  chessPiece: ChessPiece
  chessWeight: number
  priorityOrder: number
  actualOutcome: string | null
  completionStatus: CompletionStatus | null
  carryForward: boolean
  carryForwardCount: number
  carriedFromId: string | null
  createdAt: string
  updatedAt: string
}

export interface WeeklyCommitResponse {
  id: string
  userId: string
  weekStartDate: string
  weekEndDate: string
  status: CommitStatus
  lockedAt: string | null
  reconcilingAt: string | null
  reconciledAt: string | null
  viewedAt: string | null
  totalWeight: number
  alignmentScore: number | null
  items: CommitItemResponse[]
}

export interface CommitSummaryResponse {
  id: string
  weekStartDate: string
  weekEndDate: string
  status: CommitStatus
  totalWeight: number
  alignmentScore: number | null
  itemCount: number
  completedCount: number
  partialCount: number
  notCompletedCount: number
  carriedForwardCount: number
}

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
}

export interface OutcomeDto {
  id: string
  title: string
  ownerId: string
}

export interface DefiningObjectiveDto {
  id: string
  title: string
  outcomes: OutcomeDto[]
}

export interface RallyCryDto {
  id: string
  title: string
  definingObjectives: DefiningObjectiveDto[]
}

export interface RcDoHierarchyResponse {
  rallyCries: RallyCryDto[]
}

export interface CurrentCommitSummary {
  id: string
  status: CommitStatus
  itemCount: number
  totalWeight: number
  alignmentScore: number | null
  lockedAt: string | null
  viewedAt: string | null
  hasCarriedForwardItems: boolean
}

export interface AlignmentTrendEntry {
  score: number
}

export interface TeamMemberResponse {
  userId: string
  fullName: string
  email: string
  currentCommit: CurrentCommitSummary | null
  alignmentTrend: number[]
}

export interface UnderSupportedRallyCry {
  id: string
  title: string
  supportPercentage: number
}

export interface TeamResponse {
  teamMembers: TeamMemberResponse[]
  teamAlignmentScore: number
  underSupportedRallyCries: UnderSupportedRallyCry[]
}

export interface ManagerNoteResponse {
  id: string
  commitId: string
  authorId: string
  authorName: string
  note: string
  createdAt: string
}

export interface ReconciliationSummary {
  completedCount: number
  partialCount: number
  notCompletedCount: number
  carriedForwardCount: number
}

export interface ReconcileCommitResponse {
  id: string
  status: CommitStatus
  summary: ReconciliationSummary
}

export interface ErrorResponse {
  code: string
  message: string
}

export interface CreateCommitItemRequest {
  title: string
  description?: string
  outcomeId: string
  chessPiece: ChessPiece
}

export interface UpdateCommitItemRequest {
  title?: string
  description?: string
  outcomeId?: string
  chessPiece?: ChessPiece
}

export interface ReconcileItemRequest {
  actualOutcome: string
  completionStatus: CompletionStatus
  carryForward: boolean
}

export interface ReorderItem {
  id: string
  priorityOrder: number
}

export interface UpdateStatusRequest {
  status: CommitStatus
  notes?: string
}
