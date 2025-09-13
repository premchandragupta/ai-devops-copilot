import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-6 p-4">
        <AppSidebar />
        <main className="pb-16">{children}</main>
      </div>
    </div>
  )
}
