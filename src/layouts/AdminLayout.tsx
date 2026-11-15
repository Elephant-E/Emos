import { useEffect, useRef, useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { GlobalSearch } from '@/components/GlobalSearch'
import { Sidebar } from '@/components/Sidebar'
import { MobileTopbar } from '@/components/MobileTopbar'
import { useSession } from '@/api/queries'
import { ToastHost } from '@/ui/toast'
import { ConfirmHost } from '@/ui/confirm'
import { PromptHost } from '@/ui/prompt'
import { NavContext } from '@/ui/nav'
import * as Collapsible from '@radix-ui/react-collapsible'
import { useMediaQuery } from '@/lib/useMediaQuery'

export function AdminLayout() {
  const { data } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const pageRef = useRef<HTMLElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  /** 桌面端侧栏常显，手机端才交给 Collapsible 做展开动画 */
  const isCompact = useMediaQuery('(max-width: 600px)')

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
      <Collapsible.Root open={navOpen} onOpenChange={setNavOpen} asChild>
        <div className={navOpen ? 'shell shell--nav-open' : 'shell'}>
          <MobileTopbar user={data} />
          <Collapsible.Content asChild forceMount={isCompact ? undefined : true}>
            <Sidebar user={data} onOpenSearch={() => setSearchOpen(true)} open={navOpen} onClose={() => setNavOpen(false)} />
          </Collapsible.Content>
          {navOpen ? (
            <button type="button" className="shell__scrim" aria-label="关闭导航" onClick={() => setNavOpen(false)} />
          ) : null}
          <main className="page" ref={pageRef}>
            <div className="page-body" key={pathname}>
              <Outlet />
            </div>
          </main>
        </div>
      </Collapsible.Root>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ToastHost />
      <ConfirmHost />
      <PromptHost />
    </NavContext.Provider>
  )
}
