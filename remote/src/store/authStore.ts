import { create } from 'zustand'
import { auth, setAuthExpiredHandler, getOAuthUrl } from '@/api/client'
import type { UserResponse } from '@/types'

interface AuthState {
  user: UserResponse | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => Promise<void>
  fetchUser: (retry?: boolean) => Promise<void>
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
      set({ user: null, isAuthenticated: false })
      try {
        const data = await auth.logout()
        // Redirect to IdP logout so next Sign In shows login screen instead of reusing IdP session
        if (data.idpLogoutUrl) {
          window.location.href = data.idpLogoutUrl
          return
        }
      } finally {
        window.location.href = window.location.origin + '/'
      }
    },

    fetchUser: async (retry = false): Promise<void> => {
      set({ isLoading: true })
      try {
        const user = await auth.me()
        set({ user, isAuthenticated: true, isLoading: false })
      } catch {
        if (!retry) {
          // Cookie may not be visible yet after OAuth redirect; retry once
          setTimeout(() => useAuthStore.getState().fetchUser(true), 500)
          return
        }
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    },

    onAuthExpired,
  }
})
