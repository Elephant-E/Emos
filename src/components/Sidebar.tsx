import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
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
  IconLogo,
  IconMusic,
  IconWallet,
  IconPanel,
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
      { to: '/pay', label: '支付', icon: IconWallet },
      { to: '/account', label: '账号', icon: IconUser, chev: true },
    ],
  },
]

const ZONES = [
  { key: 'movie' as const, label: '电影', color: 'var(--c-yellow)' },
  { key: 'tv' as const, label: '剧集', color: 'var(--c-green)' },
]

export function Sidebar({ user }: { user?: UserInfo }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const initial = (user?.pseudonym || user?.username || '?').slice(0, 1)
  const [accounts, setAccounts] = useState<Account[]>(() => listAccounts())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!user?.user_id) return
    setAccounts(rememberAccount({ user_id: user.user_id, username: user.pseudonym || user.username, avatar: user.avatar }))
  }, [user?.user_id, user?.username, user?.pseudonym, user?.avatar])

  return (
    <aside className="rail">
      <div className="rail__brand">
        <div className="rail__brand-name">
          <IconLogo />
          <span>EMOS</span>
          {USE_MOCK ? <span className="rail__badge">MOCK</span> : null}
        </div>
        <button className="btn btn--icon" aria-label="收起侧栏">
          <IconPanel />
        </button>
      </div>

      <label className="rail__search">
        <IconSearch size={15} />
        <input type="search" placeholder="搜索片名、用户名或编码" aria-label="搜索" />
        <span className="rail__keys">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </label>

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

      <p className="rail__label">内容分区</p>
      <nav className="rail__nav">
        {ZONES.map((zone) => (
          <Link
            key={zone.key}
            to="/library"
            search={{ page: 1, page_size: 20, q: '', type: zone.key }}
            className="rail__item"
          >
            <span className="rail__ico">
              <span className="rail__dot" style={{ color: zone.color }} />
            </span>
            <span>{zone.label}</span>
          </Link>
        ))}
      </nav>

      <div className="rail__foot">
        <button
          className="rail__account"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="avatar">{initial}</span>
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
                    <span className="avatar" style={{ width: 22, height: 22, fontSize: 10.5 }}>
                      {account.username.slice(0, 1)}
                    </span>
                    <span>{account.username}</span>
                    {current ? <span className="rail__menu-flag">当前</span> : null}
                  </button>
                  {!current ? (
                    <button
                      className="rail__menu-remove"
                      aria-label={`移除 ${account.username}`}
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
