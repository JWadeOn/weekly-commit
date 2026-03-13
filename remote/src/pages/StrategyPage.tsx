import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Crown, ArrowRight, Zap, FileText, Radio, Wifi, BarChart3, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  useRcdoAdmin,
  useOrgMembers,
  useCreateRallyCry,
  useUpdateRallyCry,
  useDeactivateRallyCry,
  useCreateDefiningObjective,
  useUpdateDefiningObjective,
  useDeactivateDefiningObjective,
  useCreateOutcome,
  useUpdateOutcome,
  useDeactivateOutcome,
} from '@/hooks/useRcdoAdmin'
import type {
  AdminRallyCryDto,
  AdminDefiningObjectiveDto,
  AdminOutcomeDto,
  OrgMemberDto,
} from '@/types'

// ─── Rally Cry modal ───────────────────────────────────────────────────────
function RallyCryModal({
  open, onClose, edit, onCreate, onUpdate, creating, updating,
}: {
  open: boolean
  onClose: () => void
  edit?: AdminRallyCryDto | null
  onCreate?: (body: { title: string; description?: string }) => Promise<unknown>
  onUpdate?: (id: string, body: { title: string; description?: string; active?: boolean }) => Promise<unknown>
  creating?: boolean
  updating?: boolean
}): React.ReactElement {
  const [title, setTitle] = useState(edit?.title ?? '')
  const [description, setDescription] = useState(edit?.description ?? '')

  React.useEffect(() => {
    if (open) { setTitle(edit?.title ?? ''); setDescription(edit?.description ?? '') }
  }, [open, edit])

  const handleSubmit = async () => {
    if (!title.trim()) return
    if (edit && onUpdate) await onUpdate(edit.id, { title: title.trim(), description: description.trim() || undefined })
    else if (onCreate) await onCreate({ title: title.trim(), description: description.trim() || undefined })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{edit ? 'Edit Rally Cry' : 'Set Rally Cry'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="rc-title">Title</Label>
            <Input id="rc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Achieve product-market fit" />
          </div>
          <div><Label htmlFor="rc-desc">Description (optional)</Label>
            <Textarea id="rc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={creating ?? updating ?? false}>{edit ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Defining Objective modal ──────────────────────────────────────────────
function DefiningObjectiveModal({
  open, onClose, rallyCryId, rallyCryTitle, edit, onCreate, onUpdate, creating, updating,
}: {
  open: boolean
  onClose: () => void
  rallyCryId: string
  rallyCryTitle: string
  edit?: AdminDefiningObjectiveDto | null
  onCreate?: (body: { rallyCryId: string; title: string; description?: string }) => Promise<unknown>
  onUpdate?: (id: string, body: { title: string; description?: string; active?: boolean }) => Promise<unknown>
  creating?: boolean
  updating?: boolean
}): React.ReactElement {
  const [title, setTitle] = useState(edit?.title ?? '')
  const [description, setDescription] = useState(edit?.description ?? '')

  React.useEffect(() => {
    if (open) { setTitle(edit?.title ?? ''); setDescription(edit?.description ?? '') }
  }, [open, edit])

  const handleSubmit = async () => {
    if (!title.trim()) return
    if (edit && onUpdate) await onUpdate(edit.id, { title: title.trim(), description: description.trim() || undefined })
    else if (onCreate) await onCreate({ rallyCryId, title: title.trim(), description: description.trim() || undefined })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? 'Edit Defining Objective' : 'Add Defining Objective'}</DialogTitle>
          <p className="text-sm text-muted-foreground">Under: {rallyCryTitle}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="do-title">Title</Label>
            <Input id="do-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ship 3 customer-requested features" />
          </div>
          <div><Label htmlFor="do-desc">Description (optional)</Label>
            <Textarea id="do-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={creating ?? updating ?? false}>{edit ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Outcome modal ─────────────────────────────────────────────────────────
const UNIT_SUGGESTIONS = ['ms', 'USD', 'Percentage', 'Tickets', 'NPS', 'Users', 'Days', 'Points']

function OutcomeModal({
  open, onClose, definingObjectiveId, definingObjectiveTitle, orgMembers, edit, onCreate, onUpdate, creating, updating,
}: {
  open: boolean
  onClose: () => void
  definingObjectiveId: string
  definingObjectiveTitle: string
  orgMembers: OrgMemberDto[]
  edit?: AdminOutcomeDto | null
  onCreate?: (body: { definingObjectiveId: string; ownerId: string; title: string; description?: string; startValue?: number; targetValue: number; unit: string }) => Promise<unknown>
  onUpdate?: (id: string, body: { title: string; description?: string; ownerId?: string; active?: boolean; startValue?: number; targetValue?: number; unit?: string }) => Promise<unknown>
  creating?: boolean
  updating?: boolean
}): React.ReactElement {
  const [title, setTitle] = useState(edit?.title ?? '')
  const [description, setDescription] = useState(edit?.description ?? '')
  const [ownerId, setOwnerId] = useState(edit?.ownerId ?? (orgMembers[0]?.userId ?? ''))
  const [startValue, setStartValue] = useState(edit?.startValue != null ? String(edit.startValue) : '0')
  const [targetValue, setTargetValue] = useState(edit?.targetValue != null ? String(edit.targetValue) : '')
  const [unit, setUnit] = useState(edit?.unit ?? '')

  React.useEffect(() => {
    if (open) {
      setTitle(edit?.title ?? '')
      setDescription(edit?.description ?? '')
      setOwnerId(edit?.ownerId ?? orgMembers[0]?.userId ?? '')
      setStartValue(edit?.startValue != null ? String(edit.startValue) : '0')
      setTargetValue(edit?.targetValue != null ? String(edit.targetValue) : '')
      setUnit(edit?.unit ?? '')
    }
  }, [open, edit, orgMembers])

  const parsedStart = parseFloat(startValue) || 0
  const parsedTarget = parseFloat(targetValue)
  const isTargetInvalid = isNaN(parsedTarget) || parsedTarget === parsedStart
  const isDescriptionVague = description.trim() !== '' && !/\d/.test(description)
  const canSubmit = title.trim() && ownerId && !isTargetInvalid && unit.trim()

  const handleSubmit = async () => {
    if (!canSubmit) return
    if (edit && onUpdate) {
      await onUpdate(edit.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        ownerId,
        startValue: parsedStart,
        targetValue: parsedTarget,
        unit: unit.trim(),
      })
    } else if (onCreate) {
      await onCreate({
        definingObjectiveId,
        ownerId,
        title: title.trim(),
        description: description.trim() || undefined,
        startValue: parsedStart,
        targetValue: parsedTarget,
        unit: unit.trim(),
      })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{edit ? 'Edit Outcome' : 'Add Outcome'}</DialogTitle>
          <p className="text-sm text-muted-foreground">Under: {definingObjectiveTitle}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="out-title">Title</Label>
            <Input id="out-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reduce API response time below 200ms" />
          </div>
          <div>
            <Label htmlFor="out-owner">Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="out-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>
                {orgMembers.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.fullName} ({m.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Measurability fields */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#1152d4]">
              Measurable Target <span className="font-normal text-slate-400 normal-case tracking-normal">(Advantage Rule)</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="out-unit" className="text-xs">Unit</Label>
                <Input
                  id="out-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="ms, USD, %…"
                  list="unit-suggestions"
                />
                <datalist id="unit-suggestions">
                  {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="out-start" className="text-xs">Baseline</Label>
                <Input
                  id="out-start"
                  type="number"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="out-target" className="text-xs">Target <span className="text-red-500">*</span></Label>
                <Input
                  id="out-target"
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g. 180"
                  className={isTargetInvalid && targetValue !== '' ? 'border-red-400' : ''}
                />
                {isTargetInvalid && targetValue !== '' && (
                  <p className="text-[10px] text-red-500 mt-1">Target must differ from baseline.</p>
                )}
              </div>
            </div>
            {/* Preview */}
            {!isTargetInvalid && unit.trim() && (
              <p className="text-[10px] text-slate-500">
                Goal: move from <strong>{parsedStart}{unit}</strong> → <strong>{parsedTarget}{unit}</strong>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="out-desc" className="flex items-center gap-1.5">
              Description (optional)
              {isDescriptionVague && (
                <span
                  className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded cursor-help"
                  title="Advantage Rule: Outcomes must be quantitative. Please define a specific numeric target."
                >
                  ⚠ Vague
                </span>
              )}
            </Label>
            <Textarea id="out-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional context. Tip: include numbers to strengthen clarity." />
            {isDescriptionVague && (
              <p className="text-[10px] text-amber-600 mt-1">
                Advantage Rule: Outcomes must be quantitative. Please define a specific numeric target.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={(creating ?? false) || (updating ?? false) || !canSubmit}
            title={isTargetInvalid ? 'Set a target value that differs from the baseline to enable.' : undefined}
          >
            {edit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// DO icon palette — cycle through a set of colored backgrounds
const DO_ICON_PALETTE = [
  { bg: 'bg-blue-100', text: 'text-blue-600', Icon: Zap },
  { bg: 'bg-indigo-100', text: 'text-indigo-600', Icon: FileText },
  { bg: 'bg-[#1152d4]/10', text: 'text-[#1152d4]', Icon: Wifi },
  { bg: 'bg-slate-100', text: 'text-slate-600', Icon: CreditCard },
  { bg: 'bg-cyan-100', text: 'text-cyan-600', Icon: BarChart3 },
  { bg: 'bg-purple-100', text: 'text-purple-600', Icon: Radio },
]

// ─── Rally Cry card ──────────────────────────────────────────────────────────
function RallyCryCard({
  rallyCry, onEditRallyCry, onDeactivateRallyCry,
  onAddDo, onEditDo, onDeactivateDo,
  onAddOutcome, onEditOutcome, onDeactivateOutcome,
  canAddDo = false,
}: {
  rallyCry: AdminRallyCryDto
  onEditRallyCry: (rc: AdminRallyCryDto) => void
  onDeactivateRallyCry: (id: string) => void
  onAddDo: (rallyCryId: string, rallyCryTitle: string) => void
  onEditDo: (do_: AdminDefiningObjectiveDto, rallyCryTitle: string) => void
  onDeactivateDo: (id: string) => void
  onAddOutcome: (do_: AdminDefiningObjectiveDto) => void
  onEditOutcome: (o: AdminOutcomeDto, doTitle: string) => void
  onDeactivateOutcome: (id: string) => void
  canAddDo?: boolean
}): React.ReactElement {
  const dos = rallyCry.definingObjectives ?? []

  return (
    <div className={`space-y-6${!rallyCry.active ? ' opacity-60' : ''}`}>

      {/* ── Defining Objectives section header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black flex items-center gap-2 text-[#1e293b]">
          Defining Objectives
          <span className="text-sm font-normal text-slate-500">(Q{Math.ceil((new Date().getMonth() + 1) / 3)} Focus)</span>
        </h3>
        <div className="flex gap-2 items-center">
          {rallyCry.active && (
            <button
              onClick={() => onDeactivateRallyCry(rallyCry.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Deactivate Rally Cry"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {!rallyCry.active && <Badge variant="secondary">Inactive</Badge>}
        </div>
      </div>

      {/* ── DO Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dos.map((do_, index) => {
          const palette = DO_ICON_PALETTE[index % DO_ICON_PALETTE.length]!
          const IconComp = palette.Icon
          const activeDO = do_.active
          return (
            <div
              key={do_.id}
              className={`bg-white border border-slate-200 p-6 rounded-2xl flex flex-col gap-5 hover:border-[#1152d4]/50 transition-all shadow-sm${!activeDO ? ' opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className={`size-12 ${palette.bg} ${palette.text} rounded-lg flex items-center justify-center`}>
                  <IconComp className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-tighter rounded ${
                    activeDO
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {activeDO ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1 leading-tight text-[#1e293b]">{do_.title}</h4>
                {do_.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">{do_.description}</p>
                )}
              </div>

              {/* Outcomes */}
              {(do_.outcomes ?? []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Outcomes ({do_.outcomes.filter(o => o.active).length})
                  </p>
                  <div className="space-y-1">
                    {do_.outcomes.slice(0, 3).map((o) => (
                      <div key={o.id} className={`flex items-center justify-between gap-2 group${!o.active ? ' opacity-60' : ''}`}>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                          <span className="text-xs text-slate-600 truncate">{o.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {o.active && (
                            <>
                              <button onClick={() => onEditOutcome(o, do_.title)} className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button onClick={() => onDeactivateOutcome(o.id)} className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress bar placeholder */}
              <div className="mt-auto space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase text-slate-400">
                  <span>Progress</span>
                  <span>{do_.outcomes?.filter(o => o.active).length ?? 0} outcomes</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: activeDO ? `${Math.min(100, (do_.outcomes?.filter(o => o.active).length ?? 0) * 20)}%` : '0%', backgroundColor: '#1152d4' }}
                  />
                </div>
              </div>

              {/* Actions */}
              {activeDO && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onAddOutcome(do_)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all text-white hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: '#1152d4' }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Outcome
                  </button>
                  <button
                    onClick={() => onEditDo(do_, rallyCry.title)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDeactivateDo(do_.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add Defining Objective dashed card — leadership only */}
        {canAddDo && rallyCry.active && (
          <button
            onClick={() => onAddDo(rallyCry.id, rallyCry.title)}
            className="bg-slate-50 border-2 border-dashed border-slate-300 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-100 hover:border-[#1152d4]/50 transition-all text-slate-400 hover:text-[#1152d4]"
          >
            <div className="size-12 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            <span className="font-bold text-sm">Add Defining Objective</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export function StrategyPage(): React.ReactElement {
  const { data, isLoading, error } = useRcdoAdmin()
  const { data: orgMembers } = useOrgMembers()

  const [rallyCryModal, setRallyCryModal] = useState<{ open: boolean; edit: AdminRallyCryDto | null }>({ open: false, edit: null })
  const [doModal, setDoModal] = useState<{ open: boolean; rallyCryId: string; rallyCryTitle: string; edit: AdminDefiningObjectiveDto | null }>({ open: false, rallyCryId: '', rallyCryTitle: '', edit: null })
  const [outcomeModal, setOutcomeModal] = useState<{ open: boolean; definingObjectiveId: string; definingObjectiveTitle: string; edit: AdminOutcomeDto | null }>({ open: false, definingObjectiveId: '', definingObjectiveTitle: '', edit: null })

  const createRallyCry = useCreateRallyCry()
  const updateRallyCry = useUpdateRallyCry()
  const deactivateRallyCry = useDeactivateRallyCry()
  const createDo = useCreateDefiningObjective()
  const updateDo = useUpdateDefiningObjective()
  const deactivateDo = useDeactivateDefiningObjective()
  const createOutcome = useCreateOutcome()
  const updateOutcome = useUpdateOutcome()
  const deactivateOutcome = useDeactivateOutcome()

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading strategy...</div>
  if (error) return <div className="p-8 text-center text-destructive">Failed to load strategy</div>
  if (!data) return <div className="p-8 text-center">No data</div>

  const rallyCries = data.rallyCries ?? []
  const members = orgMembers ?? []
  const hasActiveRallyCry = rallyCries.some((rc) => rc.active)

  const activeRallyCry = rallyCries.find((rc) => rc.active)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* ── Dark RC Hero Banner ── */}
      {activeRallyCry && (
        <section className="relative overflow-hidden rounded-2xl bg-[#1e293b] text-white p-8 md:p-12 shadow-2xl shadow-[#1e293b]/20">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 size-64 bg-[#1152d4]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 size-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1152d4]/20 border border-[#1152d4]/30 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest">
                <Crown className="h-3.5 w-3.5" />
                Rallying Cry
              </div>
              <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">{activeRallyCry.title}</h2>
              {activeRallyCry.description && (
                <p className="text-slate-400 text-lg leading-relaxed">{activeRallyCry.description}</p>
              )}
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
              <div className="text-5xl font-black text-[#1152d4]">
                {rallyCries.filter((rc) => rc.active).flatMap((rc) => rc.definingObjectives?.filter((d) => d.active) ?? []).length * 20}%
              </div>
              <div className="w-48 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1152d4] rounded-full"
                  style={{ width: `${Math.min(100, rallyCries.filter((rc) => rc.active).flatMap((rc) => rc.definingObjectives?.filter((d) => d.active) ?? []).length * 20)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Velocity</span>
            </div>
          </div>
        </section>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">
            Organizational Alignment
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quarterly Leadership Dashboard · Rally Cry and Defining Objectives are set by leadership. You define the Outcomes.
          </p>
        </div>
        {!hasActiveRallyCry && (
          <Button
            onClick={() => setRallyCryModal({ open: true, edit: null })}
            className="shrink-0 bg-[#1152d4] hover:bg-[#1152d4]/90 text-white font-bold shadow-lg shadow-[#1152d4]/20"
          >
            <Crown className="h-4 w-4 mr-2 text-amber-300" />
            Set Rally Cry
          </Button>
        )}
      </div>

      {/* Modals */}
      <RallyCryModal
        open={rallyCryModal.open}
        onClose={() => setRallyCryModal({ open: false, edit: null })}
        edit={rallyCryModal.edit}
        onCreate={(body) => createRallyCry.mutateAsync(body)}
        onUpdate={(id, body) => updateRallyCry.mutateAsync({ id, body })}
        creating={createRallyCry.isPending}
        updating={updateRallyCry.isPending}
      />
      <DefiningObjectiveModal
        open={doModal.open}
        onClose={() => setDoModal({ open: false, rallyCryId: '', rallyCryTitle: '', edit: null })}
        rallyCryId={doModal.rallyCryId}
        rallyCryTitle={doModal.rallyCryTitle}
        edit={doModal.edit}
        onCreate={(body) => createDo.mutateAsync(body)}
        onUpdate={(id, body) => updateDo.mutateAsync({ id, body })}
        creating={createDo.isPending}
        updating={updateDo.isPending}
      />
      <OutcomeModal
        open={outcomeModal.open}
        onClose={() => setOutcomeModal({ open: false, definingObjectiveId: '', definingObjectiveTitle: '', edit: null })}
        definingObjectiveId={outcomeModal.definingObjectiveId}
        definingObjectiveTitle={outcomeModal.definingObjectiveTitle}
        orgMembers={members}
        edit={outcomeModal.edit}
        onCreate={(body) => createOutcome.mutateAsync(body)}
        onUpdate={(id, body) => updateOutcome.mutateAsync({ id, body })}
        creating={createOutcome.isPending}
        updating={updateOutcome.isPending}
      />

      {/* Rally Cries */}
      <div className="space-y-8">
        {rallyCries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center bg-white">
            <div className="w-16 h-16 rounded-2xl bg-[#1152d4]/10 flex items-center justify-center mx-auto mb-4">
              <Crown className="h-8 w-8 text-[#1152d4]" />
            </div>
            <p className="text-lg font-bold text-slate-700">No Rally Cry set</p>
            <p className="text-sm text-slate-400 mt-1 mb-6 max-w-sm mx-auto">
              Define your organization's singular thematic goal. Per Lencioni's <em>The Advantage</em>, every organization has exactly one.
            </p>
            <Button
              onClick={() => setRallyCryModal({ open: true, edit: null })}
              className="bg-[#1152d4] hover:bg-[#1152d4]/90 text-white font-bold shadow-lg shadow-[#1152d4]/20"
            >
              <Crown className="h-4 w-4 mr-2 text-amber-300" />
              Set Rally Cry
            </Button>
          </div>
        ) : (
          rallyCries.map((rc) => (
            <RallyCryCard
              key={rc.id}
              rallyCry={rc}
              onEditRallyCry={(r) => setRallyCryModal({ open: true, edit: r })}
              onDeactivateRallyCry={(id) => void deactivateRallyCry.mutateAsync(id)}
              onAddDo={(rallyCryId, rallyCryTitle) => setDoModal({ open: true, rallyCryId, rallyCryTitle, edit: null })}
              onEditDo={(do_, rallyCryTitle) => setDoModal({ open: true, rallyCryId: do_.rallyCryId, rallyCryTitle, edit: do_ })}
              onDeactivateDo={(id) => void deactivateDo.mutateAsync(id)}
              onAddOutcome={(do_) => setOutcomeModal({ open: true, definingObjectiveId: do_.id, definingObjectiveTitle: do_.title, edit: null })}
              onEditOutcome={(o, doTitle) => setOutcomeModal({ open: true, definingObjectiveId: o.definingObjectiveId, definingObjectiveTitle: doTitle, edit: o })}
              onDeactivateOutcome={(id) => void deactivateOutcome.mutateAsync(id)}
            />
          ))
        )}
      </div>

      {/* Lencioni callout */}
      {rallyCries.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-sm text-slate-600 bg-white border border-slate-200 shadow-sm">
          <span className="text-base leading-none mt-0.5">📖</span>
          <p>
            Per Lencioni's <em className="font-medium">The Advantage</em>, every organization has exactly one Rally Cry —
            the single most important goal right now. All Defining Objectives must serve it.
          </p>
        </div>
      )}
    </div>
  )
}
