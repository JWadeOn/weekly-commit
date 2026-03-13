import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Lock, Wrench, Target, AlertTriangle, RotateCcw, Zap } from 'lucide-react'
import { useRcdo } from '@/hooks/useRcdo'
import { CHESS_ICON, CHESS_WEIGHT, KLO_CATEGORY_LABELS } from '@/types'
import type { ChessPiece, CreateUnplannedItemRequest, CommitItemResponse, TaskType, KloCategory } from '@/types'

const CHESS_PIECES: ChessPiece[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN']

const CHESS_DESCRIPTION: Record<ChessPiece, string> = {
  KING: 'Critical — the week fails without this.',
  QUEEN: 'Very high — major impact if missed.',
  ROOK: 'High — important for the week.',
  BISHOP: 'Medium — meaningful progress.',
  KNIGHT: 'Lower — good to have.',
  PAWN: 'Lowest — small but valuable.',
}

const KLO_CATEGORIES = Object.keys(KLO_CATEGORY_LABELS) as KloCategory[]

/** Sentinel for "no displacement needed" radio selection */
const NO_BUMP = '__none__'

interface UnplannedItemModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (item: CreateUnplannedItemRequest) => Promise<unknown>
  /** Active planned items that can still be displaced (not yet bumped) */
  bumpableItems: CommitItemResponse[]
  /** Items already displaced by prior unplanned additions this week */
  alreadyBumpedItems: CommitItemResponse[]
  /** Weight snapshot taken when the commit was locked (Monday total) */
  totalLockedWeight: number | null
}

