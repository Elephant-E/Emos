import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import { AdminLayout } from '@/layouts/AdminLayout'
import { OverviewView } from '@/views/OverviewView'
import { LibraryView } from '@/views/LibraryView'
import { SeekView } from '@/views/SeekView'
import { WatchlistsView } from '@/views/WatchlistsView'
import { WatchlistDetailView } from '@/views/WatchlistDetailView'
import { PlaceholderView, LoginView } from '@/views/PlaceholderView'
import { UploadView } from '@/views/UploadView'
import { VideoDetailView } from '@/views/VideoDetailView'
import { AccountView } from '@/views/AccountView'
import { ShopView } from '@/views/ShopView'
import { OrdersView } from '@/views/OrdersView'
import { LiveView } from '@/views/LiveView'
import { LinesView } from '@/views/LinesView'
import { MusicView } from '@/views/MusicView'
import { SongDetailView } from '@/views/SongDetailView'
import { PayView } from '@/views/PayView'
import { UserDetailView } from '@/views/UserDetailView'
import { RecycleView } from '@/views/RecycleView'
import { UserSearchView } from '@/views/UserSearchView'
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
  component: () => <LoginView onDone={() => (location.href = '/')} />,
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
    page: Math.max(1, Number(s.page) || 1),
    page_size: [20, 50, 100].includes(Number(s.page_size)) ? Number(s.page_size) : 20,
    q: typeof s.q === 'string' ? s.q : '',
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
    season: Number(s.season ?? 1),
    episode: Number(s.episode ?? 1),
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
  validateSearch: (s: Record<string, unknown>): { tab: 'profile' | 'invite' | 'carrot' | 'ban' } => ({
    tab: s.tab === 'invite' || s.tab === 'carrot' || s.tab === 'ban' ? s.tab : 'profile',
  }),
  component: AccountRoute,
})

function AccountRoute() {
  const search = accountRoute.useSearch()
  const navigate = accountRoute.useNavigate()
  return <AccountView tab={search.tab} onTab={(tab) => navigate({ search: { tab } })} />
}

const shopRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/shop',
  validateSearch: (s: Record<string, unknown>): { tab: 'products' | 'categories' | 'seller' } => ({
    tab: s.tab === 'categories' || s.tab === 'seller' ? s.tab : 'products',
  }),
  component: ShopRoute,
})

function ShopRoute() {
  const search = shopRoute.useSearch()
  const navigate = shopRoute.useNavigate()
  return <ShopView tab={search.tab} onTab={(tab) => navigate({ search: { tab } })} />
}

const ordersRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/orders',
  validateSearch: (s: Record<string, unknown>): { page: number; pay: 'all' | 'paid' | 'unpaid'; delivery: 'all' | 'sent' | 'pending' } => ({
    page: Math.max(1, Number(s.page) || 1),
    pay: s.pay === 'paid' || s.pay === 'unpaid' ? s.pay : 'all',
    delivery: s.delivery === 'sent' || s.delivery === 'pending' ? s.delivery : 'all',
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
    page: Math.max(1, Number(s.page) || 1),
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

const linesRoute = createRoute({ getParentRoute: () => appLayout, path: '/lines', component: LinesView })

const recycleRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/recycle',
  validateSearch: (s: Record<string, unknown>): { tab: 'media' | 'video'; page: number; size: number; q: string; by: 'media_id' | 'user_id' } => ({
    tab: s.tab === 'video' ? 'video' : 'media',
    page: Math.max(1, Number(s.page) || 1),
    size: [20, 50, 100].includes(Number(s.size)) ? Number(s.size) : 20,
    q: typeof s.q === 'string' ? s.q : '',
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
  validateSearch: (s: Record<string, unknown>): { page: number; tab: 'songs' | 'albums' | 'persons'; q: string } => ({
    page: Math.max(1, Number(s.page) || 1),
    tab: s.tab === 'albums' || s.tab === 'persons' ? s.tab : 'songs',
    q: typeof s.q === 'string' ? s.q : '',
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

const payRoute = createRoute({ getParentRoute: () => appLayout, path: '/pay', component: PayView })

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
  validateSearch: (s: Record<string, unknown>): { page: number; page_size: number; tab: 'all' | 'default' | 'upload' | 'complete' } => ({
    page: Math.max(1, Number(s.page) || 1),
    page_size: 20,
    tab: s.tab === 'default' || s.tab === 'upload' || s.tab === 'complete' ? s.tab : 'all',
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
  validateSearch: (s: Record<string, unknown>): { page: number; page_size: number; scope: 'all' | 'self' | 'subscribed'; type: 'video' | 'music' } => ({
    page: Math.max(1, Number(s.page) || 1),
    page_size: 20,
    scope: s.scope === 'self' || s.scope === 'subscribed' ? s.scope : 'all',
    type: s.type === 'music' ? 'music' : 'video',
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
    page: Math.max(1, Number(s.page) || 1),
    page_size: 20,
    q: typeof s.q === 'string' ? s.q : '',
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

const placeholders: Array<{ path: string; title: string; note: string }> = [
]

const placeholderRoutes = placeholders.map((item) =>
  createRoute({
    getParentRoute: () => appLayout,
    path: item.path,
    component: () => <PlaceholderView title={item.title} note={item.note} />,
  }),
)

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
    ordersRoute,
    liveRoute,
    linesRoute,
    recycleRoute,
    musicRoute,
    songRoute,
    payRoute,
    userSearchRoute,
    userDetailRoute,
    watchlistsRoute,
    watchlistDetailRoute,
    ...placeholderRoutes,
  ]),
])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
