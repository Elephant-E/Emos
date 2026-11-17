import { asBool, asPage, asString } from '@/lib/search'
import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import { AdminLayout } from '@/layouts/AdminLayout'
import { OverviewView } from '@/views/OverviewView'
import { LibraryView } from '@/views/LibraryView'
import { SeekView } from '@/views/SeekView'
import { WatchlistsView } from '@/views/WatchlistsView'
import { WatchlistDetailView } from '@/views/WatchlistDetailView'
import { LoginView } from '@/views/LoginView'
import { UploadView } from '@/views/UploadView'
import { VideoDetailView } from '@/views/VideoDetailView'
import { AccountView } from '@/views/AccountView'
import { ShopView } from '@/views/ShopView'
import { SellerView } from '@/views/SellerView'
import { OrdersView } from '@/views/OrdersView'
import { LiveView } from '@/views/LiveView'
import { LinesView, type LinesSearch } from '@/views/LinesView'
import { UserDetailView } from '@/views/UserDetailView'
import { RecycleView } from '@/views/RecycleView'
import { UserSearchView } from '@/views/UserSearchView'
import { WhisperView } from '@/views/WhisperView'
import { FundView } from '@/views/FundView'
import { RedPacketView } from '@/views/RedPacketView'
import { RankView } from '@/views/RankView'
import { LotteryView } from '@/views/LotteryView'
import { VoteView } from '@/views/VoteView'
import { USE_MOCK, getToken } from '@/api/client'
import type { LibrarySearch } from '@/views/LibraryView'
import type { DetailSearch } from '@/views/VideoDetailView'
import type { OrdersSearch } from '@/views/OrdersView'
import type { LiveSearch } from '@/views/LiveView'
import type { RecycleSearch } from '@/views/RecycleView'
import type { RedPacketSearch } from '@/views/RedPacketView'
import type { RankSearch } from '@/views/RankView'
import type { LotterySearch } from '@/views/LotteryView'
import type { VoteSearch } from '@/views/VoteView'
import type { WhisperSearch } from '@/views/WhisperView'
import type { SeekSearch } from '@/views/SeekView'
import type { WatchSearch } from '@/views/WatchlistsView'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  /**
   * 渲染期抛错的兜底：上游会返回「HTTP 200 + { message }」的业务失败，
   * 组件里读 data.items.length 这类字段就会抛 TypeError。
   * 没有这一层的话整页纯白、也没有重试入口。
   */
  errorComponent: ({ error }) => (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 'var(--sp-3)', padding: 'var(--sp-6)' }}>
      <p style={{ fontSize: 20 }}>这一页出错了</p>
      <p className="meta-sm" style={{ maxWidth: 520, textAlign: 'center' }}>
        {error instanceof Error ? error.message : '未知错误'}
      </p>
      <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          重新加载
        </button>
        <a className="btn btn--ghost" href="/">
          回到概览
        </a>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 'var(--sp-3)' }}>
      <p style={{ fontSize: 20 }}>页面不存在</p>
      <a className="btn btn--ghost" href="/">
        回到概览
      </a>
    </div>
  ),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  /** 登录后回到被 401 打断的那一页；只接受站内路径，避免开放跳转 */
  component: () => (
    <LoginView
      onDone={() => {
        const next = new URLSearchParams(location.search).get('next')
        const safe = next && /^\/(?![/\\])/.test(next) && !next.includes('\\') ? next : '/'
        location.href = safe
      }}
    />
  ),
})

const appLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AdminLayout,
  beforeLoad: () => {
    if (!getToken() && !USE_MOCK) {
      throw redirect({ to: '/login' })
    }
  },
})

const overviewRoute = createRoute({ getParentRoute: () => appLayout, path: '/', component: OverviewView })

const uploadRoute = createRoute({ getParentRoute: () => appLayout, path: '/upload', component: UploadView })

const libraryRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/library',
  validateSearch: (s: Record<string, unknown>): LibrarySearch => ({
    q: asString(s.q),
    type: s.type === 'movie' || s.type === 'tv' ? s.type : '',
  }),
  component: LibraryRoute,
})

function LibraryRoute() {
  const search = libraryRoute.useSearch()
  const navigate = libraryRoute.useNavigate()
  return <LibraryView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const videoDetailRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/media/$videoId',
  validateSearch: (s: Record<string, unknown>): DetailSearch => ({
    season: asPage(s.season),
    episode: asPage(s.episode),
  }),
  component: VideoDetailRoute,
})

function VideoDetailRoute() {
  const { videoId } = videoDetailRoute.useParams()
  const search = videoDetailRoute.useSearch()
  const navigate = videoDetailRoute.useNavigate()
  return (
    <VideoDetailView
      videoId={Number(videoId)}
      search={search}
      onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })}
    />
  )
}

const accountRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/account',
  validateSearch: (s: Record<string, unknown>): { tab: 'profile' | 'invite' } => ({
    tab: s.tab === 'invite' ? 'invite' : 'profile',
  }),
  component: AccountRoute,
})

function AccountRoute() {
  const search = accountRoute.useSearch()
  const navigate = accountRoute.useNavigate()
  return <AccountView tab={search.tab} onTab={(tab) => navigate({ search: { tab } })} />
}

const sellerRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/shop/seller/$sellerId',
  component: SellerRoute,
})

function SellerRoute() {
  const { sellerId } = sellerRoute.useParams()
  // 非法 id 回落到 0；接口里 0 表示「我的店铺」
  return <SellerView sellerId={Number.isFinite(Number(sellerId)) && Number(sellerId) > 0 ? Number(sellerId) : 0} />
}

const shopRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/shop',
  validateSearch: (s: Record<string, unknown>): {
    tab: 'products' | 'categories' | 'seller'
    category: number
    q: string
    sort: '' | 'sales' | 'price'
    /** all = 逛全站商品（默认）；mine = 管自己的店 */
    scope: 'all' | 'mine'
  } => ({
    tab: s.tab === 'categories' || s.tab === 'seller' ? s.tab : 'products',
    category: Number(s.category) > 0 ? Number(s.category) : 0,
    q: asString(s.q),
    sort: s.sort === 'sales' || s.sort === 'price' ? s.sort : '',
    scope: s.scope === 'mine' ? 'mine' : 'all',
  }),
  component: ShopRoute,
})

function ShopRoute() {
  const search = shopRoute.useSearch()
  const navigate = shopRoute.useNavigate()
  return (
    <ShopView
      tab={search.tab}
      categoryId={search.category}
      q={search.q}
      sort={search.sort}
      scope={search.scope}
      onSearch={(patch) => navigate({ search: { ...search, ...patch } })}
    />
  )
}

const ordersRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/orders',
  validateSearch: (s: Record<string, unknown>): OrdersSearch => ({
    pay: s.pay === 'paid' || s.pay === 'unpaid' ? s.pay : 'all',
    delivery: s.delivery === 'sent' || s.delivery === 'pending' ? s.delivery : 'all',
    q: asString(s.q),
    scope: s.scope === 'mine' ? 'mine' : 'shop',
  }),
  component: OrdersRoute,
})

function OrdersRoute() {
  const search = ordersRoute.useSearch()
  const navigate = ordersRoute.useNavigate()
  return <OrdersView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const liveRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/live',
  validateSearch: (s: Record<string, unknown>): LiveSearch => ({
    library: Number(s.library) || 0,
    channel: Number(s.channel) || 0,
  }),
  component: LiveRoute,
})

function LiveRoute() {
  const search = liveRoute.useSearch()
  const navigate = liveRoute.useNavigate()
  return <LiveView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const linesRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/lines',
  validateSearch: (s: Record<string, unknown>): LinesSearch => ({
    q: asString(s.q),
  }),
  component: LinesRoute,
})

function LinesRoute() {
  const search = linesRoute.useSearch()
  const navigate = linesRoute.useNavigate()
  return <LinesView search={search} onSearch={(patch) => navigate({ search: { ...search, ...patch } })} />
}

const recycleRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/recycle',
  validateSearch: (s: Record<string, unknown>): RecycleSearch => ({
    tab: s.tab === 'video' ? 'video' : 'media',
    q: asString(s.q),
    by: s.by === 'user_id' ? ('user_id' as const) : ('media_id' as const),
  }),
  component: RecycleRoute,
})

function RecycleRoute() {
  const search = recycleRoute.useSearch()
  const navigate = recycleRoute.useNavigate()
  return (
    <RecycleView
      tab={search.tab}
      q={search.q}
      by={search.by}
      onQuery={(q, by) => navigate({ search: { ...search, q, by } })}
      onTab={(tab) => navigate({ search: { tab, q: '', by: 'media_id' } })}
    />
  )
}

const fundRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/fund',
  validateSearch: (s: Record<string, unknown>): { tab: 'orders' | 'merchant' | 'carrot' } => ({
    tab: s.tab === 'merchant' ? 'merchant' : s.tab === 'carrot' ? 'carrot' : 'orders',
  }),
  component: FundRoute,
})

function FundRoute() {
  const search = fundRoute.useSearch()
  const navigate = fundRoute.useNavigate()
  return (
    <FundView
      tab={search.tab}
      onTab={(tab) => navigate({ search: { ...search, tab } })}
    />
  )
}

const redPacketRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/redpacket',
  validateSearch: (s: Record<string, unknown>): RedPacketSearch => ({
    tab: s.tab === 'records' ? 'records' : 'send',
    id: asString(s.id),
  }),
  component: RedPacketRoute,
})