export function UnplannedItemModal({
  open,
  onClose,
  onSubmit,
  bumpableItems,
  alreadyBumpedItems,
  totalLockedWeight,
}: UnplannedItemModalProps): React.ReactElement {
  const { data: rcdo } = useRcdo()
  const [taskType, setTaskType] = useState<TaskType>('STRATEGIC')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedDoId, setSelectedDoId] = useState('')
  const [outcomeId, setOutcomeId] = useState('')
  const [kloCategory, setKloCategory] = useState<KloCategory>('BUGFIX')
  const [chessPiece, setChessPiece] = useState<ChessPiece>('PAWN')
  const [bumpedItemId, setBumpedItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wasOpen = React.useRef(false)

  const rc = rcdo?.rallyCries?.[0]
  const definingObjectives = rc?.definingObjectives ?? []
  const selectedDo = useMemo(
    () => definingObjectives.find((d) => d.id === selectedDoId) ?? null,
    [definingObjectives, selectedDoId]
  )
  const outcomes = selectedDo?.outcomes ?? []

  React.useEffect(() => {
    if (open && !wasOpen.current) {
      setTaskType('STRATEGIC')
      setTitle('')
      setDescription('')
      setSelectedDoId('')
      setOutcomeId('')
      setKloCategory('BUGFIX')
      setChessPiece('PAWN')
      setBumpedItemId(bumpableItems.length > 0 ? bumpableItems[0]?.id ?? '' : '')
      setError(null)
      setSubmitted(false)
    }
    wasOpen.current = open
  }, [open, bumpableItems])

  const handleSelectDo = (doId: string): void => {
    setSelectedDoId(doId)
    setOutcomeId('')
  }

  const isKlo = taskType === 'KLO'

  // ── Capacity & Strategic Debt ──────────────────────────────────────────────
  const activeWeight = useMemo(
    () => bumpableItems.reduce((sum, i) => sum + i.chessWeight, 0),
    [bumpableItems]
  )
  const bumpedWeight = useMemo(
    () => alreadyBumpedItems.reduce((sum, i) => sum + i.chessWeight, 0),
    [alreadyBumpedItems]
  )
  const newTaskWeight = CHESS_WEIGHT[chessPiece]
  const isStrategicDebt = activeWeight === 0 && bumpedWeight > 0

  // Over capacity when adding the new task would exceed the Monday lock budget
  const isOverCapacity = useMemo(() => {
    if (!totalLockedWeight) return bumpableItems.length > 0 // conservative fallback
    return activeWeight + newTaskWeight > totalLockedWeight
  }, [activeWeight, newTaskWeight, totalLockedWeight, bumpableItems.length])

  // Displacement is only mandatory when we're over capacity AND there is something to displace
  const bumpRequired = isOverCapacity && bumpableItems.length > 0

  // ── Live Integrity Preview ─────────────────────────────────────────────────
  const projectedIntegrity = useMemo(() => {
    if (!totalLockedWeight || totalLockedWeight === 0) return null
    return (activeWeight + newTaskWeight) / totalLockedWeight
  }, [activeWeight, newTaskWeight, totalLockedWeight])

  const showIntegrityWarning = !isKlo && projectedIntegrity !== null && projectedIntegrity < 0.5

  // ── Effective bumped item for submission ───────────────────────────────────
  // When capacity is available (bumpRequired = false), use undefined so the
  // backend takes the debt-first path (capacity check, no displacement recorded).
  const effectiveBumpedItemId = bumpRequired && bumpedItemId !== NO_BUMP && bumpedItemId !== ''
    ? bumpedItemId
    : undefined

  const canConfirm =
    !submitting &&
    title.trim() !== '' &&
    (isKlo || outcomeId !== '') &&
    (!bumpRequired || (bumpedItemId !== '' && bumpedItemId !== NO_BUMP))

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) { setError('Title is required'); return }
    if (!isKlo && !outcomeId) { setError('Outcome is required for strategic items'); return }
    if (bumpRequired && (!bumpedItemId || bumpedItemId === NO_BUMP)) {
      setError('You must select which Monday commit item you are displacing.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        outcomeId: isKlo ? undefined : outcomeId,
        chessPiece,
        bumpedItemId: effectiveBumpedItemId,
        taskType,
        kloCategory: isKlo ? kloCategory : undefined,
        pivotReason: !bumpRequired ? 'Added into existing strategic debt margin — no new displacement' : undefined,
      })
      setSubmitted(true)
      setTimeout(() => onClose(), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add unplanned item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-black text-[#1e293b] leading-tight">Mid-Week Pivot Detected</DialogTitle>
              {isStrategicDebt ? (
                <DialogDescription className="text-sm font-semibold text-orange-600 mt-1">
                  Managing Strategic Debt: Adding a task to an empty active lane.
                </DialogDescription>
              ) : (
                <DialogDescription className="text-sm text-slate-500 mt-1">Adding tasks mid-week requires resource recalibration.</DialogDescription>
              )}
            </div>
            <span className={`px-2.5 py-1 text-white text-xs font-semibold tracking-wide rounded shrink-0 ${isStrategicDebt ? 'bg-amber-600' : 'bg-orange-600'}`}>
              {isStrategicDebt ? 'Strategic Debt' : 'Unplanned Entry'}
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5 max-h-[65vh] overflow-y-auto">

          {/* ── Task Type Toggle ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Task Type</p>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-bold">
              <button
                type="button"
                onClick={() => setTaskType('STRATEGIC')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-colors ${
                  !isKlo
                    ? 'bg-[#1152d4] text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Target className="h-3.5 w-3.5" />
                Strategic
              </button>
              <button
                type="button"
                onClick={() => setTaskType('KLO')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-colors border-l border-slate-200 ${
                  isKlo
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                Operational (KLO)
              </button>
            </div>
            {isKlo && (
              <p className="text-[10px] text-slate-400 mt-1.5 italic">
                Keep-the-lights-on work. Counts toward capacity but not alignment score.
              </p>
            )}
          </div>

          {/* New commitment form */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">The New Commitment</p>
            <div className={`border rounded-xl p-4 space-y-3 ${isKlo ? 'border-slate-200 bg-slate-50/50' : 'border-amber-200 bg-amber-50/30'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isKlo ? 'bg-slate-200' : 'bg-amber-100'}`}>
                  <span className="text-lg">{CHESS_ICON[chessPiece]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isKlo ? 'What operational task are you adding?' : 'What unplanned item are you adding?'}
                    className="border-0 bg-transparent p-0 h-auto text-sm font-semibold text-[#1e293b] focus-visible:ring-0 placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-500 mt-0.5">Chess Move: {chessPiece.charAt(0) + chessPiece.slice(1).toLowerCase()} ({CHESS_DESCRIPTION[chessPiece].split(' — ')[0]})</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 bg-orange-600 text-white text-[10px] font-bold uppercase rounded flex items-center gap-1">
                  ▌▌▌ Resource Impact: High
                </span>
                {isKlo && (
                  <span className="px-2 py-0.5 bg-slate-600 text-white text-[10px] font-bold uppercase rounded">
                    Whirlwind
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="unplanned-desc" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Why is this needed? (optional)
            </Label>
            <Textarea
              id="unplanned-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isKlo ? 'Describe the operational issue...' : 'Context for the mid-week pivot...'}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Chess piece */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chess Move</Label>
            <Select value={chessPiece} onValueChange={(v) => setChessPiece(v as ChessPiece)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHESS_PIECES.map((piece) => (
                  <SelectItem key={piece} value={piece}>
                    <span className="flex items-center gap-2">
                      <span>{CHESS_ICON[piece]}</span>
                      <span>{piece.charAt(0) + piece.slice(1).toLowerCase()}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── STRATEGIC: Outcome picker ── */}
          {!isKlo && (
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Aligned Outcome (Mandatory)
              </Label>
              {definingObjectives.length > 0 && (
                <div className="grid gap-1.5">
                  {definingObjectives.map((do_) => {
                    const selected = selectedDoId === do_.id
                    return (
                      <button
                        key={do_.id}
                        type="button"
                        onClick={() => handleSelectDo(do_.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-colors flex items-start gap-2.5 ${
                          selected
                            ? 'bg-[#1152d4]/8 border-[#1152d4]/40 ring-1 ring-[#1152d4]/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                          selected ? 'bg-[#1152d4] border-[#1152d4] text-white' : 'border-slate-300'
                        }`} aria-hidden>
                          {selected && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="font-medium leading-snug break-words">{do_.title}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {selectedDoId && outcomes.length > 0 && (
                <div className="grid gap-1 ml-2 pl-2 border-l-2 border-[#1152d4]/20">
                  {outcomes.map((o) => {
                    const selected = outcomeId === o.id
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setOutcomeId(o.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors flex items-center gap-2.5 ${
                          selected
                            ? 'bg-[#1152d4]/8 border-[#1152d4]/40 ring-1 ring-[#1152d4]/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`shrink-0 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                          selected ? 'bg-[#1152d4] border-[#1152d4] text-white' : 'border-slate-300'
                        }`} aria-hidden>
                          {selected && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="font-medium break-words">{o.title}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── KLO: Category picker ── */}
          {isKlo && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                KLO Category
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {KLO_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setKloCategory(cat)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors text-left ${
                      kloCategory === cat
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-black uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>
                      {cat}
                    </span>
                    {KLO_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Displaced Task Section ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-[10px] font-black uppercase tracking-widest ${bumpRequired ? 'text-rose-500' : 'text-emerald-600'}`}>
                {bumpRequired ? 'Which planned task is being displaced (bumped)?' : 'Displacement'}
              </p>
              {!bumpRequired && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                  Optional
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 italic mb-3">
              {isKlo
                ? 'Even operational work displaces capacity — record what gets pushed.'
                : bumpRequired
                  ? 'Mandatory selection to maintain velocity tracking.'
                  : 'Ghost capacity available — no displacement required.'}
            </p>

            {/* ── Restore Nudge — Recently Bumped ── */}
            {alreadyBumpedItems.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                  <RotateCcw className="h-3 w-3" />
                  Recently Bumped
                </p>
                <p className="text-[11px] text-amber-700/80 italic -mt-1">
                  {isKlo
                    ? "You've already displaced items — consider restoring your original plan."
                    : "You've already displaced items this week. Should you restore one of these instead?"}
                </p>
                <div className="space-y-1.5">
                  {alreadyBumpedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white border border-amber-200 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1e293b] truncate">{item.title}</p>
                        <p className="text-xs text-slate-400">
                          {CHESS_ICON[item.chessPiece]} {item.chessPiece.charAt(0) + item.chessPiece.slice(1).toLowerCase()}
                          <span className="ml-1.5 text-amber-600 font-medium">· displaced</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200 transition-colors whitespace-nowrap"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore instead?
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Capacity available — no bumpable items remain */}
            {bumpableItems.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3.5">
                <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Strategic Capacity Available</p>
                  <p className="text-xs text-emerald-700/80 mt-0.5">
                    You have enough margin to add this task without further displacement. Your prior bumps created the room.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* When not over capacity, offer "no displacement" as the top option */}
                {!bumpRequired && (
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      bumpedItemId === NO_BUMP || bumpedItemId === ''
                        ? 'border-emerald-400/50 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bumped-item"
                      value={NO_BUMP}
                      checked={bumpedItemId === NO_BUMP || bumpedItemId === ''}
                      onChange={() => setBumpedItemId(NO_BUMP)}
                      className="shrink-0 accent-emerald-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-emerald-800">No displacement needed</p>
                      <p className="text-xs text-emerald-600/80">Using available ghost capacity from prior bumps.</p>
                    </div>
                    <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                  </label>
                )}

                {bumpableItems.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      bumpedItemId === item.id
                        ? 'border-[#1152d4]/40 bg-[#1152d4]/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bumped-item"
                      value={item.id}
                      checked={bumpedItemId === item.id}
                      onChange={() => setBumpedItemId(item.id)}
                      className="shrink-0 accent-[#1152d4]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1e293b] truncate">{item.title}</p>
                      <p className="text-xs text-slate-400">
                        {CHESS_ICON[item.chessPiece]} {item.chessPiece.charAt(0) + item.chessPiece.slice(1).toLowerCase()}
                        {item.taskType === 'KLO' && (
                          <span className="ml-1.5 px-1 py-0 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">KLO</span>
                        )}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        {/* Dark footer */}
        <div className="bg-[#0f172a] px-6 py-4 space-y-3">
          {submitted ? (
            <div className="flex items-center justify-center gap-2 py-1 text-emerald-400 font-semibold text-sm">
              <Check className="h-4 w-4" />
              Task added — commit updated.
            </div>
          ) : (
            <>
              {/* ── Live Integrity Preview ── */}
              {projectedIntegrity !== null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Projected Integrity
                  </span>
                  <div className="relative group flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        showIntegrityWarning ? 'text-red-400' : 'text-slate-300'
                      }`}
                    >
                      {Math.round(projectedIntegrity * 100)}%
                    </span>
                    {showIntegrityWarning && (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-2.5 bg-slate-800 border border-red-900/40 text-red-300 text-[11px] leading-snug rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          Warning: Your Friday Integrity Score is currently projected to be failing due to strategic displacement.
                        </div>
                      </>
                    )}
                    {isKlo && (
                      <span className="text-[10px] text-slate-500 italic">
                        (KLO — intent not penalised)
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-500">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs italic">&ldquo;A promise made is a debt unpaid.&rdquo;</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={!canConfirm}
                  className="flex-1 py-2.5 bg-[#1152d4] hover:bg-[#1152d4]/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-[#1152d4]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Confirm Commitment & Lock'}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
