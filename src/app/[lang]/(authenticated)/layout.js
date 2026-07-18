'use client'

import Sidebar from '@/components/Sidebar'
import { Suspense } from 'react'

export default function AuthenticatedLayout({ children }) {
  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: '#08080D' }}>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {children}
      </main>
    </div>
  )
}
