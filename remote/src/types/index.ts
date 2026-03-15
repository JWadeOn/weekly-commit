export interface UserResponse {
  userId: string
  orgId: string
  email: string
  fullName: string
  roles: UserRole[]
  expiresAt: string
}

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'DUAL_ROLE' | 'ADMIN'

export interface AdminUserResponse {
  id: string
  email: string
  fullName: string
  managerId: string | null
  managerName: string | null
  roles: string[]
}

export interface CreateUserRequest {
  email: string
  fullName: string
  managerId: string | null
  roles: string[]
}

export interface UpdateUserRequest {
  managerId: string | null
  roles: string[]
}

export type ChessPiece = 'KING' | 'QUEEN' | 'ROOK' | 'BISHOP' | 'KNIGHT' | 'PAWN'

export type CommitStatus = 'DRAFT' | 'LOCKED' | 'RECONCILING' | 'RECONCILED'

export type CompletionStatus = 'COMPLETED' | 'PARTIAL' | 'NOT_COMPLETED' | 'BUMPED'

export const CHESS_WEIGHT: Record<ChessPiece, number> = {
  KING: 20,
  QUEEN: 10,
  ROOK: 5,
  BISHOP: 3,
  KNIGHT: 3,
  PAWN: 1,
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
  outcomeId: string | null
  outcomeBreadcrumb: OutcomeBreadcrumbDto | null
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
  unplanned: boolean
  /** STRATEGIC (default) or KLO */
  taskType: TaskType
  /** Non-null only for KLO items */
  kloCategory: KloCategory | null
  bumpedItemId: string | null
  bumpedItemTitle: string | null
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
  /** Snapshot of total weight taken when the commit was locked. Null until locked. */
  totalLockedWeight: number | null
  /** Sum of chessWeight for items currently marked COMPLETED. */
  totalDoneWeight: number
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
  bumpedCount?: number
}

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
}

export type UnitType = 'NUMERIC' | 'PERCENT' | 'CURRENCY' | 'TIME'

export type TaskType = 'STRATEGIC' | 'KLO'

export type KloCategory = 'BUGFIX' | 'MAINTENANCE' | 'SECURITY' | 'ADMIN'

export const KLO_CATEGORY_LABELS: Record<KloCategory, string> = {
  BUGFIX: 'Bug Fix',
  MAINTENANCE: 'Maintenance',
  SECURITY: 'Security',
  ADMIN: 'Admin',
}

export type VerificationType = 'LOAD_TEST' | 'QA' | 'PEER_REVIEW' | 'DASHBOARD'

export const VERIFICATION_LABELS: Record<VerificationType, string> = {
  LOAD_TEST: 'Load Test',
  QA: 'QA Sign-Off',
  PEER_REVIEW: 'Peer Review',
  DASHBOARD: 'Dashboard / Metrics',
}

export interface OutcomeUpdateDto {
  id: string
  outcomeId: string
  oldValue: number | null
  newValue: number
  actionTaken: string
  verificationType: VerificationType
  updatedByName: string | null
  timestamp: string
}

export interface OutcomeDto {
  id: string
  title: string
  ownerId: string
  startValue: number | null
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  unitLabel: string | null
  unitType: UnitType | null
  /** True when targetValue < startValue — gauge fills as the number decreases. */
  inverted: boolean
  lastUpdated: string | null
}

export interface DefiningObjectiveDto {
  id: string
  title: string
  description?: string | null
  outcomes: OutcomeDto[]
}

