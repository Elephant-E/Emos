import { Link } from '@tanstack/react-router'
import { useRouterState } from '@tanstack/react-router'
import {
  IconBag,
  IconChevron,
  IconFilm,
  IconGrid,
  IconInbox,
  IconLive,
  IconLogo,
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
      { to: '/seek', label: '求片', icon: IconInbox, tail: '12' },
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
      { to: '/account', label: '账号', icon: IconUser, chev: true },
    ],
  },
]

const ZONES = [
  { key: 'movie' as const, label: '电影', color: 'var(--c-yellow)' },
  { key: 'tv' as const, label: '剧集', color: 'var(--c-green)' },
]

export function Sidebar({ user }: { user?: { pseudonym?: string | null; username?: string } }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const initial = (user?.pseudonym || user?.username || '?').slice(0, 1)

  return (
    <aside className="rail">
      <div className="rail__brand">
        <div className="rail__brand-name">
          <IconLogo />
          <span>EMOS</span>
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
        <span className="avatar">{initial}</span>
        <span>{user?.pseudonym || user?.username || '未登录'}</span>
      </div>
    </aside>
  )
}
