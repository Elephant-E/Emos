import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import { AdminLayout } from '@/layouts/AdminLayout'
import { OverviewView } from '@/views/OverviewView'
import { LibraryView } from '@/views/LibraryView'
import { SeekView } from '@/views/SeekView'
import { PlaceholderView, LoginView } from '@/views/PlaceholderView'
import { getToken } from '@/api/client'

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
    if (!getToken() && import.meta.env.VITE_MOCK !== '1') {
      throw redirect({ to: '/login' })
    }
  },
})

const overviewRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/',
  validateSearch: (s: Record<string, unknown>): { range: '6m' | '12m' } => ({
    range: s.range === '12m' ? '12m' : '6m',
  }),
  component: OverviewRoute,
})

function OverviewRoute() {
  const { range } = overviewRoute.useSearch()
  const navigate = overviewRoute.useNavigate()
  return (
    <OverviewView
      range={range}
      onRangeChange={(next) => navigate({ search: { range: next }, replace: true })}
    />
  )
}

const libraryRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/library',
  validateSearch: (s: Record<string, unknown>): { page: number; page_size: number; q: string; type: string } => ({
    page: Math.max(1, Number(s.page) || 1),
    page_size: 20,
    q: typeof s.q === 'string' ? s.q : '',
    type: typeof s.type === 'string' ? s.type : '',
  }),
  component: LibraryRoute,
})

function LibraryRoute() {
  const search = libraryRoute.useSearch()
  const navigate = libraryRoute.useNavigate()
  return (
    <LibraryView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
  )
}

const seekRoute = createRoute({
  getParentRoute: () => appLayout,
  path: '/seek',
  validateSearch: (s: Record<string, unknown>): { page: number; page_size: number; status: string } => ({
    page: Math.max(1, Number(s.page) || 1),
    page_size: 20,
    status: typeof s.status === 'string' ? s.status : 'all',
  }),
  component: SeekRoute,
})

function SeekRoute() {
  const search = seekRoute.useSearch()
  const navigate = seekRoute.useNavigate()
  return <SeekView search={search} onSearch={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
}

const placeholders: Array<{ path: string; title: string; note: string }> = [
  { path: '/watchlists', title: '片单', note: '片单增删改、订阅排序、动态抓取，接 /api/watch 系列。' },
  { path: '/upload', title: '上传', note: '分片上传、识别、入库与暂存区，接 /api/upload 系列。' },
  { path: '/live', title: '直播', note: '直播源与媒体库，接 /api/live 系列。' },
  { path: '/shop', title: '商城', note: '商品、分类与店铺，接 /api/shop 系列。' },
  { path: '/orders', title: '订单', note: '订单列表与发货，接 /api/shop/order 系列。' },
  { path: '/lines', title: '线路', note: '反代线路增删，接 /api/proxy/line。' },
  { path: '/account', title: '账号', note: '账号设置、邀请与封禁，接 /api/user 与 /api/ban。' },
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
  appLayout.addChildren([overviewRoute, libraryRoute, seekRoute, ...placeholderRoutes]),
])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
