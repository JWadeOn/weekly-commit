import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { admin } from '@/api/client'
import type { AdminUserResponse, CreateUserRequest, UpdateUserRequest } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ROLE_OPTIONS = ['EMPLOYEE', 'MANAGER', 'ADMIN'] as const

export function AdminPage(): React.ReactElement {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserResponse | null>(null)

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => admin.listUsers(),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateUserRequest) => admin.createUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setCreateOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UpdateUserRequest }) =>
      admin.updateUser(userId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditingUser(null)
    },
  })

  if (isLoading) return <div className="p-8">Loading users...</div>
  if (error) return <div className="p-8 text-destructive">Failed to load users.</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User management</h1>
        <CreateUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          users={users}
          onSubmit={(body) => createMutation.mutate(body)}
          isSubmitting={createMutation.isPending}
          error={createMutation.error?.message}
        />
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-4 text-left font-medium">Email</th>
              <th className="h-10 px-4 text-left font-medium">Name</th>
              <th className="h-10 px-4 text-left font-medium">Manager</th>
              <th className="h-10 px-4 text-left font-medium">Roles</th>
              <th className="h-10 w-[80px] px-4" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="px-4 py-2 font-medium">{u.email}</td>
                <td className="px-4 py-2">{u.fullName}</td>
                <td className="px-4 py-2">{u.managerName ?? '—'}</td>
                <td className="px-4 py-2">{u.roles.join(', ')}</td>
                <td className="px-4 py-2">
                  <EditUserDialog
                    user={u}
                    users={users}
                    open={editingUser?.id === u.id}
                    onOpenChange={(open) => setEditingUser(open ? u : null)}
                    onSubmit={(body) => updateMutation.mutate({ userId: u.id, body })}
                    isSubmitting={updateMutation.isPending}
                    error={updateMutation.error?.message}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreateUserDialog({
  open,
  onOpenChange,
  users,
  onSubmit,
  isSubmitting,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: AdminUserResponse[]
  onSubmit: (body: CreateUserRequest) => void
  isSubmitting: boolean
  error: string | undefined
}): React.ReactElement {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [managerId, setManagerId] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>(['EMPLOYEE'])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onSubmit({
      email,
      fullName,
      managerId: managerId || null,
      roles,
    })
  }

  const toggleRole = (role: string): void => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const managers = users.filter((u) => u.roles.includes('MANAGER') || u.roles.includes('ADMIN'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Add user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Manager</Label>
              <Select
                value={managerId ?? 'none'}
                onValueChange={(v) => setManagerId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName} ({m.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Roles</Label>
              <div className="flex gap-4">
                {ROLE_OPTIONS.map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded border-input"
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-destructive mb-2">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || roles.length === 0}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  user,
  users,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  error,
}: {
  user: AdminUserResponse
  users: AdminUserResponse[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: UpdateUserRequest) => void
  isSubmitting: boolean
  error: string | undefined
}): React.ReactElement {
  const [managerId, setManagerId] = useState<string | null>(user.managerId)
  const [roles, setRoles] = useState<string[]>(user.roles)

  useEffect(() => {
    if (open) {
      setManagerId(user.managerId)
      setRoles(user.roles)
    }
  }, [open, user.id, user.managerId, user.roles])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onSubmit({ managerId, roles })
  }

  const toggleRole = (role: string): void => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const managers = users.filter(
    (u) => (u.roles.includes('MANAGER') || u.roles.includes('ADMIN')) && u.id !== user.id
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.fullName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Manager</Label>
              <Select
                value={managerId ?? 'none'}
                onValueChange={(v) => setManagerId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName} ({m.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Roles</Label>
              <div className="flex gap-4">
                {ROLE_OPTIONS.map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded border-input"
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-destructive mb-2">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || roles.length === 0}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
