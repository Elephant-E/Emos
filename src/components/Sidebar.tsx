import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { forgetAccount, listAccounts, rememberAccount, switchAccount, type Account } from '@/lib/accounts'
import type { UserInfo } from '@/api/types'
import { USE_MOCK } from '@/api/client'
import {
  IconBag,
  IconChevron,
  IconFilm,
  IconGrid,
  IconInbox,
  IconLive,
  IconShield,
  IconLogo,
  IconMusic,
  IconWallet,
  IconReceipt,
  IconRoute,
  IconSearch,
  IconTag,
  IconUpload,
  IconUser,
} from './icons'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ size?: number }>; tail?: string; chev?: boolean }

const GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: '内容',
    items: [
      { to: '/', label: '概览', icon: IconGrid },
      { to: '/library', label: '媒体库', icon: IconFilm },
      { to: '/watchlists', label: '片单', icon: IconTag, chev: true },
      { to: '/seek', label: '求片', icon: IconInbox },
      { to: '/music', label: '音乐', icon: IconMusic },
    ],
  },
  {
    label: '运营',
    items: [
      { to: '/upload', label: '上传', icon: IconUpload },
      { to: '/live', label: '直播', icon: IconLive },
      { to: '/shop', label: '商城', icon: IconBag },
      { to: '/orders', label: '订单', icon: IconReceipt },
    ],
  },
  {
    label: '系统',
    items: [
      { to: '/lines', label: '线路', icon: IconRoute },
      { to: '/users', label: '用户', icon: IconShield },
      { to: '/fund', label: '资金', icon: IconWallet },
      { to: '/whisper', label: '悄悄话', icon: IconTag },
      { to: '/account', label: '账号', icon: IconUser, chev: true },
    ],
  },
]

function Avatar({ url, name, size }: { url?: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(url) && !failed
  return (
    <span className="avatar" style={size ? { width: size, height: size, fontSize: size * 0.46 } : undefined}>
      {showImage ? <img src={url ?? ''} alt="" onError={() => setFailed(true)} /> : (name || '?').slice(0, 1)}
    </span>
  )
}

export function Sidebar({ user }: { user?: UserInfo }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [accounts, setAccounts] = useState<Account[]>(() => listAccounts())
  const [menuOpen, setMenuOpen] = useState(false)
  const footRef = useRef<HTMLDivElement | null>(null)

  // ⌘K / Ctrl+K 聚焦搜索框——键帽画在那儿就得能用
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (footRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!user?.user_id) return
    setAccounts(
      rememberAccount({ user_id: user.user_id, username: user.username, pseudonym: user.pseudonym, avatar: user.avatar }),
    )
  }, [user?.user_id, user?.username, user?.pseudonym, user?.avatar])

  return (
    <aside className="rail">
      <div className="rail__brand">
        <div className="rail__brand-name">
          <IconLogo />
          <span>EMOS</span>
          {USE_MOCK ? <span className="rail__badge">MOCK</span> : null}
        </div>

      </div>

      <label className="rail__search">
        <IconSearch size={15} />
        <input
          type="search"
          value={term}
          placeholder="搜索片名"
          aria-label="搜索片名"
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            navigate({ to: '/library', search: { page: 1, page_size: 20, q: term.trim(), type: '' } })
          }}
          ref={searchRef}
        />
        <span className="rail__keys">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </label>

      <div className="rail__scroll">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="rail__label">{group.label}</p>
          <nav className="rail__nav">
            {group.items.map((item) => {
              const Icon = item.icon
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
              return (
                <Link key={item.to} to={item.to} className={`rail__item${active ? ' is-active' : ''}`}>
                  <span className="rail__ico">
                    <Icon size={16} />
                  </span>
                  <span>{item.label}</span>
                  {item.chev ? (
                    <span className="rail__ico" style={{ marginLeft: 'auto' }}>
                      <IconChevron size={13} />
                    </span>
                  ) : null}
                  {item.tail ? <span className="rail__tail">{item.tail}</span> : null}
                </Link>
              )
            })}
          </nav>
        </div>
      ))}
      </div>

      <div className="rail__foot" ref={footRef}>
        <button
          className="rail__account"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Avatar url={user?.avatar} name={user?.pseudonym || user?.username || '?'} />
          <span className="rail__account-name">{user?.pseudonym || user?.username || '未登录'}</span>
          <span className="rail__account-caret">▾</span>
        </button>

        {menuOpen ? (
          <div className="rail__menu" role="menu">
            {accounts.map((account) => {
              const current = account.user_id === user?.user_id
              return (
                <div key={account.user_id} className="rail__menu-row">
                  <button
                    role="menuitem"
                    className="rail__menu-item"
                    onClick={() => {
                      if (current) return
                      if (switchAccount(account.user_id)) location.reload()
                    }}
                  >
                    <Avatar url={account.avatar} name={account.pseudonym || account.username} size={22} />
                    <span>{account.pseudonym || account.username}</span>
                    {current ? <span className="rail__menu-flag">当前</span> : null}
                  </button>
                  {!current ? (
                    <button
                      className="rail__menu-remove"
                      aria-label={`移除 ${account.pseudonym || account.username}`}
                      onClick={() => setAccounts(forgetAccount(account.user_id))}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              )
            })}
            <button className="rail__menu-add" role="menuitem" onClick={() => (location.href = '/login')}>
              添加账号
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
