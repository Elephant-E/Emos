import { useEffect, useRef, useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { GlobalSearch } from '@/components/GlobalSearch'
import { Sidebar } from '@/components/Sidebar'
import { useSession } from '@/api/queries'
import { ToastHost } from '@/ui/toast'
import { ConfirmHost } from '@/ui/confirm'
import { PromptHost } from '@/ui/prompt'

export function AdminLayout() {
  const { data } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const pageRef = useRef<HTMLElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  // ⌘K / Ctrl+K 在任意页面打开搜索面板，与侧栏的键帽提示一致
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setSearchOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="shell">
      <Sidebar user={data} onOpenSearch={() => setSearchOpen(true)} />
      <main className="page" ref={pageRef}>
        <div className="page-body" key={pathname}>
          <Outlet />
        </div>
      </main>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ToastHost />
      <ConfirmHost />
      <PromptHost />
    </div>
  )
}
