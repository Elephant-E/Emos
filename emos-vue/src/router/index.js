import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '仪表盘' }
        },
        {
          path: 'line',
          name: 'Line',
          component: () => import('@/views/LineView.vue'),
          meta: { title: '线路管理' }
        },
        {
          path: 'upload',
          name: 'Upload',
          component: () => import('@/views/UploadView.vue'),
          meta: { title: '上传管理' }
        },
        {
          path: 'account',
          name: 'Account',
          component: () => import('@/views/AccountView.vue'),
          meta: { title: '账号管理' }
        },
        {
          path: 'media',
          name: 'Media',
          component: () => import('@/views/MediaView.vue'),
          meta: { title: '媒体管理' }
        },
        {
          path: 'media/:id',
          name: 'VideoDetail',
          component: () => import('@/views/VideoDetailView.vue'),
          meta: { title: '视频详情' }
        },
        {
          path: 'live/:id',
          name: 'LiveChannelDetail',
          component: () => import('@/views/LiveChannelDetailView.vue'),
          meta: { title: '直播频道详情' }
        },
        // 占位路由 - 后续开发
        {
          path: 'watchlist',
          name: 'Watchlist',
          component: () => import('@/views/WatchlistView.vue'),
          meta: { title: '片单管理' }
        },
        {
          path: 'watchlist/:id',
          name: 'WatchlistDetail',
          component: () => import('@/components/WatchlistDetailView.vue'),
          meta: { title: '片单详情' }
        },
        {
          path: 'seek',
          name: 'Seek',
          component: () => import('@/views/SeekView.vue'),
          meta: { title: '求片管理' }
        },
        {
          path: 'shop',
          name: 'Shop',
          component: () => import('@/views/ShopView.vue'),
          meta: { title: '商城中心' }
        },
        {
          path: 'shop/:id',
          name: 'SellerDetail',
          component: () => import('@/views/SellerDetailView.vue'),
          meta: { title: '店铺详情' }
        },
        {
          path: 'shop/manage',
          name: 'ShopManage',
          component: () => import('@/views/ShopManageView.vue'),
          meta: { title: '商户管理' }
        },
        {
          path: 'order',
          name: 'Order',
          component: () => import('@/views/OrderView.vue'),
          meta: { title: '订单中心' }
        }
      ]
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  const appStore = useAppStore()
  
  // 检查认证状态
  if (to.meta.requiresAuth && !appStore.isAuthenticated) {
    // 未登录，跳转到独立登录页
    window.location.href = '/login'
    return
  }
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title === '仪表盘' ? 'EMOS' : `${to.meta.title} - EMOS`
  }
  
  next()
})

// 全局后置钩子
router.afterEach((to, from) => {
  const appStore = useAppStore()
  // 更新当前视图
  appStore.setCurrentView(to.path)
})

export default router
