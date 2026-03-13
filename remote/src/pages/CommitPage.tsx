import React, { useState, useContext } from 'react'
import { ActiveRallyCryContext } from '@/context/ActiveRallyCryContext'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Star,
  Users,
  Grid2x2,
  Zap,
  FileEdit,
  Info,
  ArrowRight,
  ClipboardList,
  XCircle,
  PanelRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CommitItem } from '@/components/CommitItem'
import { AddItemModal } from '@/components/AddItemModal'
import { UnplannedItemModal } from '@/components/UnplannedItemModal'
import { StatusBadge } from '@/components/StatusBadge'
import { TeamOutcomesSidebar } from '@/components/TeamOutcomesSidebar'
import {
  useCurrentCommit,
  useUpdateStatus,
  useCreateItem,
  useCreateUnplannedItem,
  useUpdateItem,
  useDeleteItem,
  useReorderItems,
  useReconcileItem,
  useCompleteReconciliation,
  useTeamOutcomeWeights,
} from '@/hooks/useCurrentCommit'
import { useRcdo } from '@/hooks/useRcdo'
import { useRcdoAdmin } from '@/hooks/useRcdoAdmin'
import { formatWeekRange } from '@/utils/formatDate'
import type { CommitItemResponse, ChessPiece, CompletionStatus, RallyCryDto } from '@/types'
import { CHESS_ICON, CHESS_WEIGHT } from '@/types'

const CHESS_PIECE_ORDER: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

// Chess layer visual groupings (matching the design's 4-category layout)
const CHESS_LAYERS = [
  {
    id: 'king',
    pieces: ['KING'] as ChessPiece[],
    label: 'Rally Cry',
    sublabel: 'King',
    Icon: Crown,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    accent: '#d4af37',
  },
  {
    id: 'queen',
    pieces: ['QUEEN', 'ROOK'] as ChessPiece[],
    label: 'Objectives',
    sublabel: 'Queen',
    Icon: Star,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    accent: '#7c3aed',
  },
  {
    id: 'bishop',
    pieces: ['BISHOP', 'KNIGHT'] as ChessPiece[],
    label: 'Supporting',
    sublabel: 'Bishop/Knight',
    Icon: Users,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accent: '#1152d4',
  },
  {
    id: 'pawn',
    pieces: ['PAWN'] as ChessPiece[],
    label: 'Operational',
    sublabel: 'Pawn',
    Icon: Grid2x2,
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-500',
    accent: '#64748b',
  },
]

// Impact bolts for reconciliation view based on chess weight
function ImpactBolts({ weight }: { weight: number }): React.ReactElement {
  const level = weight >= 200 ? 3 : weight >= 100 ? 2 : 1
  return (
    <div className="flex gap-0.5" style={{ color: '#d4af37' }}>
      {[1, 2, 3].map((i) => (
        <Zap
          key={i}
          className={`h-4 w-4 ${i <= level ? 'fill-current' : 'opacity-15'}`}
        />
      ))}
    </div>
  )
}

// Read-only Rally Cry banner for employee context (dark navy, matches Screen 3)
function StrategySummary({
  rallyCries,
}: {
  rallyCries: RallyCryDto[]
  activeRallyCryId?: string
}): React.ReactElement | null {
  const rc = rallyCries?.[0]
  if (!rc) return null

  return (
    <div className="w-full bg-[#1e293b] text-white p-5 rounded-xl border-b-4 border-[#1152d4] flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#1152d4]/20 rounded-full border border-[#1152d4]/30 shrink-0">
          <Crown className="h-6 w-6 text-[#1152d4]" />
        </div>
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1152d4]">Team Rally Cry</h3>
          <p className="text-xl font-black tracking-tight italic">&ldquo;{rc.title}&rdquo;</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm text-slate-400">Strategic Priority</p>
        <div className="flex items-center gap-2 justify-end mt-1">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-green-500">Active Campaign</span>
        </div>
      </div>
    </div>
  )
}

