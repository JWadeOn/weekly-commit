import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import {
  CalendarCheck,
  Clock,
  BookOpen,
  Users,
  Target,
  LogOut,
  Trophy,
  Grid3X3,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean }

export function AppNav(): React.ReactElement | null {
  const { user, logout } = useAuthStore()
  if (!user) return null

  const isEmployee = user.roles.includes('EMPLOYEE') || user.roles.includes('DUAL_ROLE')
  const isManager = user.roles.includes('MANAGER') || user.roles.includes('DUAL_ROLE')
  const isAdmin = user.roles.includes('ADMIN')

  const frameworkItems: NavItem[] = ([] as NavItem[]).concat(
    isAdmin ? [{ to: '/admin', label: 'Admin', Icon: ShieldCheck, end: true }] : [],
    isManager ? [{ to: '/manager/strategy', label: 'Strategy', Icon: Target, end: true }] : [],
    isManager ? [{ to: '/manager', label: 'My Team', Icon: Users, end: true }] : [],
    [{ to: '/history', label: 'History', Icon: Clock, end: true }],
  )

  const myWeekItems: NavItem[] = ([] as NavItem[]).concat(
    isEmployee ? [{ to: '/commits', label: 'Weekly Commits', Icon: CalendarCheck, end: true }] : [],
    isEmployee ? [{ to: '/resources', label: 'Resources', Icon: BookOpen, end: true }] : [],
  )

  const boardItem: NavItem = { to: '/board', label: 'The Board', Icon: Grid3X3, end: true }

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  const displayName = user.fullName ?? user.email
  const roleLabel = isAdmin
    ? 'Admin'
    : isManager && isEmployee
    ? 'Manager / Employee'
    : isManager
    ? 'Manager'
    : 'Individual Contributor'

  return (
    <aside className="w-64 shrink-0 sticky top-0 h-screen overflow-y-auto flex flex-col bg-[#1e293b] border-r border-white/5">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
        <div className="bg-[#1152d4] p-1.5 rounded-lg text-white shrink-0">
          <Trophy className="h-5 w-5" />
        </div>
        <h2 className="font-black text-xl tracking-tight text-white">The Advantage</h2>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 flex flex-col gap-0.5 overflow-y-auto">
        {frameworkItems.length > 0 && (
          <>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 pt-4 pb-2">
              Framework
            </div>
            {frameworkItems.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-white' : 'text-slate-500'
                      )}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}

        {/* The Board — visible to all roles */}
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 pt-4 pb-2">
          Team
        </div>
        <NavLink
          to={boardItem.to}
          end={boardItem.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Grid3X3
                className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-500')}
              />
              {boardItem.label}
            </>
          )}
        </NavLink>

        {myWeekItems.length > 0 && (
          <>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 pt-6 pb-2">
              My Week
            </div>
            {myWeekItems.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-[#1152d4] text-white shadow-lg shadow-[#1152d4]/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-white' : 'text-slate-500'
                      )}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={() => void logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
