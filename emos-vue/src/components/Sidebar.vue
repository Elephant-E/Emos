<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from '@/utils/toast.js'

const router = useRouter()
const route = useRoute()

// 菜单项配置
const menuItems = [
  { path: '/', icon: 'fa-tachometer-alt', label: '仪表盘' },
  { path: '/line', icon: 'fa-network-wired', label: '线路管理' },
  { path: '/upload', icon: 'fa-cloud-upload-alt', label: '上传管理' },
  { path: '/media', icon: 'fa-film', label: '媒体管理' },
  { path: '/watchlist', icon: 'fa-list', label: '片单管理' },
  { path: '/seek', icon: 'fa-heart', label: '求片管理' },
  { path: '/shop', icon: 'fa-shopping-bag', label: '商城中心' },
  { path: '/order', icon: 'fa-shopping-cart', label: '订单中心' },
  { path: '/shop/manage', icon: 'fa-store', label: '商户管理' }
]

// 侧边栏状态
const sidebarOpen = ref(false)
const overlayVisible = ref(false)

// 判断是否为活动路由
const isActive = (path) => {
  return route.path === path
}

// 导航到指定路径
const navigateTo = (path) => {
  router.push(path)
  
  // 移动端关闭侧边栏
  if (window.innerWidth <= 768) {
    closeSidebar()
  }
}

// 切换侧边栏（桌面端和移动端都是显示/隐藏）
const toggleSidebar = () => {
  if (window.innerWidth <= 768) {
    // 移动端：弹出/收起
    sidebarOpen.value = !sidebarOpen.value
    overlayVisible.value = sidebarOpen.value
  } else {
    // 桌面端：显示/隐藏
    document.body.classList.toggle('sidebar-open')
  }
}

// 关闭侧边栏（移动端）
const closeSidebar = () => {
  sidebarOpen.value = false
  overlayVisible.value = false
}

// 暴露toggleSidebar方法给父组件调用
defineExpose({
  toggleSidebar
})

onMounted(() => {
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      sidebarOpen.value = false
      overlayVisible.value = false
    }
  })
})
</script>

<template>
  <aside class="sidebar-apple" :class="{ open: sidebarOpen }">
    <div class="sidebar-content">
      <div 
        v-for="item in menuItems" 
        :key="item.path"
        class="sidebar-item" 
        :class="{ active: isActive(item.path) }"
        @click="navigateTo(item.path)"
      >
        <i :class="`fas ${item.icon}`"></i>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </aside>
  
  <div 
    class="sidebar-overlay" 
    :class="{ show: overlayVisible }"
    @click="closeSidebar"
  ></div>
</template>

<style scoped>
/* 样式在全局CSS中定义，这里不需要scoped样式 */
</style>
