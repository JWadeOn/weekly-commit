import React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BACKEND_ORIGIN } from '@/api/client'

export function LoginPage(): React.ReactElement {
  const oauthHref = `${BACKEND_ORIGIN || window.location.origin}/oauth2/authorization/oidc`
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Weekly Commit</h1>
        <p className="text-sm text-muted-foreground">
          Plan your week, track your goals, stay aligned.
        </p>
      </div>
      <a
        href={oauthHref}
        className={cn(buttonVariants({ size: 'lg' }))}
      >
        Sign In
      </a>
    </div>
  )
}
