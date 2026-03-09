import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function AppNav(): React.ReactElement | null {
  const { user, logout } = useAuthStore()
  if (!user) return null

  const isEmployee = user.roles.includes('EMPLOYEE') || user.roles.includes('DUAL_ROLE')
  const isManager = user.roles.includes('MANAGER') || user.roles.includes('DUAL_ROLE')

  const tabs = [
    isEmployee && { to: '/commits', label: 'My Week' },
    isEmployee && { to: '/history', label: 'History' },
    isManager && { to: '/manager', label: 'My Team' },
    isManager && { to: '/manager/strategy', label: 'Strategy' },
  ].filter((t): t is { to: string; label: string } => Boolean(t))

  return (
    <nav className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 flex items-center h-12">
        <div className="flex items-center gap-1 flex-1">
          {tabs.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void logout()}>
          Sign Out
        </Button>
      </div>
    </nav>
  )
}
