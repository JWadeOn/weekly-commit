import { create } from 'zustand'
import { auth, setAuthExpiredHandler, getOAuthUrl } from '@/api/client'
import type { UserResponse } from '@/types'

interface AuthState {
  user: UserResponse | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
  onAuthExpired: () => void
}

export const useAuthStore = create<AuthState>((set) => {
  const oauthUrl = (): string => getOAuthUrl()

  const onAuthExpired = (): void => {
    set({ user: null, isAuthenticated: false, isLoading: false })
    window.location.href = oauthUrl()
  }

  setAuthExpiredHandler(onAuthExpired)

  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,

    login: (): void => {
      window.location.href = oauthUrl()
    },

    logout: async (): Promise<void> => {
      try {
        await auth.logout()
      } finally {
        set({ user: null, isAuthenticated: false })
        // Full navigation so host shell re-fetches auth and shows login
        window.location.href = window.location.origin + '/'
      }
    },

    fetchUser: async (): Promise<void> => {
      set({ isLoading: true })
      try {
        const user = await auth.me()
        set({ user, isAuthenticated: true, isLoading: false })
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    },

    onAuthExpired,
  }
})
