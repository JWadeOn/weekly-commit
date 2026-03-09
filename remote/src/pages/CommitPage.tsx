import React, { useState } from 'react'
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
import { Plus, Lock, Unlock, CheckCircle2 } from 'lucide-react'
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
import { formatWeekRange } from '@/utils/formatDate'
import type { CommitItemResponse, ChessPiece, CompletionStatus } from '@/types'
import { CHESS_ICON, CHESS_WEIGHT } from '@/types'

const CHESS_PIECE_ORDER: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

export function CommitPage(): React.ReactElement {
  const { data: commit, isLoading, error } = useCurrentCommit()
  const updateStatus = useUpdateStatus()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const reorderItems = useReorderItems()
  const reconcileItem = useReconcileItem()
  const completeReconciliation = useCompleteReconciliation()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CommitItemResponse | null>(null)
  const [reconcileData, setReconcileData] = useState<Record<string, { actualOutcome: string; completionStatus: CompletionStatus | ''; carryForward: boolean }>>({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (error) return <div className="p-8 text-center text-destructive">Failed to load commit</div>
  if (!commit) return <div className="p-8 text-center">No commit found</div>

  const itemsByPiece = CHESS_PIECE_ORDER.reduce<Record<ChessPiece, CommitItemResponse[]>>(
    (acc, piece) => {
      acc[piece] = commit.items.filter(i => i.chessPiece === piece).sort((a, b) => a.priorityOrder - b.priorityOrder)
      return acc
    },
    {} as Record<ChessPiece, CommitItemResponse[]>
  )

  const handleDragEnd = (event: DragEndEvent, piece: ChessPiece): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const pieceItems = itemsByPiece[piece]
    const oldIndex = pieceItems.findIndex(i => i.id === active.id)
    const newIndex = pieceItems.findIndex(i => i.id === over.id)
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
    setReconcileData(prev => ({
      ...prev,
      [itemId]: {
        ...getReconcileState(itemId),
        [field]: value,
      },
    }))
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
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
                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
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
                    This will lock your commit and notify your manager.
                    You can retract it until your manager views it.
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
            <Button variant="secondary" className="w-full" onClick={handleStartReconciliation}>
              Start Early Reconciliation
            </Button>
          </div>
        </>
      )}

      {/* RECONCILING State */}
      {commit.status === 'RECONCILING' && (
        <>
          <p className="text-sm text-muted-foreground">
            Reflect on each item. Mark completion status and provide actual outcomes.
          </p>

          <div className="space-y-4">
            {commit.items
              .sort((a, b) => CHESS_PIECE_ORDER.indexOf(a.chessPiece) - CHESS_PIECE_ORDER.indexOf(b.chessPiece))
              .map((item) => {
                const state = getReconcileState(item.id)
                const alreadyReconciled = item.completionStatus !== null

                return (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{CHESS_ICON[item.chessPiece]}</span>
                      <span className="font-medium text-sm">{item.title}</span>
                      {alreadyReconciled && (
                        <Badge variant="success" className="ml-auto text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {item.completionStatus}
                        </Badge>
                      )}
                    </div>

                    {!alreadyReconciled && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Completion Status</label>
                          <Select
                            value={state.completionStatus}
                            onValueChange={(v) => updateReconcileField(item.id, 'completionStatus', v)}
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
                          <label className="text-xs font-medium text-muted-foreground">Actual Outcome</label>
                          <Textarea
                            value={state.actualOutcome}
                            onChange={(e) => updateReconcileField(item.id, 'actualOutcome', e.target.value)}
                            placeholder="What actually happened?"
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {(state.completionStatus === 'PARTIAL' || state.completionStatus === 'NOT_COMPLETED') && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.carryForward}
                              onChange={(e) => updateReconcileField(item.id, 'carryForward', e.target.checked)}
                              className="rounded border-input"
                            />
                            <span className="text-sm">Carry forward to next week</span>
                          </label>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReconcileItem(item.id)}
                          disabled={!state.completionStatus || reconcileItem.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    )}

                    {alreadyReconciled && item.actualOutcome && (
                      <p className="text-sm text-muted-foreground italic">&ldquo;{item.actualOutcome}&rdquo;</p>
                    )}
                  </div>
                )
              })}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full"
                disabled={commit.items.some(i => !i.completionStatus) || completeReconciliation.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Reconciliation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete reconciliation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will finalize this week&apos;s commit and seed any carry-forward items into next week.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCompleteReconciliation}>Complete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* RECONCILED State */}
      {commit.status === 'RECONCILED' && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Completed', count: commit.items.filter(i => i.completionStatus === 'COMPLETED').length, color: 'text-green-600' },
              { label: 'Partial', count: commit.items.filter(i => i.completionStatus === 'PARTIAL').length, color: 'text-yellow-600' },
              { label: 'Not Done', count: commit.items.filter(i => i.completionStatus === 'NOT_COMPLETED').length, color: 'text-red-600' },
              { label: 'Carried Fwd', count: commit.items.filter(i => i.carryForward).length, color: 'text-blue-600' },
            ].map(({ label, count, color }) => (
              <div key={label} className="border rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {commit.items
              .sort((a, b) => CHESS_PIECE_ORDER.indexOf(a.chessPiece) - CHESS_PIECE_ORDER.indexOf(b.chessPiece))
              .map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>{CHESS_ICON[item.chessPiece]}</span>
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    {item.completionStatus && (
                      <Badge
                        variant={
                          item.completionStatus === 'COMPLETED' ? 'success'
                          : item.completionStatus === 'PARTIAL' ? 'warning'
                          : 'destructive'
                        }
                        className="text-xs shrink-0"
                      >
                        {item.completionStatus.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  {item.actualOutcome && (
                    <p className="text-sm text-muted-foreground mt-2 italic">&ldquo;{item.actualOutcome}&rdquo;</p>
                  )}
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
        onUpdate={editingItem ? (item) => updateItem.mutateAsync({ commitId: commit.id, itemId: editingItem.id, item }) : undefined}
      />
    </div>
  )
}
