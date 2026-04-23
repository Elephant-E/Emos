<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

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

// 切换侧边栏
const toggleSidebar = () => {
  if (window.innerWidth <= 768) {
    // 移动端：模态抽屉
    sidebarOpen.value = !sidebarOpen.value
    
    // 如果打开，禁止背景滚动
    if (sidebarOpen.value) {
      document.body.style.overflow = 'hidden'
      // 添加全局点击事件监听器来关闭侧边栏
      setTimeout(() => {
        document.addEventListener('click', handleOutsideClick)
      }, 100)
    } else {
      // 延迟恢复滚动，等待动画完成
      setTimeout(() => {
        if (!sidebarOpen.value) {
          document.body.style.overflow = ''
        }
      }, 450)
      document.removeEventListener('click', handleOutsideClick)
    }
  } else {
    // 桌面端：切换收起/展开状态
    document.body.classList.toggle('sidebar-collapsed')
  }
}

// 关闭侧边栏
const closeSidebar = () => {
  sidebarOpen.value = false
  document.removeEventListener('click', handleOutsideClick)
  // 延迟恢复滚动，等待动画完成
  setTimeout(() => {
    if (!sidebarOpen.value) {
      document.body.style.overflow = ''
    }
  }, 450)
}

// 处理外部点击（点击侧边栏外部区域）
const handleOutsideClick = (e) => {
  const sidebar = document.querySelector('.sidebar-apple')
  const hamburgerBtn = document.querySelector('.hamburger-btn')
  
  // 如果点击的不是侧边栏本身也不是汉堡按钮，则关闭侧边栏
  if (sidebar && !sidebar.contains(e.target) && (!hamburgerBtn || !hamburgerBtn.contains(e.target))) {
    closeSidebar()
  }
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
      document.body.style.overflow = ''
    }
  })
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <aside class="sidebar-apple" :class="{ open: sidebarOpen }">
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
  </aside>
</template>

<style scoped>
/* 样式在全局CSS中定义，这里不需要scoped样式 */
</style>
