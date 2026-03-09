import React, { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  open,
  onClose,
  edit,
  onCreate,
  onUpdate,
  creating,
  updating,
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
    if (open) {
      setTitle(edit?.title ?? '')
      setDescription(edit?.description ?? '')
    }
  }, [open, edit])

  const handleSubmit = async () => {
    if (!title.trim()) return
    if (edit && onUpdate) {
      await onUpdate(edit.id, { title: title.trim(), description: description.trim() || undefined })
    } else if (onCreate) {
      await onCreate({ title: title.trim(), description: description.trim() || undefined })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? 'Edit Rally Cry' : 'Add Rally Cry'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="rc-title">Title</Label>
            <Input id="rc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Achieve product-market fit" />
          </div>
          <div>
            <Label htmlFor="rc-desc">Description (optional)</Label>
            <Textarea id="rc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={creating ?? updating ?? false}>
            {edit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Defining Objective modal ──────────────────────────────────────────────
function DefiningObjectiveModal({
  open,
  onClose,
  rallyCryId,
  rallyCryTitle,
  edit,
  onCreate,
  onUpdate,
  creating,
  updating,
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
    if (open) {
      setTitle(edit?.title ?? '')
      setDescription(edit?.description ?? '')
    }
  }, [open, edit])

  const handleSubmit = async () => {
    if (!title.trim()) return
    if (edit && onUpdate) {
      await onUpdate(edit.id, { title: title.trim(), description: description.trim() || undefined })
    } else if (onCreate) {
      await onCreate({ rallyCryId, title: title.trim(), description: description.trim() || undefined })
    }
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
          <div>
            <Label htmlFor="do-title">Title</Label>
            <Input id="do-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ship 3 customer-requested features" />
          </div>
          <div>
            <Label htmlFor="do-desc">Description (optional)</Label>
            <Textarea id="do-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={creating ?? updating ?? false}>
            {edit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Outcome modal ─────────────────────────────────────────────────────────
function OutcomeModal({
  open,
  onClose,
  definingObjectiveId,
  definingObjectiveTitle,
  orgMembers,
  edit,
  onCreate,
  onUpdate,
  creating,
  updating,
}: {
  open: boolean
  onClose: () => void
  definingObjectiveId: string
  definingObjectiveTitle: string
  orgMembers: OrgMemberDto[]
  edit?: AdminOutcomeDto | null
  onCreate?: (body: { definingObjectiveId: string; ownerId: string; title: string; description?: string }) => Promise<unknown>
  onUpdate?: (id: string, body: { title: string; description?: string; ownerId?: string; active?: boolean }) => Promise<unknown>
  creating?: boolean
  updating?: boolean
}): React.ReactElement {
  const [title, setTitle] = useState(edit?.title ?? '')
  const [description, setDescription] = useState(edit?.description ?? '')
  const [ownerId, setOwnerId] = useState(edit?.ownerId ?? (orgMembers[0]?.userId ?? ''))

  React.useEffect(() => {
    if (open) {
      setTitle(edit?.title ?? '')
      setDescription(edit?.description ?? '')
      setOwnerId(edit?.ownerId ?? orgMembers[0]?.userId ?? '')
    }
  }, [open, edit, orgMembers])

  const handleSubmit = async () => {
    if (!title.trim() || !ownerId) return
    if (edit && onUpdate) {
      await onUpdate(edit.id, { title: title.trim(), description: description.trim() || undefined, ownerId })
    } else if (onCreate) {
      await onCreate({ definingObjectiveId, ownerId, title: title.trim(), description: description.trim() || undefined })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
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
            <Label htmlFor="out-owner">Owner (team member)</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="out-owner">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {orgMembers.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.fullName} ({m.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="out-desc">Description (optional)</Label>
            <Textarea id="out-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={creating ?? updating ?? false}>
            {edit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Rally Cry card (with nested DOs and Outcomes) ───────────────────────────
function RallyCryCard({
  rallyCry,
  onEditRallyCry,
  onDeactivateRallyCry,
  onAddDo,
  onEditDo,
  onDeactivateDo,
  onAddOutcome,
  onEditOutcome,
  onDeactivateOutcome,
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
}): React.ReactElement {
  const [expanded, setExpanded] = useState(true)

  return (
    <Card className={!rallyCry.active ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setExpanded((e) => !e)}>
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{rallyCry.title}</CardTitle>
              {rallyCry.description && (
                <CardDescription className="text-xs truncate">{rallyCry.description}</CardDescription>
              )}
            </div>
            {!rallyCry.active && <Badge variant="secondary">Inactive</Badge>}
          </div>
          {rallyCry.active && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditRallyCry(rallyCry)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeactivateRallyCry(rallyCry.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => onAddDo(rallyCry.id, rallyCry.title)} disabled={!rallyCry.active}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Defining Objective
            </Button>
          </div>
          {(rallyCry.definingObjectives ?? []).map((do_) => (
            <div key={do_.id} className="rounded-md border pl-4 pr-2 py-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{do_.title}</span>
                  {!do_.active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                {do_.active && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditDo(do_, rallyCry.title)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeactivateDo(do_.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => onAddOutcome(do_)}>
                      <Plus className="h-3 w-3 mr-1" /> Outcome
                    </Button>
                  </div>
                )}
              </div>
              <ul className="space-y-1">
                {(do_.outcomes ?? []).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="truncate flex-1">{o.title}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{o.ownerName}</span>
                    {o.active && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditOutcome(o, do_.title)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDeactivateOutcome(o.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {!o.active && <Badge variant="secondary">Inactive</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export function StrategyPage(): React.ReactElement {
  const { data, isLoading, error } = useRcdoAdmin()
  const { data: orgMembers } = useOrgMembers()

  const [rallyCryModal, setRallyCryModal] = useState<{ open: boolean; edit: AdminRallyCryDto | null }>({ open: false, edit: null })
  const [doModal, setDoModal] = useState<{
    open: boolean
    rallyCryId: string
    rallyCryTitle: string
    edit: AdminDefiningObjectiveDto | null
  }>({ open: false, rallyCryId: '', rallyCryTitle: '', edit: null })
  const [outcomeModal, setOutcomeModal] = useState<{
    open: boolean
    definingObjectiveId: string
    definingObjectiveTitle: string
    edit: AdminOutcomeDto | null
  }>({ open: false, definingObjectiveId: '', definingObjectiveTitle: '', edit: null })

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Strategy (RCDO)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage Rally Cries, Defining Objectives, and Outcomes. Assign team members to outcomes.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setRallyCryModal({ open: true, edit: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rally Cry
        </Button>
      </div>

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

      <div className="space-y-4">
        {rallyCries.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No Rally Cries yet. Add one to define your organization’s thematic goal.
            </CardContent>
          </Card>
        )}
        {rallyCries.map((rc) => (
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
        ))}
      </div>
    </div>
  )
}
