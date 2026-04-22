<script setup>
import { ref, onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import TopBar from '@/components/TopBar.vue'

const sidebarRef = ref(null)

// 切换侧边栏
const toggleSidebar = () => {
  sidebarRef.value?.toggleSidebar()
}

onMounted(() => {
  // 将toggleSidebar方法暴露给全局，供TopBar调用
  window.toggleSidebar = toggleSidebar
})
</script>

<template>
  <div class="layout-container">
    <!-- 顶部导航栏 -->
    <TopBar />
    
    <!-- 侧边栏 -->
    <Sidebar ref="sidebarRef" />
    
    <!-- 主内容区 -->
    <main class="main-wrapper">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['MediaView', 'WatchlistView', 'WatchlistDetailView', 'SeekView', 'ShopView']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
    
    <!-- Toast容器 -->
    <div class="toast-container" id="toastContainer"></div>
  </div>
</template>

<style scoped>
.layout-container {
  min-height: calc(100vh - 140px); /* 减去 body 的 padding-top (100px) 和 padding-bottom (40px) */
}

@media (max-width: 768px) {
  .layout-container {
    min-height: calc(100vh - 96px); /* 移动端：padding-top 76px + padding-bottom 20px */
  }
}
</style>
