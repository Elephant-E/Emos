import { useEffect, useRef, useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { GlobalSearch } from '@/components/GlobalSearch'
import { Sidebar } from '@/components/Sidebar'
import { MobileTopbar } from '@/components/MobileTopbar'
import { useSession } from '@/api/queries'
import { ToastHost } from '@/ui/toast'
import { ConfirmHost } from '@/ui/confirm'
import { PromptHost } from '@/ui/prompt'
import * as Collapsible from '@radix-ui/react-collapsible'

/** 每个 URL 各自的滚动位置：从列表点进详情再返回时，回到原来的位置 */
const SCROLL_KEY = 'emos_scroll_positions'

function readScrollMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function writeScrollMap(map: Record<string, number>) {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map))
  } catch {
    /* 隐私模式忽略 */
  }
}

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

  const locationKey = useRouterState({ select: (s) => s.location.href })

  useEffect(() => {
    // 返回上一页时恢复位置；首次进入某个 URL 才回顶部。
    // 列表数据是异步回来的，内容高度没撑开前 scrollTop 会被夹住，
    // 所以要在随后几帧里反复尝试，直到到位或超时。
    const saved = readScrollMap()[locationKey] ?? 0
    const el = pageRef.current
    if (!el) return
    if (saved <= 0) {
      el.scrollTo({ top: 0 })
      return
    }
    el.scrollTo({ top: saved })
    let frames = 0
    let raf = 0
    const retry = () => {
      frames += 1
      if (Math.abs(el.scrollTop - saved) < 2 || frames > 90) return
      el.scrollTo({ top: saved })
      raf = requestAnimationFrame(retry)
    }
    raf = requestAnimationFrame(retry)
    return () => cancelAnimationFrame(raf)
    // 换页就收起抽屉，否则手机上新页面会被导航盖住
    setNavOpen(false)
  }, [locationKey])

  // 滚动位置按 URL 记住（节流到每帧一次）
  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const map = readScrollMap()
        map[locationKey] = el.scrollTop
        writeScrollMap(map)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [locationKey])

  // 抽屉只属于窄屏：视口变宽（横屏/拖窗口）时必须收起来，
  // 否则 .shell--nav-open 的遮罩与 body 锁滚动会带到桌面断点，整页被压成一列
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 601px)')
    const onChange = () => {
      if (mql.matches) setNavOpen(false)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // 抽屉：Esc 收起 + 打开时锁住背景滚动（与 Modal 的行为保持一致）
  useEffect(() => {
    if (!navOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [navOpen])

  return (
    <>
      <Collapsible.Root open={navOpen} onOpenChange={setNavOpen} asChild>
        <div className={navOpen ? 'shell shell--nav-open' : 'shell'}>
          <MobileTopbar user={data} />
          {/* 侧栏始终挂载：以前按断点决定 forceMount，视口从 390 变宽到 844/1280 时
              Radix 不会重新挂载内容，导致 .rail 缺失、main 被塞进侧栏那一列（66/300px）。
              现在恒挂载，手机端的「收起」交给 CSS（closed 态 display:none）。 */}
          <Collapsible.Content asChild forceMount>
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
    </>
  )
}
