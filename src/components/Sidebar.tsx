import { forwardRef, useEffect, useRef, useState, type HTMLAttributes } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { rememberAccount } from '@/lib/accounts'
import type { UserInfo } from '@/api/types'
import { Avatar } from './Avatar'
import { AccountMenu } from './AccountMenu'
import { hasLayer } from '@/ui/layers'
import { USE_MOCK } from '@/api/client'
import {
  IconBag,
  IconFilm,
  IconGift,
  IconLottery,
  IconRank,
  IconVote,
  IconWhisper,
  IconGrid,
  IconInbox,
  IconLive,
  IconShield,
  IconLogo,
  IconWallet,
  IconReceipt,
  IconRoute,
  IconSearch,
  IconTag,
  IconUpload,
  IconUser,
} from './icons'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ size?: number }> }

/** 概览不属于任何业务域，单独置顶、不带组标题 */
const PINNED: NavItem[] = [{ to: '/', label: '概览', icon: IconGrid }]

/**
 * 按业务对象分组：内容 = 片库本身，交易 = 钱和货，社区 = 人和活动，
 * 系统 = 基础设施与账号。
 */
const GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: '内容',
    items: [
      { to: '/library', label: '媒体库', icon: IconFilm },
      { to: '/watchlists', label: '片单', icon: IconTag },
      { to: '/seek', label: '求片', icon: IconInbox },
      { to: '/upload', label: '上传', icon: IconUpload },
      { to: '/live', label: '直播', icon: IconLive },
    ],
  },
  {
    label: '交易',
    items: [
      { to: '/shop', label: '商城', icon: IconBag },
      { to: '/orders', label: '订单', icon: IconReceipt },
      { to: '/fund', label: '资金', icon: IconWallet },
    ],
  },
  {
    label: '社区',
    items: [
      { to: '/users', label: '用户', icon: IconShield },
      { to: '/whisper', label: '悄悄话', icon: IconWhisper },
      { to: '/redpacket', label: '红包', icon: IconGift },
      { to: '/rank', label: '榜单', icon: IconRank },
      { to: '/lottery', label: '抽奖', icon: IconLottery },
      { to: '/vote', label: '投票', icon: IconVote },
    ],
  },
  {
    label: '系统',
    items: [
      { to: '/lines', label: '线路', icon: IconRoute },
      { to: '/account', label: '账号', icon: IconUser },
    ],
  },
]

/**
 * 侧栏。桌面端是常驻导航栏；手机端作为 Radix Collapsible 的内容，
 * 展开高度由 Radix 写入的 --radix-collapsible-content-height 驱动，
 * 因此这里必须把外部传入的 props / ref 透传到 <aside>（asChild 依赖这一点）。
 */
export const Sidebar = forwardRef<
  HTMLElement,
  {
    user?: UserInfo
    onOpenSearch: () => void
    /** 手机端面板是否展开（桌面端忽略） */
    open?: boolean
    onClose?: () => void
  } & HTMLAttributes<HTMLElement>
>(function Sidebar({ user, onOpenSearch, open = false, onClose, ...rest }, ref) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)
  const footRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (footRef.current?.contains(event.target as Node)) return
      // 上面开着弹层（如「添加账号」）：那次点击属于弹层，
      // 弹层是 portal 到 body 的，不在 footRef 里，不能因此关掉菜单
      if (hasLayer()) return
      setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Esc 先归最上层弹层处理
      if (hasLayer()) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // 菜单 18 项，矮屏下会滚动；切页时把当前项滚进视野
  useEffect(() => {
    const active = scrollRef.current?.querySelector('.rail__item.is-active')
    active?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  // 登录后把自己记进账号列表（AccountMenu 直接读这份本地记录）
  useEffect(() => {
    if (!user?.user_id) return
    rememberAccount({ user_id: user.user_id, username: user.username, pseudonym: user.pseudonym, avatar: user.avatar })
  }, [user?.user_id, user?.username, user?.pseudonym, user?.avatar])

  return (
    <aside ref={ref} {...rest} className={`rail${open ? ' is-open' : ''}${rest.className ? ` ${rest.className}` : ''}`}>
      <div className="rail__brand">
        <div className="rail__brand-name">
          <IconLogo />
          <span>EMOS</span>
          <em>Club</em>
          {USE_MOCK ? <span className="rail__badge">MOCK</span> : null}
        </div>

      </div>

      <button type="button" className="rail__search" onClick={onOpenSearch} aria-label="全局搜索">
        <IconSearch size={15} />
        <span className="rail__search-text">搜索</span>
        <span className="rail__keys">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      <div
        className="rail__scroll"
        ref={scrollRef}
        onClickCapture={(event) => {
          // 手机端：点任意导航项后收起抽屉（桌面端 open 恒为 false，不受影响）
          if (!open) return
          const target = event.target as HTMLElement
          if (target.closest('a[data-nav], .rail__item')) onClose?.()
        }}
      >
      <nav className="rail__nav" style={{ marginTop: 'var(--stack)' }}>
        {PINNED.map((item) => {
          const Icon = item.icon
          const active = pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`rail__item${active ? ' is-active' : ''}`}
              aria-label={item.label}
              title={item.label}
            >
              <span className="rail__ico">
                <Icon size={16} />
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="rail__label">{group.label}</p>
          <nav className="rail__nav" aria-label={group.label}>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rail__item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span className="rail__ico">
                    <Icon size={16} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
              })}
          </nav>
        </div>
      ))}
      </div>

      <div className="rail__foot" ref={footRef}>
        <button type="button"
          className="rail__account"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Avatar url={user?.avatar} name={user?.pseudonym || user?.username || '?'} />
          <span className="rail__account-name">{user?.pseudonym || user?.username || '未登录'}</span>
        </button>

        {menuOpen ? (
          <div className="rail__menu" role="menu">
            <AccountMenu currentUserId={user?.user_id} onDone={() => setMenuOpen(false)} />
          </div>
        ) : null}
      </div>
    </aside>
  )
})
