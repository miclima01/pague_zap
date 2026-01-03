"use client"

import { useSession } from "next-auth/react"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-semibold">PagueZap</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-sm text-muted-foreground">
          {session?.user?.name || session?.user?.email}
        </div>
      </div>
    </header>
  )
}