export function CommitPage(): React.ReactElement {
  const activeRallyCryId = useContext(ActiveRallyCryContext)
  const { data: commit, isLoading, error } = useCurrentCommit()
  const { data: rcdoData } = useRcdo()
  const updateStatus = useUpdateStatus()
  const createItem = useCreateItem()
  const createUnplannedItem = useCreateUnplannedItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const reorderItems = useReorderItems()
  const reconcileItem = useReconcileItem()
  const completeReconciliation = useCompleteReconciliation()

  // Team-wide aggregate weights from the new analytics endpoint
  const { data: teamOutcomeWeightData } = useTeamOutcomeWeights()

  // Admin RCDO provides ownerName; may 403 for non-managers — graceful fallback
  const { data: rcdoAdminData } = useRcdoAdmin()
  const ownerNameMap = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    rcdoAdminData?.rallyCries.forEach((rc) =>
      rc.definingObjectives.forEach((doObj) =>
        doObj.outcomes.forEach((o) => { map[o.ownerId] = o.ownerName })
      )
    )
    return map
  }, [rcdoAdminData])

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [unplannedModalOpen, setUnplannedModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CommitItemResponse | null>(null)
  const [hoveredOutcomeId, setHoveredOutcomeId] = useState<string | null>(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [reconcileData, setReconcileData] = useState<
    Record<string, { actualOutcome: string; completionStatus: CompletionStatus | ''; carryForward: boolean }>
  >({})
  const [reconcileTab, setReconcileTab] = useState<'planned' | 'unplanned'>('planned')
  const [showStrategicNudge, setShowStrategicNudge] = useState(false)
  const [confirmLockOpen, setConfirmLockOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (isLoading) return <div className="p-8 text-center text-slate-400 font-medium">Loading...</div>
  if (error) return <div className="p-8 text-center text-red-500">Failed to load commit</div>
  if (!commit) return <div className="p-8 text-center text-slate-400">No commit found</div>

  const itemsByPiece = CHESS_PIECE_ORDER.reduce<Record<ChessPiece, CommitItemResponse[]>>(
    (acc, piece) => {
      acc[piece] = commit.items
        .filter((i) => i.chessPiece === piece)
        .sort((a, b) => a.priorityOrder - b.priorityOrder)
      return acc
    },
    {} as Record<ChessPiece, CommitItemResponse[]>
  )

  const hasKingOrQueen = commit.items.some(
    (i) => i.chessPiece === 'KING' || i.chessPiece === 'QUEEN'
  )

  // Intent-based 3-phase Tension Loop progress
  const intentProgressPct =
    commit.status === 'DRAFT'
      ? Math.min(100, Math.round((commit.items.length / 3) * 100))
      : commit.status === 'LOCKED'
      ? 100
      : commit.totalLockedWeight
      ? Math.min(100, Math.round((commit.totalDoneWeight / commit.totalLockedWeight) * 100))
      : 0

  const progressLabel =
    commit.status === 'DRAFT'
      ? 'Planning Your Week'
      : commit.status === 'LOCKED'
      ? 'Commitment Active'
      : 'Execution Integrity'

  const progressColor =
    commit.status === 'RECONCILING' || commit.status === 'RECONCILED'
      ? intentProgressPct >= 80
        ? '#16a34a'
        : intentProgressPct >= 50
        ? '#f59e0b'
        : '#ef4444'
      : '#1152d4'

  // Integrity pct for RECONCILING/RECONCILED (weight-based)
  const integrityPct = commit.totalLockedWeight
    ? Math.min(100, Math.round((commit.totalDoneWeight / commit.totalLockedWeight) * 100))
    : 0
  const integrityColor =
    integrityPct >= 80 ? '#16a34a' : integrityPct >= 50 ? '#f59e0b' : '#ef4444'

  const handleDragEnd = (event: DragEndEvent, piece: ChessPiece): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const pieceItems = itemsByPiece[piece]
    const oldIndex = pieceItems.findIndex((i) => i.id === active.id)
    const newIndex = pieceItems.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...pieceItems]
    const spliced = reordered.splice(oldIndex, 1)
    const moved = spliced[0]
    if (!moved) return
    reordered.splice(newIndex, 0, moved)

    const reorderPayload = reordered.map((item, idx) => ({ id: item.id, priorityOrder: idx + 1 }))
    reorderItems.mutate({ commitId: commit.id, items: reorderPayload })
  }

  const handleSubmitWeek = (): void => {
    setConfirmLockOpen(false)
    setShowStrategicNudge(false)
    updateStatus.mutate({ id: commit.id, body: { status: 'LOCKED' } })
  }

  const handleLockAttempt = (): void => {
    const pawnCount = commit.items.filter((i) => i.chessPiece === 'PAWN').length
    const kqCount = commit.items.filter((i) => i.chessPiece === 'KING' || i.chessPiece === 'QUEEN').length
    if (kqCount === 0 && pawnCount > 5) {
      setShowStrategicNudge(true)
    } else {
      setConfirmLockOpen(true)
    }
  }

  const handleRetract = (): void => {
    updateStatus.mutate({ id: commit.id, body: { status: 'DRAFT' } })
  }

  const handleStartReconciliation = (): void => {
    updateStatus.mutate({ id: commit.id, body: { status: 'RECONCILING' } })
  }

  const handleReconcileItem = (itemId: string): void => {
    const data = reconcileData[itemId]
    if (!data || !data.completionStatus) return
    reconcileItem.mutate({
      commitId: commit.id,
      itemId,
      data: {
        actualOutcome: data.actualOutcome,
        completionStatus: data.completionStatus as CompletionStatus,
        carryForward: data.carryForward,
      },
    })
  }

  const handleCompleteReconciliation = (): void => {
    completeReconciliation.mutate(commit.id)
  }

  const getReconcileState = (itemId: string) =>
    reconcileData[itemId] ?? { actualOutcome: '', completionStatus: '' as const, carryForward: false }

  const updateReconcileField = (itemId: string, field: string, value: string | boolean): void => {
    setReconcileData((prev) => ({
      ...prev,
      [itemId]: {
        ...getReconcileState(itemId),
        [field]: value,
      },
    }))
  }

  const plannedItems = commit.items.filter((i) => !i.unplanned)
  const unplannedItems = commit.items.filter((i) => i.unplanned)

  // ── Morning View HUD calculations (LOCKED state) ──────────────────────────
  const hudWeekEnd = new Date(commit.weekEndDate)
  const hudDaysLeft = Math.max(0, Math.ceil((hudWeekEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const hudWeekStart = new Date(commit.weekStartDate)
  const hudWeekNum = Math.ceil(
    (hudWeekStart.getTime() - new Date(hudWeekStart.getFullYear(), 0, 1).getTime()) /
    (7 * 24 * 60 * 60 * 1000)
  )

  // Sidebar gap count — outcomes with 0 team weight (server data) or 0 personal weight (fallback)
  const committedOutcomeIds = new Set(commit.items.map((i) => i.outcomeId))
  const sidebarGapCount = (rcdoData?.rallyCries ?? [])
    .flatMap((rc) => rc.definingObjectives.flatMap((doObj) => doObj.outcomes))
    .filter((o) => teamOutcomeWeightData
      ? (teamOutcomeWeightData.weights[o.id] ?? 0) === 0
      : !committedOutcomeIds.has(o.id)
    ).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Rally Cry context */}
      <StrategySummary rallyCries={rcdoData?.rallyCries ?? []} activeRallyCryId={activeRallyCryId} />

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">
            {commit.status === 'DRAFT' ? 'Monday Commitment' : commit.status === 'LOCKED' ? 'This Week\'s Focus' : commit.status === 'RECONCILING' ? 'Friday Reconciliation' : 'Week Reconciled'}
          </h1>
          <p className="text-slate-500 text-sm">
            {commit.status === 'DRAFT' ? 'Draft your weekly focus and align with outcomes.' : commit.status === 'LOCKED' ? 'Your plan is locked and in execution.' : commit.status === 'RECONCILING' ? 'Compare committed goals with actual outcomes.' : `${formatWeekRange(commit.weekStartDate, commit.weekEndDate)}`}
          </p>
        </div>
        <div className="w-full md:w-64 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-700">{progressLabel}</span>
            <span className="text-sm font-bold" style={{ color: progressColor }}>{intentProgressPct}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${intentProgressPct}%`, backgroundColor: progressColor }}
            />
          </div>
          <p className="text-[10px] mt-2 text-slate-400 uppercase tracking-wider font-bold">
            {commit.status === 'DRAFT'
              ? 'Add 3+ items to unlock'
              : commit.status === 'LOCKED'
              ? 'Monday Promise locked in'
              : 'Weight-based integrity score'}
          </p>
        </div>
      </div>

      {/* ── DRAFT ── */}
      {commit.status === 'DRAFT' && (
        <div className="flex gap-6 items-start">
          {/* ── Main content column ── */}
          <div className="flex-1 min-w-0 space-y-6">
          {/* Lifecycle tabs */}
          <div
            className="bg-white rounded-xl border p-1 flex"
            style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
          >
            <button
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: '#1e293b' }}
            >
              <FileEdit className="h-4 w-4" />
              Draft
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors">
              <Lock className="h-4 w-4" />
              Locked
            </button>
          </div>

          {/* Progress card */}
          <div
            className="bg-white rounded-xl border p-5 space-y-3"
            style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
          >
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-base font-bold text-slate-900">Planning Your Week</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {formatWeekRange(commit.weekStartDate, commit.weekEndDate)}
                </p>
              </div>
              <span className="text-2xl font-black" style={{ color: '#1152d4' }}>
                {intentProgressPct}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${intentProgressPct}%`, backgroundColor: '#1152d4' }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {commit.items.length} item{commit.items.length !== 1 ? 's' : ''} — add at least 3 to publish
            </p>
            {commit.items.length > 0 && !hasKingOrQueen && (
              <div
                className="flex items-center gap-2 text-sm font-medium p-3 rounded-lg border"
                style={{ backgroundColor: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.25)', color: '#7a5c00' }}
              >
                <Info className="h-4 w-4 shrink-0" style={{ color: '#d4af37' }} />
                <span>No King or Queen items — consider your highest-leverage work.</span>
              </div>
            )}
          </div>

          {/* Chess layer grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CHESS_LAYERS.map((layer) => {
              const hasItems = layer.pieces.some((p) => itemsByPiece[p]?.length > 0)
              const count = layer.pieces.reduce((sum, p) => sum + (itemsByPiece[p]?.length ?? 0), 0)
              return (
                <div
                  key={layer.id}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-white border transition-all ${
                    hasItems ? 'ring-2 shadow-sm' : ''
                  }`}
                  style={{
                    borderColor: hasItems ? layer.accent : '#e2e8f0',
                    ...(hasItems ? { ringColor: `${layer.accent}33` } : {}),
                    boxShadow: hasItems ? `0 0 0 2px ${layer.accent}22` : undefined,
                  }}
                >
                  <div
                    className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg ${layer.iconBg}`}
                  >
                    <layer.Icon className={`h-4 w-4 ${layer.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {layer.sublabel}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{layer.label}</p>
                    {count > 0 && (
                      <p className="text-[10px] text-slate-400">{count} item{count !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Items section header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              {commit.items.length === 0
                ? 'No items yet — add your first commit item.'
                : `${commit.items.length} item${commit.items.length !== 1 ? 's' : ''} this week`}
            </p>
            <div className="flex items-center gap-2">
              {/* Mobile: open outcomes drawer */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors"
                style={{
                  borderColor: '#e2e8f0',
                  color: sidebarGapCount > 0 ? '#d4af37' : '#64748b',
                  backgroundColor: 'white',
                }}
                aria-label="View team outcomes"
              >
                <PanelRight className="h-3.5 w-3.5" />
                Goals
                {sidebarGapCount > 0 && (
                  <span
                    className="ml-0.5 text-[9px] font-black px-1 rounded-full"
                    style={{ backgroundColor: '#d4af37', color: '#1e293b' }}
                  >
                    {sidebarGapCount}
                  </span>
                )}
              </button>
              <Button
                onClick={() => setAddModalOpen(true)}
                size="sm"
                className="text-white font-bold shadow-sm"
                style={{ backgroundColor: '#1e293b' }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Items grouped by chess piece */}
          {CHESS_PIECE_ORDER.map((piece) => {
            const items = itemsByPiece[piece]
            if (items.length === 0) return null
            return (
              <div key={piece} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{CHESS_ICON[piece]}</span>
                  <span className="text-sm font-bold text-slate-600">{piece}</span>
                  <span className="text-xs text-slate-400 font-normal">— wt {CHESS_WEIGHT[piece]}</span>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, piece)}
                >
                  <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <CommitItem
                          key={item.id}
                          item={item}
                          isDraggable
                          isHighlighted={hoveredOutcomeId === item.outcomeId}
                          onEdit={() => setEditingItem(item)}
                          onDelete={() => {
                            if (confirm('Delete this item?')) {
                              deleteItem.mutate({ commitId: commit.id, itemId: item.id })
                            }
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )
          })}

          {/* Strategic Nudge Dialog — appears before lock if 0 Kings/Queens + >5 Pawns */}
          <AlertDialog open={showStrategicNudge} onOpenChange={setShowStrategicNudge}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <span style={{ color: '#d4af37' }}>♔</span> Strategic Opportunity
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Your week is heavy on routine tasks. Is there one "King Move" you can prioritize
                  instead to drive the Team Outcome? A single King (20x) outweighs five Pawns combined.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowStrategicNudge(false)}>
                  Go Back &amp; Reconsider
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { setShowStrategicNudge(false); setConfirmLockOpen(true) }}
                  className="bg-slate-700 hover:bg-slate-800 text-white"
                >
                  Continue Anyway
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Confirm Lock Dialog */}
          <AlertDialog open={confirmLockOpen} onOpenChange={setConfirmLockOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit your weekly commit?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will lock your commit and notify your manager. You can retract it until
                  your manager views it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmitWeek}>Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Finalize button */}
          {commit.items.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLockAttempt}
                disabled={updateStatus.isPending}
                className="flex items-center gap-2 px-10 py-4 text-white rounded-xl font-bold text-base shadow-xl transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#1e293b' }}
              >
                <Lock className="h-5 w-5" />
                Finalize &amp; Lock Week
              </button>
            </div>
          )}
          </div>

          {/* ── Team Outcomes Sidebar ── */}
          <TeamOutcomesSidebar
            rallyCries={rcdoData?.rallyCries ?? []}
            commitItems={commit.items}
            teamWeights={teamOutcomeWeightData?.weights}
            participatingCommits={teamOutcomeWeightData?.participatingCommits}
            hoveredOutcomeId={hoveredOutcomeId}
            onHoverOutcome={setHoveredOutcomeId}
            ownerNameMap={ownerNameMap}
            mobileOpen={mobileDrawerOpen}
            onMobileClose={() => setMobileDrawerOpen(false)}
          />
        </div>
      )}

      {/* ── LOCKED — Morning View HUD ── */}
      {commit.status === 'LOCKED' && (
        <>
          {/* ━━━━ 1. PULSE HEADER ━━━━ */}
          <section
            aria-label="Weekly Pulse Header"
            className="relative overflow-hidden rounded-2xl bg-[#1e293b] text-white shadow-2xl shadow-[#1e293b]/30"
          >
            {/* Atmospheric depth */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 size-52 bg-[#1152d4]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 size-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 p-6 space-y-5">
              {/* Top row: label + week + status chips */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#1152d4]">Morning View</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Week {hudWeekNum}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    hudDaysLeft === 0
                      ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                      : hudDaysLeft <= 2
                      ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  }`}>
                    <span className={`size-1.5 rounded-full ${
                      hudDaysLeft === 0 ? 'bg-red-400 animate-pulse' :
                      hudDaysLeft <= 2 ? 'bg-orange-400 animate-pulse' :
                      'bg-emerald-400'
                    }`} />
                    {hudDaysLeft === 0
                      ? 'Last Day'
                      : `${hudDaysLeft} Day${hudDaysLeft !== 1 ? 's' : ''} Remaining`}
                  </span>
                </div>
              </div>

              {/* Rally Cry anchor */}
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-[#1152d4]/20 rounded-xl border border-[#1152d4]/30 shrink-0 mt-0.5">
                  <Crown className="h-5 w-5 text-[#1152d4]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#1152d4] mb-1">Rallying Cry</p>
                  <p className="text-xl font-black tracking-tight leading-snug text-white">
                    {rcdoData?.rallyCries?.[0]?.title ?? '—'}
                  </p>
                </div>
              </div>

              {/* Commitment Active bar — 100% solid signals Monday Promise is set */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#1152d4] uppercase tracking-widest">Commitment Active</span>
                  <span className="text-xs font-bold text-white">
                    {commit.items.length} item{commit.items.length !== 1 ? 's' : ''} locked
                    <span className="text-slate-500 font-normal"> · wt {commit.totalLockedWeight ?? commit.totalWeight}</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#1152d4]" style={{ width: '100%' }} />
                </div>
                <p className="text-[10px] text-slate-500">
                  {formatWeekRange(commit.weekStartDate, commit.weekEndDate)}
                </p>
              </div>
            </div>
          </section>

          {/* ━━━━ 2. STRATEGIC HUD LIST ━━━━ */}
          <section aria-label="Strategic task list" className="space-y-6">
            {CHESS_LAYERS.map((layer) => {
              const layerItems = layer.pieces.flatMap((p) => itemsByPiece[p] ?? [])
              if (layerItems.length === 0) return null
              const layerDone = layerItems.filter((i) => i.completionStatus === 'COMPLETED').length
              return (
                <div key={layer.id} className="space-y-3">
                  {/* Layer header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider"
                        style={{
                          backgroundColor: `${layer.accent}15`,
                          borderColor: `${layer.accent}30`,
                          color: layer.accent,
                        }}
                      >
                        {layer.sublabel}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {layer.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold tabular-nums">
                      {layerDone}/{layerItems.length}
                    </span>
                  </div>

                  {/* Task cards */}
                  {layerItems.map((item) => {
                    const isDone = item.completionStatus === 'COMPLETED'
                    const isThisPending = reconcileItem.isPending && reconcileItem.variables?.itemId === item.id
                    return (
                      <article
                        key={item.id}
                        aria-label={`Task: ${item.title}${isDone ? ' — completed' : ''}`}
                        className={`bg-white border rounded-2xl p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-300 ${
                          isDone
                            ? 'opacity-50 border-slate-100'
                            : 'border-slate-200 hover:border-[#1152d4]/30 hover:shadow-sm'
                        }`}
                        style={{ boxShadow: isDone ? 'none' : '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
                      >
                        {/* Left accent bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-opacity duration-300"
                          style={{ backgroundColor: isDone ? '#cbd5e1' : layer.accent }}
                        />

                        {/* Chess piece icon */}
                        <div
                          className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all duration-300 ${
                            isDone ? 'bg-slate-100' : layer.iconBg
                          }`}
                        >
                          <layer.Icon
                            className={`h-5 w-5 transition-colors duration-300 ${
                              isDone ? 'text-slate-300' : layer.iconColor
                            }`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h5
                                className={`font-bold text-sm leading-snug transition-all duration-300 ${
                                  isDone ? 'line-through text-slate-400' : 'text-[#1e293b]'
                                }`}
                              >
                                {item.title}
                              </h5>
                              {/* Hard link to Outcome */}
                              {item.outcomeBreadcrumb && (
                                <>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <ArrowRight
                                      className={`h-3 w-3 shrink-0 transition-colors duration-300 ${
                                        isDone ? 'text-slate-300' : 'text-[#1152d4]'
                                      }`}
                                    />
                                    <span
                                      className={`text-[11px] font-semibold truncate transition-colors duration-300 ${
                                        isDone ? 'text-slate-300' : 'text-[#1152d4]'
                                      }`}
                                      title={`${item.outcomeBreadcrumb.definingObjective} → ${item.outcomeBreadcrumb.outcome}`}
                                    >
                                      {item.outcomeBreadcrumb.outcome}
                                    </span>
                                  </div>
                                  {item.outcomeBreadcrumb.definingObjective && (
                                    <p
                                      className={`text-[10px] mt-0.5 truncate transition-colors duration-300 ${
                                        isDone ? 'text-slate-300' : 'text-slate-400'
                                      }`}
                                    >
                                      {item.outcomeBreadcrumb.definingObjective}
                                    </p>
                                  )}
                                </>
                              )}
                              {item.unplanned && (
                                <span
                                  className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase"
                                  style={{ color: isDone ? '#94a3b8' : '#d4af37' }}
                                >
                                  <Zap className="h-3 w-3 fill-current" />
                                  Unplanned Pivot
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors duration-300 ${
                                isDone ? 'text-slate-300' : 'text-slate-400'
                              }`}
                            >
                              wt {item.chessWeight}
                            </span>
                          </div>
                        </div>

                        {/* Mark Done toggle */}
                        <div className="shrink-0 flex flex-col items-center gap-1 ml-1">
                          <button
                            role="checkbox"
                            aria-checked={isDone}
                            aria-label={isDone ? `Unmark "${item.title}" as done` : `Mark "${item.title}" as done`}
                            disabled={isThisPending}
                            onClick={() => {
                              reconcileItem.mutate({
                                commitId: commit.id,
                                itemId: item.id,
                                data: {
                                  actualOutcome: item.title,
                                  completionStatus: isDone ? 'NOT_COMPLETED' : 'COMPLETED',
                                  carryForward: false,
                                },
                              })
                            }}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                              isThisPending
                                ? 'opacity-40 cursor-not-allowed border-slate-300'
                                : isDone
                                ? 'bg-[#1152d4] border-[#1152d4] hover:opacity-80'
                                : 'border-slate-300 hover:border-[#1152d4] bg-white'
                            }`}
                          >
                            {isDone && <CheckCircle2 className="h-4 w-4 text-white" />}
                          </button>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            {isDone ? 'Done' : 'Mark'}
                          </span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )
            })}

            {commit.items.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-400 text-sm">No committed tasks this week.</p>
              </div>
            )}
          </section>

          {/* ━━━━ 3. PIVOT TRIGGER ━━━━ */}
          <div className="space-y-2">
            <button
              aria-label="Add an unplanned task — triggers Mid-Week Pivot selection"
              onClick={() => setUnplannedModalOpen(true)}
              disabled={commit.items.filter((i) => !i.unplanned).length === 0}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm transition-all bg-[#1e293b] text-white hover:bg-[#0f172a] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#1e293b]/20"
            >
              <div className="p-1.5 bg-[#1152d4]/20 rounded-lg border border-[#1152d4]/30">
                <Zap className="h-4 w-4 text-[#1152d4]" />
              </div>
              <span>Add Unplanned Task</span>
              <span className="text-xs font-medium text-slate-400">— Mid-Week Pivot</span>
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Adding a task mid-week requires selecting which committed item is being bumped.
            </p>
          </div>

          {/* ━━━━ 4. BOTTOM ACTIONS ━━━━ */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            {commit.viewedAt ? (
              <p className="text-sm text-slate-400 text-center py-2">
                Manager has viewed this commit — retract no longer available.
              </p>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full font-bold"
                    disabled={updateStatus.isPending}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Retract Submission
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retract your submission?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your commit will return to Draft status and you can make changes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRetract}>Retract</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="secondary"
              className="w-full font-bold"
              onClick={handleStartReconciliation}
              disabled={updateStatus.isPending}
            >
              Start Early Reconciliation
            </Button>
          </div>
        </>
      )}

      {/* ── RECONCILING ── */}
      {commit.status === 'RECONCILING' && (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6" style={{ borderColor: 'rgba(30,58,95,0.08)' }}>
            <div>
              <nav className="flex gap-2 text-sm text-slate-400 mb-2 font-medium">
                <span>Week Review</span>
              </nav>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Reconciliation
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm max-w-xl">
                Compare committed goals with actual outcomes. Mark each item before finalizing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnplannedModalOpen(true)}
                disabled={plannedItems.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add unplanned
              </Button>
            </div>
          </div>

          {/* Stats overview */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="bg-white p-5 rounded-xl border"
              style={{ borderColor: 'rgba(30,58,95,0.06)', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Committed</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900">{plannedItems.length}</span>
                <span className="text-slate-400 font-semibold text-sm">Tasks</span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#1152d4' }} />
              </div>
            </div>
            <div
              className="bg-white p-5 rounded-xl border"
              style={{ borderColor: 'rgba(30,58,95,0.06)', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Weight Done</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900">{commit.totalDoneWeight}</span>
                <span className="text-slate-400 font-semibold text-sm">/ {commit.totalLockedWeight ?? commit.totalWeight}</span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${commit.items.length > 0 ? Math.round((commit.items.filter((i) => i.completionStatus === 'COMPLETED').length / commit.items.length) * 100) : 0}%`,
                    backgroundColor: '#16a34a',
                  }}
                />
              </div>
            </div>
            <div
              className="bg-white p-5 rounded-xl border"
              style={{
                borderColor: `${integrityColor}33`,
                boxShadow: `0 1px 3px 0 rgb(0 0 0 / 0.04), inset 0 0 0 1px ${integrityColor}22`,
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Execution Integrity</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold" style={{ color: integrityColor }}>{integrityPct}%</span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${integrityPct}%`, backgroundColor: integrityColor }}
                />
              </div>
              <p className="text-[10px] mt-1.5 font-semibold" style={{ color: integrityColor }}>
                {integrityPct >= 80 ? 'High Success' : integrityPct >= 50 ? 'Partial Delivery' : 'Strategic Shortfall'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid rgba(30,58,95,0.08)' }}>
            <div className="flex gap-8">
              <button
                onClick={() => setReconcileTab('planned')}
                className={`pb-3 border-b-[3px] text-sm font-bold tracking-tight transition-colors ${
                  reconcileTab === 'planned'
                    ? 'text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
                style={reconcileTab === 'planned' ? { borderColor: '#1152d4', color: '#1152d4' } : {}}
              >
                PLANNED VS ACTUAL
              </button>
              <button
                onClick={() => setReconcileTab('unplanned')}
                className={`pb-3 border-b-[3px] text-sm font-bold tracking-tight transition-colors ${
                  reconcileTab === 'unplanned'
                    ? 'text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
                style={reconcileTab === 'unplanned' ? { borderColor: '#1152d4', color: '#1152d4' } : {}}
              >
                UNPLANNED TASKS{unplannedItems.length > 0 ? ` (${unplannedItems.length})` : ''}
              </button>
            </div>
          </div>

          {/* Planned vs Actual — Reconciliation Ledger */}
          {reconcileTab === 'planned' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <ClipboardList className="h-5 w-5" style={{ color: '#d4af37' }} />
                  Reconciliation Ledger
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    ACHIEVED
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    TO BE CARRIED FORWARD
                  </span>
                </div>
              </div>

              <div
                className="overflow-hidden rounded-xl border bg-white"
                style={{ borderColor: 'rgba(30,58,95,0.08)', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b" style={{ backgroundColor: '#f8faff', borderColor: 'rgba(30,58,95,0.08)' }}>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Task / Commitment
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Chess Layer
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Impact
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-center">
                        Status
                      </th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'rgba(30,58,95,0.05)' }}>
                    {commit.items
                      .filter((i) => !i.unplanned)
                      .sort(
                        (a, b) =>
                          CHESS_PIECE_ORDER.indexOf(a.chessPiece) -
                          CHESS_PIECE_ORDER.indexOf(b.chessPiece)
                      )
                      .map((item) => {
                        const state = getReconcileState(item.id)
                        const alreadyReconciled = item.completionStatus !== null
                        const isBumpedItem = commit.items.some((o) => o.bumpedItemId === item.id)
                        const requiresReason =
                          state.completionStatus === 'PARTIAL' ||
                          state.completionStatus === 'NOT_COMPLETED'
                        const saveDisabled =
                          !state.completionStatus ||
                          (requiresReason && !state.actualOutcome.trim()) ||
                          reconcileItem.isPending

                        const layer = CHESS_LAYERS.find((l) => l.pieces.includes(item.chessPiece))
                        const isCarryForward =
                          item.completionStatus === 'NOT_COMPLETED' ||
                          item.completionStatus === 'PARTIAL'

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isCarryForward ? 'bg-red-50/20 hover:bg-red-50/30' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                                {isCarryForward && item.completionStatus && (
                                  <ArrowRight className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                )}
                              </div>
                              {item.completionStatus === 'NOT_COMPLETED' && (
                                <p className="text-[10px] text-red-600 mt-1 uppercase font-bold flex items-center gap-1">
                                  Carry Forward
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {layer && (
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${layer.iconBg}`}
                                  >
                                    <layer.Icon className={`h-3.5 w-3.5 ${layer.iconColor}`} />
                                  </div>
                                  <span
                                    className="text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded border"
                                    style={{
                                      backgroundColor: `${layer.accent}08`,
                                      borderColor: `${layer.accent}20`,
                                      color: layer.accent,
                                    }}
                                  >
                                    {item.chessPiece}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <ImpactBolts weight={item.chessWeight} />
                            </td>
                            <td className="px-5 py-4 text-center">
                              {alreadyReconciled ? (
                                item.completionStatus === 'COMPLETED' ? (
                                  <CheckCircle2 className="h-6 w-6 text-green-500 fill-green-100 mx-auto" />
                                ) : item.completionStatus === 'NOT_COMPLETED' ? (
                                  <XCircle className="h-6 w-6 text-red-400 mx-auto" />
                                ) : (
                                  <Badge variant="warning" className="text-xs mx-auto">
                                    {item.completionStatus}
                                  </Badge>
                                )
                              ) : (
                                <span className="text-xs text-slate-300 font-medium">Pending</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {!alreadyReconciled && (
                                <div className="space-y-2 min-w-[180px]">
                                  <Select
                                    value={state.completionStatus}
                                    onValueChange={(v) =>
                                      updateReconcileField(item.id, 'completionStatus', v)
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue placeholder="Select status..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="COMPLETED">Completed</SelectItem>
                                      <SelectItem value="PARTIAL">Partial</SelectItem>
                                      <SelectItem value="NOT_COMPLETED">Not Completed</SelectItem>
                                      {isBumpedItem && (
                                        <SelectItem value="BUMPED">Bumped</SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {requiresReason && (
                                    <>
                                      <Textarea
                                        value={state.actualOutcome}
                                        onChange={(e) =>
                                          updateReconcileField(item.id, 'actualOutcome', e.target.value)
                                        }
                                        placeholder="Why was this not completed?"
                                        rows={2}
                                        className="text-xs resize-none"
                                      />
                                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                                        <input
                                          type="checkbox"
                                          checked={state.carryForward}
                                          onChange={(e) =>
                                            updateReconcileField(item.id, 'carryForward', e.target.checked)
                                          }
                                          className="rounded border-input"
                                        />
                                        Carry forward to next week
                                      </label>
                                    </>
                                  )}
                                  {state.completionStatus === 'COMPLETED' && (
                                    <Textarea
                                      value={state.actualOutcome}
                                      onChange={(e) =>
                                        updateReconcileField(item.id, 'actualOutcome', e.target.value)
                                      }
                                      placeholder="What actually happened? (optional)"
                                      rows={2}
                                      className="text-xs resize-none"
                                    />
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReconcileItem(item.id)}
                                    disabled={saveDisabled}
                                    className="h-7 text-xs w-full"
                                  >
                                    Save
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unplanned deviations tab */}
          {reconcileTab === 'unplanned' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <AlertTriangle className="h-5 w-5" style={{ color: '#d4af37' }} />
                  Unplanned Deviations
                </h3>
                {unplannedItems.length > 0 && (
                  <span
                    className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                    style={{ backgroundColor: 'rgba(30,58,95,0.08)', color: '#1152d4' }}
                  >
                    +{unplannedItems.length} Added Mid-Week
                  </span>
                )}
              </div>

              {unplannedItems.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">
                  No unplanned items this week.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {unplannedItems.map((item) => {
                    const alreadyReconciled = item.completionStatus !== null
                    const state = getReconcileState(item.id)
                    const requiresReason =
                      state.completionStatus === 'PARTIAL' ||
                      state.completionStatus === 'NOT_COMPLETED'
                    const saveDisabled =
                      !state.completionStatus ||
                      (requiresReason && !state.actualOutcome.trim()) ||
                      reconcileItem.isPending

                    return (
                      <div
                        key={item.id}
                        className="bg-white border-l-4 p-4 rounded-r-xl flex flex-col justify-between"
                        style={{
                          borderLeftColor: '#1152d4',
                          borderTopColor: '#e2e8f0',
                          borderRightColor: '#e2e8f0',
                          borderBottomColor: '#e2e8f0',
                          border: '1px solid #e2e8f0',
                          borderLeft: '4px solid #1152d4',
                          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)',
                        }}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span
                              className="text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                            >
                              {item.chessPiece}
                            </span>
                            {alreadyReconciled &&
                              (item.completionStatus === 'COMPLETED' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-100" />
                              ) : (
                                <XCircle className="h-5 w-5 text-slate-400" />
                              ))}
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed italic line-clamp-3">
                              &ldquo;{item.description}&rdquo;
                            </p>
                          )}
                        </div>

                        {!alreadyReconciled && (
                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                            <Select
                              value={state.completionStatus}
                              onValueChange={(v) =>
                                updateReconcileField(item.id, 'completionStatus', v)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Select status..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="PARTIAL">Partial</SelectItem>
                                <SelectItem value="NOT_COMPLETED">Not Completed</SelectItem>
                              </SelectContent>
                            </Select>
                            {requiresReason && (
                              <Textarea
                                value={state.actualOutcome}
                                onChange={(e) =>
                                  updateReconcileField(item.id, 'actualOutcome', e.target.value)
                                }
                                placeholder="Why was this not completed?"
                                rows={2}
                                className="text-xs resize-none"
                              />
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReconcileItem(item.id)}
                              disabled={saveDisabled}
                              className="h-7 text-xs w-full"
                            >
                              Save
                            </Button>
                          </div>
                        )}

                        {alreadyReconciled && (
                          <div
                            className="mt-3 pt-3 border-t flex items-center gap-2"
                            style={{ borderColor: '#f1f5f9' }}
                          >
                            <Zap className="h-3.5 w-3.5 fill-current" style={{ color: '#d4af37' }} />
                            <span
                              className="text-[9px] font-bold uppercase"
                              style={{ color: '#1152d4' }}
                            >
                              {item.chessPiece}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer: complete reconciliation */}
          <div
            className="mt-4 bg-slate-900 text-white p-7 rounded-xl flex flex-col md:flex-row items-center justify-between gap-5 overflow-hidden relative"
            style={{ borderTop: '3px solid #1152d4' }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 blur-[80px] -mr-24 -mt-24 pointer-events-none" />
            <div className="relative z-10 text-center md:text-left">
              <h3 className="text-xl font-bold">Ready to finalize?</h3>
              <p className="text-slate-400 mt-1 text-sm">
                Finalizing locks all entries and seeds carry-forward items into next week.
              </p>
            </div>
            <div className="relative z-10 flex gap-3 w-full md:w-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={
                      commit.items.some((i) => !i.completionStatus) ||
                      completeReconciliation.isPending
                    }
                    className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-bold text-sm shadow-xl transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ backgroundColor: '#1152d4' }}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Finalize &amp; Start Next Planning
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete reconciliation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will finalize this week&apos;s commit and seed any carry-forward items
                      into next week.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCompleteReconciliation}>
                      Complete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </>
      )}

      {/* ── RECONCILED ── */}
      {commit.status === 'RECONCILED' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Week Reconciled</h1>
              <p className="text-sm text-slate-500 mt-1">
                {formatWeekRange(commit.weekStartDate, commit.weekEndDate)}
              </p>
            </div>
            <StatusBadge status={commit.status} />
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              {
                label: 'Completed',
                count: commit.items.filter((i) => i.completionStatus === 'COMPLETED').length,
                color: 'text-green-600',
              },
              {
                label: 'Partial',
                count: commit.items.filter((i) => i.completionStatus === 'PARTIAL').length,
                color: 'text-yellow-600',
              },
              {
                label: 'Not Done',
                count: commit.items.filter((i) => i.completionStatus === 'NOT_COMPLETED').length,
                color: 'text-red-500',
              },
              {
                label: 'Bumped',
                count: commit.items.filter((i) => i.completionStatus === 'BUMPED').length,
                color: 'text-orange-500',
              },
              {
                label: 'Carried Fwd',
                count: commit.items.filter((i) => i.carryForward).length,
                color: 'text-blue-600',
              },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                className="bg-white border rounded-xl p-4 text-center"
                style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
              >
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Read-only ledger */}
          <div
            className="overflow-hidden rounded-xl border bg-white"
            style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ backgroundColor: '#f8faff', borderColor: '#e2e8f0' }}>
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Task
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Layer
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {commit.items
                  .sort(
                    (a, b) =>
                      CHESS_PIECE_ORDER.indexOf(a.chessPiece) -
                      CHESS_PIECE_ORDER.indexOf(b.chessPiece)
                  )
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                        {item.actualOutcome && (
                          <p className="text-xs text-slate-400 italic mt-1">&ldquo;{item.actualOutcome}&rdquo;</p>
                        )}
                        {item.carryForward && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Carried forward
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm">{CHESS_ICON[item.chessPiece]}</span>
                        <span className="text-xs text-slate-500 ml-1.5">{item.chessPiece}</span>
                      </td>
                      <td className="px-5 py-4">
                        {item.completionStatus && (
                          <Badge
                            variant={
                              item.completionStatus === 'COMPLETED'
                                ? 'success'
                                : item.completionStatus === 'PARTIAL'
                                  ? 'warning'
                                  : item.completionStatus === 'BUMPED'
                                    ? 'secondary'
                                    : 'destructive'
                            }
                            className="text-xs"
                          >
                            {item.completionStatus.replace('_', ' ')}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add / Edit Item Modal */}
      <AddItemModal
        open={addModalOpen || editingItem !== null}
        onClose={() => {
          setAddModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={(item) => createItem.mutateAsync({ commitId: commit.id, item })}
        editItem={editingItem}
        onUpdate={
          editingItem
            ? (item) =>
                updateItem.mutateAsync({ commitId: commit.id, itemId: editingItem.id, item })
            : undefined
        }
      />
      <UnplannedItemModal
        open={unplannedModalOpen}
        onClose={() => setUnplannedModalOpen(false)}
        onSubmit={(item) => createUnplannedItem.mutateAsync({ commitId: commit.id, item })}
        bumpableItems={commit.items.filter((i) => {
          if (i.unplanned) return false
          const alreadyBumped = commit.items.some((u) => u.unplanned && u.bumpedItemId === i.id)
          return !alreadyBumped
        })}
        alreadyBumpedItems={commit.items.filter((i) => {
          if (i.unplanned) return false
          return commit.items.some((u) => u.unplanned && u.bumpedItemId === i.id)
        })}
        totalLockedWeight={commit.totalLockedWeight}
      />
    </div>
  )
}
