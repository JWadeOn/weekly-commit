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
import { Plus, Lock, Unlock, CheckCircle2, AlertTriangle } from 'lucide-react'
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
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  useCurrentCommit,
  useUpdateStatus,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useReorderItems,
  useReconcileItem,
  useCompleteReconciliation,
} from '@/hooks/useCurrentCommit'
import { useRcdo } from '@/hooks/useRcdo'
import { formatWeekRange } from '@/utils/formatDate'
import type { CommitItemResponse, ChessPiece, CompletionStatus, RallyCryDto } from '@/types'
import { CHESS_ICON, CHESS_WEIGHT } from '@/types'

const CHESS_PIECE_ORDER: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

// Weekly weight summary bar: "1 ♔ · 2 ♕ · 3 ♖ · total wt 420"
function WeightSummaryBar({ items }: { items: CommitItemResponse[] }): React.ReactElement {
  const counts = CHESS_PIECE_ORDER.reduce<Partial<Record<ChessPiece, number>>>(
    (acc, piece) => {
      const count = items.filter((i) => i.chessPiece === piece).length
      if (count > 0) acc[piece] = count
      return acc
    },
    {}
  )
  const totalWeight = items.reduce((sum, item) => sum + item.chessWeight, 0)
  const parts = CHESS_PIECE_ORDER.filter((p) => counts[p])
    .map((p) => `${counts[p]} ${CHESS_ICON[p]}`)
    .join(' · ')

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
      <span>{parts}</span>
      <span>·</span>
      <span className="font-medium">Total weight: {totalWeight}</span>
    </div>
  )
}

