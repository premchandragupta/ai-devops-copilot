"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pipelines', label: 'Pipelines' },
  { href: '/policies', label: 'Policies' },
]

export function AppSidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:block w-56 border-r min-h-[calc(100vh-3.5rem)]">
      <nav className="p-3 space-y-1">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={clsx(
              'block rounded-xl px-3 py-2 text-sm hover:bg-gray-50',
              pathname === i.href ? 'bg-gray-100 font-semibold' : 'text-gray-600'
            )}
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
