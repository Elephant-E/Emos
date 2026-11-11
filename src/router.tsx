import { asBool, asPage, asPageSize, asString } from '@/lib/search'
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
import { LinesView } from '@/views/LinesView'
import { MusicView } from '@/views/MusicView'
import { SongDetailView } from '@/views/SongDetailView'
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
import type { VideoType } from '@/api/types'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 12 }}>
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
        const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
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
  validateSearch: (s: Record<string, unknown>): { page: number; page_size: number; q: string; type: '' | VideoType } => ({
    page: asPage(s.page),
    page_size: asPageSize(s.page_size),
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
  validateSearch: (s: Record<string, unknown>): { season: number; episode: number } => ({
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
  // 非法 id 不能退化成 0 —— 0 在接口里等于「我的店铺」，会静默打开自己的店
  return <SellerView sellerId={Number.isFinite(Number(sellerId)) && Number(sellerId) > 0 ? Number(sellerId) : 0} />
}

const shopRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/shop',
  validateSearch: (s: Record<string, unknown>): {
    tab: 'products' | 'categories' | 'seller'
    page: number
    category: number
    q: string
    sort: '' | 'sales' | 'price'
    /** all = 逛全站商品（默认）；mine = 管自己的店 */
    scope: 'all' | 'mine'
  } => ({
    tab: s.tab === 'categories' || s.tab === 'seller' ? s.tab : 'products',
    page: asPage(s.page),
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
      page={search.page}
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
  validateSearch: (s: Record<string, unknown>): {
    page: number
    pay: 'all' | 'paid' | 'unpaid'
    delivery: 'all' | 'sent' | 'pending'
    q: string
    scope: 'mine' | 'shop'
  } => ({
    page: asPage(s.page),
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
  validateSearch: (s: Record<string, unknown>): { page: number; library: number; channel: number } => ({
    page: asPage(s.page),
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

export interface LinesSearch {
  page: number
  size: number
  q: string
}

const linesRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/lines',
  validateSearch: (s: Record<string, unknown>): LinesSearch => ({
    page: asPage(s.page),
    size: asPageSize(s.size),
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
  validateSearch: (s: Record<string, unknown>): { tab: 'media' | 'video'; page: number; size: number; q: string; by: 'media_id' | 'user_id' } => ({
    tab: s.tab === 'video' ? 'video' : 'media',
    page: asPage(s.page),
    size: asPageSize(s.size),
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
      page={search.page}
      pageSize={search.size}
      q={search.q}
      by={search.by}
      onQuery={(q, by) => navigate({ search: { ...search, q, by, page: 1 } })}
      onTab={(tab) => navigate({ search: { tab, page: 1, size: search.size, q: '', by: 'media_id' } })}
      onPage={(page) => navigate({ search: { ...search, page } })}
      onPageSize={(size) => navigate({ search: { ...search, size, page: 1 } })}
    />
  )
}

const musicRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/music',
  validateSearch: (s: Record<string, unknown>): {
    page: number
    tab: 'songs' | 'albums' | 'persons'
    q: string
    /** songs tab 的过滤：空 / 无资源 / 我收藏的 */
    filter: '' | 'no_media' | 'favorite'
  } => ({
    page: asPage(s.page),
    tab: s.tab === 'albums' || s.tab === 'persons' ? s.tab : 'songs',
    q: asString(s.q),
    filter: s.filter === 'no_media' || s.filter === 'favorite' ? s.filter : '',
  }),
  component: MusicRoute,
})

function MusicRoute() {
  const search = musicRoute.useSearch()
  const navigate = musicRoute.useNavigate()
  return <MusicView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const songRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/music/song/$songId',
  component: SongRoute,
})

function SongRoute() {
  const { songId } = songRoute.useParams()
  return <SongDetailView songId={Number(songId)} />
}

const payRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/pay',
  beforeLoad: () => {
    throw redirect({ to: '/fund', search: { tab: 'merchant', page: 1, size: 20 } })
  },
})

const fundRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/fund',
  validateSearch: (s: Record<string, unknown>): { page: number; size: number; tab: 'orders' | 'merchant' | 'carrot' } => ({
    page: asPage(s.page),
    size: asPageSize(s.size),
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
      page={search.page}
      pageSize={search.size}
      onPage={(page) => navigate({ search: { ...search, page } })}
      onPageSize={(size) => navigate({ search: { ...search, size, page: 1 } })}
    />
  )
}

const redPacketRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/redpacket',
  validateSearch: (s: Record<string, unknown>): { tab: 'send' | 'records'; id: string; page: number; page_size: number } => ({
    tab: s.tab === 'records' ? 'records' : 'send',
    id: asString(s.id),
    page: asPage(s.page),
    page_size: asPageSize(s.page_size),
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
  validateSearch: (s: Record<string, unknown>): { tab: 'carrot' | 'upload' | 'sign' | 'playing' | 'live' } => ({
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
  validateSearch: (s: Record<string, unknown>): { tab: 'create' | 'winners'; id: string } => ({
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
  validateSearch: (s: Record<string, unknown>): { tab: 'create' | 'result'; id: string } => ({
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
  validateSearch: (s: Record<string, unknown>): { tab: 'receiver' | 'sender' } => ({
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
  validateSearch: (s: Record<string, unknown>): {
    page: number
    page_size: number
    tab: 'all' | 'default' | 'upload' | 'complete'
    q: string
    type: '' | 'movie' | 'tv'
    mine: boolean
  } => ({
    page: asPage(s.page),
    page_size: 20,
    tab: s.tab === 'default' || s.tab === 'upload' || s.tab === 'complete' ? s.tab : 'all',
    q: typeof s.q === 'string' ? s.q : '',
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
  validateSearch: (s: Record<string, unknown>): {
    page: number
    page_size: number
    scope: 'all' | 'self' | 'subscribed'
    type: 'video' | 'music'
    q: string
  } => ({
    page: asPage(s.page),
    page_size: 20,
    scope: s.scope === 'self' || s.scope === 'subscribed' ? s.scope : 'all',
    type: s.type === 'music' ? 'music' : 'video',
    q: typeof s.q === 'string' ? s.q : '',
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
  validateSearch: (s: Record<string, unknown>): { page: number; page_size: number; q: string } => ({
    page: asPage(s.page),
    // 之前写死 20，Pager 的「每页条数」选完立刻被覆盖回去
    page_size: asPageSize(s.page_size),
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
    musicRoute,
    songRoute,
    payRoute,
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
 * 搜索词一律按字符串处理。
 * TanStack 默认的 parseSearch 会把 `q=63247` JSON.parse 成数字，validateSearch
 * 里 asString(数字) 返回空串 —— 于是「按 TODB/TMDB ID 搜」刚进 URL 就被清空。
 * stringify 也走同一条路，避免数字型字符串被加上引号。
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
