import { useEffect, useRef, useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { GlobalSearch } from '@/components/GlobalSearch'
import { Sidebar } from '@/components/Sidebar'
import { useSession } from '@/api/queries'
import { ToastHost } from '@/ui/toast'
import { ConfirmHost } from '@/ui/confirm'
import { PromptHost } from '@/ui/prompt'
import { NavContext } from '@/ui/nav'

export function AdminLayout() {
  const { data } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const pageRef = useRef<HTMLElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

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
    // 换页就收起抽屉，否则手机上新页面会被导航盖住
    setNavOpen(false)
  }, [pathname])

  return (
    <NavContext.Provider value={() => setNavOpen(true)}>
      <div className={navOpen ? 'shell shell--nav-open' : 'shell'}>
        <Sidebar user={data} onOpenSearch={() => setSearchOpen(true)} open={navOpen} onClose={() => setNavOpen(false)} />
        {navOpen ? <button type="button" className="shell__scrim" aria-label="关闭导航" onClick={() => setNavOpen(false)} /> : null}
        <main className="page" ref={pageRef}>
          <div className="page-body" key={pathname}>
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ToastHost />
      <ConfirmHost />
      <PromptHost />
    </NavContext.Provider>
  )
}