export interface RallyCryDto {
  id: string
  title: string
  description?: string | null
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
  hasObjectiveDecay: boolean
  maxCarryForwardCount: number
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
  lastUpdated?: string | null
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

export interface PivotRadarItemDto {
  userId: string
  fullName: string
  commitId: string
  itemId: string
  weekStartDate: string
  title: string
  description: string | null
  actualOutcome: string | null
  outcomeBreadcrumb: OutcomeBreadcrumbDto | null
  chessPiece: ChessPiece
  bumpedItemId: string | null
  bumpedItemTitle: string | null
}

/** Raw shape returned by GET /api/manager/team (array of members with flat fields) */
export interface TeamMemberApiResponse {
  userId: string
  fullName: string
  email: string
  currentCommitId: string | null
  currentCommitStatus: string | null
  alignmentScore: number | null
  itemCount: number
  alignmentTrend?: number[]
  lastUpdated?: string | null
  hasCarriedForwardItems?: boolean
  hasObjectiveDecay?: boolean
  maxCarryForwardCount?: number
}

export interface ManagerNoteResponse {
  id: string
  managerId: string
  managerName: string
  note: string
  createdAt: string
}

export interface TeamAlignmentContributorDto {
  userId: string
  fullName: string
  itemCount: number
}

export interface RallyCryBreakdownDto {
  rallyCryId: string
  title: string
  supportingItemCount: number
  supportingWeight: number
  weightPercentage: number
  contributors: TeamAlignmentContributorDto[]
}

export interface DefiningObjectiveBreakdownDto {
  definingObjectiveId: string
  rallyCryId: string
  title: string
  supportingItemCount: number
  supportingWeight: number
  weightPercentage: number
  allocationSharePercentage: number
  lowVelocity: boolean
  hasPowerPiece: boolean
}

export interface TeamAlignmentResponse {
  totalWeight: number
  alignedWeight: number
  alignmentPercentage: number
  strategicWeight: number
  tacticalWeight: number
  strategicPercentage: number
  teamIntegrityScore: number
  lockedOnMondayWeight: number
  doneWeight: number
  rallyCryBreakdown: RallyCryBreakdownDto[]
  underSupportedRallyCries?: UnderSupportedRallyCryDto[]
  definingObjectiveBreakdown?: DefiningObjectiveBreakdownDto[]
}

export interface UnderSupportedRallyCryDto {
  rallyCryId: string
  title: string
  supportPercentage: number
}

// Manager RCDO admin (full tree with active + owner names)
export interface AdminOutcomeDto {
  id: string
  definingObjectiveId: string
  title: string
  description: string | null
  ownerId: string
  ownerName: string
  active: boolean
  startValue: number | null
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  unitLabel: string | null
  unitType: UnitType | null
  /** True when targetValue < startValue — gauge fills as the number decreases. */
  inverted: boolean
  lastUpdated: string | null
}

export interface AdminDefiningObjectiveDto {
  id: string
  rallyCryId: string
  title: string
  description: string | null
  active: boolean
  outcomes: AdminOutcomeDto[]
}

export interface AdminRallyCryDto {
  id: string
  title: string
  description: string | null
  active: boolean
  definingObjectives: AdminDefiningObjectiveDto[]
}

export interface RcDoAdminResponse {
  rallyCries: AdminRallyCryDto[]
}

export interface OrgMemberDto {
  userId: string
  fullName: string
  email: string
}

export interface CreateRallyCryRequest {
  title: string
  description?: string
}

export interface UpdateRallyCryRequest {
  title: string
  description?: string
  active?: boolean
}

export interface CreateDefiningObjectiveRequest {
  rallyCryId: string
  title: string
  description?: string
}

export interface UpdateDefiningObjectiveRequest {
  title: string
  description?: string
  active?: boolean
}

export interface CreateOutcomeRequest {
  definingObjectiveId: string
  ownerId: string
  title: string
  description?: string
  startValue?: number
  targetValue: number
  unit: string
  unitLabel?: string
  unitType?: UnitType
}

export interface UpdateOutcomeRequest {
  ownerId?: string
  title: string
  description?: string
  active?: boolean
  startValue?: number
  targetValue?: number
  currentValue?: number
  unit?: string
  unitLabel?: string
  unitType?: UnitType
}

export interface UpdateOutcomeCurrentValueRequest {
  currentValue: number
  actionTaken: string
  verificationType: VerificationType
}

export interface ReconciliationSummary {
  completedCount: number
  partialCount: number
  notCompletedCount: number
  carriedForwardCount: number
  bumpedCount?: number
}

export interface ReconcileCommitResponse {
  id: string
  status: CommitStatus
  summary: ReconciliationSummary
}

export interface TeamOutcomeWeightResponse {
  /** outcomeId (UUID string) → summed chess weight for DRAFT + LOCKED commits this week */
  weights: Record<string, number>
  weekStartDate: string
  participatingCommits: number
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

export interface CreateUnplannedItemRequest {
  title: string
  description?: string
  /** Required for STRATEGIC; omit for KLO. */
  outcomeId?: string
  chessPiece: ChessPiece
  /** Omit when adding into existing ghost capacity (no new displacement needed). */
  bumpedItemId?: string
  taskType?: TaskType
  kloCategory?: KloCategory
  /** Reason recorded when no displacement is needed (debt-first path). */
  pivotReason?: string
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