// Read-only Rally Cry & Defining Objectives for employee context
function StrategySummary({
  rallyCries,
  activeRallyCryId,
}: {
  rallyCries: RallyCryDto[]
  activeRallyCryId?: string
}): React.ReactElement | null {
  if (!rallyCries?.length) return null
  return (
    <Card className="bg-muted/30 border-muted-foreground/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rally Cry & Objectives</CardTitle>
        <CardDescription>Your organization&apos;s focus — align your commit items to these</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rallyCries.map((rc) => {
          const isActive = activeRallyCryId ? rc.id === activeRallyCryId : false
          return (
            <div
              key={rc.id}
              className={`space-y-2 rounded-md p-2 -mx-2 transition-colors ${isActive ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{rc.title}</h3>
                {isActive && (
                  <Badge variant="outline" className="text-xs text-primary border-primary/40">
                    Active
                  </Badge>
                )}
              </div>
              {rc.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{rc.description}</p>
              )}
              {rc.definingObjectives?.length > 0 && (
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                  {rc.definingObjectives.map((do_) => (
                    <li key={do_.id}>
                      <span className="text-foreground/90">{do_.title}</span>
                      {do_.description && (
                        <span className="text-muted-foreground"> — {do_.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function CommitPage(): React.ReactElement {
  const activeRallyCryId = useContext(ActiveRallyCryContext)
  const { data: commit, isLoading, error } = useCurrentCommit()
  const { data: rcdoData } = useRcdo()
  const updateStatus = useUpdateStatus()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const reorderItems = useReorderItems()
  const reconcileItem = useReconcileItem()
  const completeReconciliation = useCompleteReconciliation()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CommitItemResponse | null>(null)
  const [reconcileData, setReconcileData] = useState<
    Record<string, { actualOutcome: string; completionStatus: CompletionStatus | ''; carryForward: boolean }>
  >({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (error) return <div className="p-8 text-center text-destructive">Failed to load commit</div>
  if (!commit) return <div className="p-8 text-center">No commit found</div>

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
    updateStatus.mutate({ id: commit.id, body: { status: 'LOCKED' } })
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

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Rally Cry & DOs — context for employees; host may pass activeRallyCryId to highlight */}
      <StrategySummary rallyCries={rcdoData?.rallyCries ?? []} activeRallyCryId={activeRallyCryId} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Commit</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {formatWeekRange(commit.weekStartDate, commit.weekEndDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={commit.status} />
          {commit.totalWeight > 0 && (
            <Badge variant="outline" className="text-xs">
              Weight: {commit.totalWeight}
            </Badge>
          )}
        </div>
      </div>

      {/* Weekly weight summary — shown whenever there are items */}
      {commit.items.length > 0 && <WeightSummaryBar items={commit.items} />}

      {/* DRAFT State */}
      {commit.status === 'DRAFT' && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {commit.items.length === 0
                ? 'No items yet. Add your first commit item.'
                : `${commit.items.length} item${commit.items.length !== 1 ? 's' : ''}`}
            </p>
            <Button onClick={() => setAddModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          {/* No Kings or Queens soft warning */}
          {commit.items.length > 0 && !hasKingOrQueen && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                No Kings or Queens this week — consider whether your highest-leverage work is
                represented.
              </span>
            </div>
          )}

          {CHESS_PIECE_ORDER.map((piece) => {
            const items = itemsByPiece[piece]
            if (items.length === 0) return null
            return (
              <div key={piece} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <span className="text-base">{CHESS_ICON[piece]}</span>
                  <span>{piece}</span>
                  <span className="text-xs font-normal">— wt {CHESS_WEIGHT[piece]}</span>
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

          {commit.items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={updateStatus.isPending}>
                  <Lock className="h-4 w-4 mr-2" />
                  Submit Week
                </Button>
              </AlertDialogTrigger>
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
          )}
        </>
      )}

      {/* LOCKED State */}
      {commit.status === 'LOCKED' && (
        <>
          {CHESS_PIECE_ORDER.map((piece) => {
            const items = itemsByPiece[piece]
            if (items.length === 0) return null
            return (
              <div key={piece} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <span className="text-base">{CHESS_ICON[piece]}</span>
                  <span>{piece}</span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <CommitItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )
          })}

          <div className="space-y-2">
            {commit.viewedAt ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Manager has viewed this commit — retract is no longer available.
              </p>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={updateStatus.isPending}>
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
              className="w-full"
              onClick={handleStartReconciliation}
              disabled={updateStatus.isPending}
            >
              Start Early Reconciliation
            </Button>
          </div>
        </>
      )}

      {/* RECONCILING State — side-by-side "Monday Promise" vs "Friday Reality" */}
      {commit.status === 'RECONCILING' && (
        <>
          <p className="text-sm text-muted-foreground">
            Reflect on each item. For partial or missed items, a reason for miss is required.
          </p>

          <div className="space-y-4">
            {commit.items
              .sort(
                (a, b) =>
                  CHESS_PIECE_ORDER.indexOf(a.chessPiece) -
                  CHESS_PIECE_ORDER.indexOf(b.chessPiece)
              )
              .map((item) => {
                const state = getReconcileState(item.id)
                const alreadyReconciled = item.completionStatus !== null
                const requiresReason =
                  state.completionStatus === 'PARTIAL' ||
                  state.completionStatus === 'NOT_COMPLETED'
                const saveDisabled =
                  !state.completionStatus ||
                  (requiresReason && !state.actualOutcome.trim()) ||
                  reconcileItem.isPending

                return (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 divide-x min-h-0">
                      {/* LEFT: Monday Promise */}
                      <div className="p-4 bg-muted/30 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Monday Promise
                        </p>
                        <div className="flex items-start gap-2">
                          <span className="text-base shrink-0">{CHESS_ICON[item.chessPiece]}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-sm break-words">{item.title}</p>
                            {item.outcomeBreadcrumb && (
                              <p className="text-xs text-muted-foreground mt-1 break-words">
                                {item.outcomeBreadcrumb.rallyCry} ›{' '}
                                {item.outcomeBreadcrumb.definingObjective} ›{' '}
                                {item.outcomeBreadcrumb.outcome}
                              </p>
                            )}
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground italic">{item.description}</p>
                        )}
                      </div>

                      {/* RIGHT: Friday Reality */}
                      <div className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Friday Reality
                        </p>
                        {alreadyReconciled ? (
                          <div className="space-y-2">
                            <Badge variant="success" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {item.completionStatus}
                            </Badge>
                            {item.actualOutcome && (
                              <p className="text-sm text-muted-foreground italic">
                                &ldquo;{item.actualOutcome}&rdquo;
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                Completion Status
                              </label>
                              <Select
                                value={state.completionStatus}
                                onValueChange={(v) =>
                                  updateReconcileField(item.id, 'completionStatus', v)
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select status..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                  <SelectItem value="PARTIAL">Partial</SelectItem>
                                  <SelectItem value="NOT_COMPLETED">Not Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                {requiresReason ? (
                                  <span className="text-red-600">
                                    Reason for Miss <span className="font-bold">*</span>
                                  </span>
                                ) : (
                                  'Actual Outcome'
                                )}
                              </label>
                              <Textarea
                                value={state.actualOutcome}
                                onChange={(e) =>
                                  updateReconcileField(item.id, 'actualOutcome', e.target.value)
                                }
                                placeholder={
                                  requiresReason
                                    ? 'Why was this not completed?'
                                    : 'What actually happened?'
                                }
                                rows={2}
                                className={`text-sm ${requiresReason && !state.actualOutcome.trim() ? 'border-red-300 focus-visible:ring-red-400' : ''}`}
                              />
                              {requiresReason && !state.actualOutcome.trim() && (
                                <p className="text-xs text-red-600">
                                  Required for partial or missed items
                                </p>
                              )}
                            </div>

                            {requiresReason && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={state.carryForward}
                                  onChange={(e) =>
                                    updateReconcileField(
                                      item.id,
                                      'carryForward',
                                      e.target.checked
                                    )
                                  }
                                  className="rounded border-input"
                                />
                                <span className="text-sm">Carry forward to next week</span>
                              </label>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReconcileItem(item.id)}
                              disabled={saveDisabled}
                            >
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full"
                disabled={
                  commit.items.some((i) => !i.completionStatus) ||
                  completeReconciliation.isPending
                }
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Reconciliation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete reconciliation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will finalize this week&apos;s commit and seed any carry-forward items into
                  next week.
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
        </>
      )}

      {/* RECONCILED State — side-by-side "The Promise" vs "The Reality" */}
      {commit.status === 'RECONCILED' && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                color: 'text-red-600',
              },
              {
                label: 'Carried Fwd',
                count: commit.items.filter((i) => i.carryForward).length,
                color: 'text-blue-600',
              },
            ].map(({ label, count, color }) => (
              <div key={label} className="border rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {commit.items
              .sort(
                (a, b) =>
                  CHESS_PIECE_ORDER.indexOf(a.chessPiece) -
                  CHESS_PIECE_ORDER.indexOf(b.chessPiece)
              )
              .map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 divide-x">
                    {/* LEFT: The Promise */}
                    <div className="p-3 bg-muted/30 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        The Promise
                      </p>
                      <div className="flex items-start gap-2">
                        <span className="shrink-0">{CHESS_ICON[item.chessPiece]}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm break-words">{item.title}</p>
                          {item.outcomeBreadcrumb && (
                            <p className="text-xs text-muted-foreground mt-0.5 break-words">
                              {item.outcomeBreadcrumb.rallyCry} › {item.outcomeBreadcrumb.outcome}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: The Reality */}
                    <div className="p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        The Reality
                      </p>
                      <div className="space-y-1">
                        {item.completionStatus && (
                          <Badge
                            variant={
                              item.completionStatus === 'COMPLETED'
                                ? 'success'
                                : item.completionStatus === 'PARTIAL'
                                  ? 'warning'
                                  : 'destructive'
                            }
                            className="text-xs"
                          >
                            {item.completionStatus.replace('_', ' ')}
                          </Badge>
                        )}
                        {item.actualOutcome && (
                          <p className="text-xs text-muted-foreground italic break-words">
                            &ldquo;{item.actualOutcome}&rdquo;
                          </p>
                        )}
                        {item.carryForward && (
                          <Badge variant="outline" className="text-xs">
                            Carried forward
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  )
}