function RedPacketRoute() {
  const search = redPacketRoute.useSearch()
  const navigate = redPacketRoute.useNavigate()
  return <RedPacketView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const rankRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/rank',
  validateSearch: (s: Record<string, unknown>): RankSearch => ({
    tab: s.tab === 'upload' || s.tab === 'sign' || s.tab === 'playing' || s.tab === 'live' ? s.tab : 'carrot',
  }),
  component: RankRoute,
})

function RankRoute() {
  const search = rankRoute.useSearch()
  const navigate = rankRoute.useNavigate()
  return <RankView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const lotteryRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/lottery',
  validateSearch: (s: Record<string, unknown>): LotterySearch => ({
    tab: s.tab === 'winners' ? 'winners' : 'create',
    id: asString(s.id),
  }),
  component: LotteryRoute,
})

function LotteryRoute() {
  const search = lotteryRoute.useSearch()
  const navigate = lotteryRoute.useNavigate()
  return <LotteryView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const voteRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/vote',
  validateSearch: (s: Record<string, unknown>): VoteSearch => ({
    tab: s.tab === 'result' ? 'result' : 'create',
    id: asString(s.id),
  }),
  component: VoteRoute,
})

function VoteRoute() {
  const search = voteRoute.useSearch()
  const navigate = voteRoute.useNavigate()
  return <VoteView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const whisperRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/whisper',
  validateSearch: (s: Record<string, unknown>): WhisperSearch => ({
    tab: s.tab === 'sender' ? 'sender' : 'receiver',
  }),
  component: WhisperRoute,
})

function WhisperRoute() {
  const search = whisperRoute.useSearch()
  const navigate = whisperRoute.useNavigate()
  return <WhisperView tab={search.tab} onTab={(tab) => navigate({ search: { tab } })} />
}

const userSearchRoute = createRoute({ getParentRoute: () => appLayout, path: '/users', component: UserSearchView })

const userDetailRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/users/$userId',
  component: UserRoute,
})

function UserRoute() {
  const { userId } = userDetailRoute.useParams()
  return <UserDetailView userId={userId} />
}

const seekRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/seek',
  validateSearch: (s: Record<string, unknown>): SeekSearch => ({
    tab: s.tab === 'default' || s.tab === 'upload' || s.tab === 'complete' ? s.tab : 'all',
    q: asString(s.q),
    type: s.type === 'movie' || s.type === 'tv' ? s.type : '',
    mine: asBool(s.mine),
  }),
  component: SeekRoute,
})

function SeekRoute() {
  const search = seekRoute.useSearch()
  const navigate = seekRoute.useNavigate()
  return <SeekView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const watchlistsRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/watchlists',
  validateSearch: (s: Record<string, unknown>): WatchSearch => ({
    scope: s.scope === 'self' || s.scope === 'subscribed' ? s.scope : 'all',
    q: asString(s.q),
  }),
  component: WatchlistsRoute,
})

function WatchlistsRoute() {
  const search = watchlistsRoute.useSearch()
  const navigate = watchlistsRoute.useNavigate()
  return <WatchlistsView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const watchlistDetailRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/watchlists/$watchId',
  validateSearch: (s: Record<string, unknown>): { q: string } => ({
    q: asString(s.q),
  }),
  component: WatchDetailRoute,
})

function WatchDetailRoute() {
  const { watchId } = watchlistDetailRoute.useParams()
  const search = watchlistDetailRoute.useSearch()
  const navigate = watchlistDetailRoute.useNavigate()
  return (
    <WatchlistDetailView
      watchId={Number(watchId)}
      search={search}
      onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })}
    />
  )
}

const routeTree = rootRoute.addChildren([
  loginRoute,
  appLayout.addChildren([
    overviewRoute,
    uploadRoute,
    libraryRoute,
    videoDetailRoute,
    seekRoute,
    accountRoute,
    shopRoute,
    sellerRoute,
    ordersRoute,
    liveRoute,
    linesRoute,
    recycleRoute,
    fundRoute,
    whisperRoute,
    redPacketRoute,
    rankRoute,
    lotteryRoute,
    voteRoute,
    userSearchRoute,
    userDetailRoute,
    watchlistsRoute,
    watchlistDetailRoute,
  ]),
])

/**
 * 搜索词一律按字符串处理：TanStack 默认的 parseSearch 会把 `q=63247` JSON.parse 成数字，
 * validateSearch 里 asString(数字) 返回空串，按 TODB/TMDB ID 搜刚进 URL 就被清空。
 * stringify 同样按原始字符串拼接，避免数字型字符串被加上引号。
 */
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  parseSearch: (input) => {
    const out: Record<string, unknown> = {}
    new URLSearchParams(input.startsWith('?') ? input.slice(1) : input).forEach((value, key) => {
      out[key] = value
    })
    return out
  },
  stringifySearch: (search) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(search as Record<string, unknown>)) {
      if (value === undefined || value === null || value === '') continue
      params.set(key, String(value))
    }
    const out = params.toString()
    return out ? `?${out}` : ''
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
