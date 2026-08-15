import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.js'

/**
 * 侧栏导航与响应式布局域：菜单高亮、跳转、移动端/平板断点、外部点击关闭。
 * 与原实现行为保持一致。
 */
export function useSidebarNavigation() {
  const router = useRouter()
  const route = useRoute()
  const appStore = useAppStore()
  const sidebarOpen = computed(() => appStore.sidebarOpen)

  // ================= 响应式断点 =================

  const isMobile = ref(window.innerWidth < 484)
  const isTablet = ref(window.innerWidth >= 484 && window.innerWidth < 768)

  const updateLayout = () => {
    isMobile.value = window.innerWidth < 484
    isTablet.value = window.innerWidth >= 484 && window.innerWidth < 768
  }

  // ================= 菜单 =================

  const menuItems = [
    { path: '/', icon: 'fa-house', label: '主页' },
    { path: '/media', icon: 'fa-film', label: '媒体' },
    { path: '/watchlist', icon: 'fa-list', label: '片单' },
    { path: '/upload', icon: 'fa-cloud-arrow-up', label: '上传' },
    { path: '/seek', icon: 'fa-heart', label: '求片' },
    { path: '/shop', icon: 'fa-bag-shopping', label: '商城' },
    { path: '/order', icon: 'fa-receipt', label: '订单' },
    { path: '/shop/manage', icon: 'fa-store', label: '商户' },
    { path: '/line', icon: 'fa-network-wired', label: '线路' }
  ]

  const isActive = (path) => {
    if (path === '/') return route.path === '/'
    return route.path === path || (route.path.startsWith(path + '/') && !menuItems.some(item => item.path === route.path))
  }

  // ================= 跳转/关闭 =================

  const navigateTo = (path) => {
    router.push(path)
    if (window.innerWidth <= 768) closeSidebar()
  }

  const closeSidebar = () => {
    appStore.closeSidebar()
    document.removeEventListener('click', handleOutsideClick)
    document.body.style.overflow = ''
  }

  const handleOutsideClick = (e) => {
    const sidebar = document.querySelector('.sidebar')
    const hamburgerBtn = document.querySelector('.sidebar-hamburger')
    if (sidebar && !sidebar.contains(e.target) && (!hamburgerBtn || !hamburgerBtn.contains(e.target))) {
      closeSidebar()
    }
  }

  const handleResize = () => {
    if (window.innerWidth > 768) {
      appStore.closeSidebar()
      document.body.style.overflow = ''
    }
  }

  // ================= 生命周期 =================

  onMounted(() => {
    updateLayout()
    window.addEventListener('resize', handleResize)
    window.addEventListener('resize', updateLayout)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('resize', updateLayout)
    document.body.style.overflow = ''
  })

  return {
    sidebarOpen,
    isMobile,
    isTablet,
    menuItems,
    isActive,
    navigateTo,
    closeSidebar,
    handleOutsideClick,
    updateLayout,
  }
}