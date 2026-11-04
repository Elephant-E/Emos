import { useEffect, useRef } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Sidebar } from '@/components/Sidebar'
import { useSession } from '@/api/queries'
import { ToastHost } from '@/ui/toast'
import { ConfirmHost } from '@/ui/confirm'

export function AdminLayout() {
  const { data } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const pageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="shell">
      <Sidebar user={data} />
      <main className="page" ref={pageRef}>
        <div className="page-body" key={pathname}>
          <Outlet />
        </div>
      </main>
      <ToastHost />
      <ConfirmHost />
    </div>
  )
}
