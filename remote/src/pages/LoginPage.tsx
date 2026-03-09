import React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LoginPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Weekly Commit</h1>
        <p className="text-sm text-muted-foreground">
          Plan your week, track your goals, stay aligned.
        </p>
      </div>
      <a
        href="http://localhost:8080/oauth2/authorization/oidc"
        className={cn(buttonVariants({ size: 'lg' }))}
      >
        Sign In
      </a>
    </div>
  )
}
