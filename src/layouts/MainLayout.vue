<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import Sidebar from '@/components/Sidebar.vue'
import MaintenanceNotice from '@/components/MaintenanceNotice.vue'

const appStore = useAppStore()
const isMaintenance = computed(() => appStore.isMaintenance)
const checkingStatus = ref(true)
const isMobile = ref(window.innerWidth < 484)
const showOverlay = computed(() => isMobile.value && appStore.sidebarOpen)

const updateMobile = () => { isMobile.value = window.innerWidth < 484 }

const checkServerStatus = async () => {
  try {
    await appStore.checkServerStatus()
  } catch (error) {
    console.error('检查服务器状态失败:', error)
  } finally {
    checkingStatus.value = false
  }
}

onMounted(() => {
  checkServerStatus()
  window.addEventListener('resize', updateMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobile)
})
</script>

<template>
  <div v-if="checkingStatus" class="status-check-overlay">
    <i class="fas fa-circle-notch fa-spin"></i>
  </div>
  <template v-else>
    <div v-if="isMaintenance" class="maintenance-overlay">
      <div class="maintenance-overlay-content">
        <MaintenanceNotice />
      </div>
    </div>

    <div v-else class="layout-container">
      <Sidebar />
      <div v-if="showOverlay" class="sidebar-overlay" @click="appStore.closeSidebar()"></div>
      <div class="main-content" id="scrollable-page">
        <main>
          <div class="content-container">
            <router-view v-slot="{ Component }">
              <keep-alive :include="['MediaView', 'WatchlistView', 'WatchlistDetailView', 'SeekView', 'ShopView', 'UploadView']">
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </div>
        </main>
      </div>
      <div class="toast-container" id="toastContainer"></div>
    </div>
  </template>
</template>

<style scoped>
.layout-container {
  display: grid;
  gap: 0;
  height: 100vh;
  grid-template-areas:
    "structure-main-section";
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: 1fr;
}

.main-content {
  grid-area: structure-main-section;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: clip;
  height: auto;
  width: 100%;
  z-index: var(--z-default);
  padding-inline-start: var(--web-navigation-width);
  background: var(--page-bg);
}

main {
  flex-grow: 1;
}

.content-container {
  margin: 0 auto;
  max-width: 1680px;
  min-height: 100%;
  position: relative;
  width: 100%;
  z-index: var(--z-default);
  padding: 16px 16px 32px;
}

@media (min-width: 768px) and (max-width: 999px) {
  .content-container {
    padding: 32px 25px 32px;
  }
}

@media (min-width: 1000px) {
  .content-container {
    padding: 32px 40px 32px;
  }
}

.status-check-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  color: var(--system-tertiary);
  font-size: 1.2rem;
}

.maintenance-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.maintenance-overlay-content {
  max-width: 500px;
  padding: 2rem;
  text-align: center;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: calc(var(--z-web-chrome) - 1);
  transition: opacity 0.3s ease;
}

@media (max-width: 483px) {
  .main-content {
    padding-inline-start: 0;
    padding-top: 52px;
  }

  .content-container {
    padding: 16px 25px 32px;
  }
}

@media (min-width: 484px) and (max-width: 767px) {
  .main-content {
    padding-inline-start: var(--web-navigation-width);
  }

  .content-container {
    padding: 32px 25px 32px;
  }
}

@media (min-width: 768px) and (max-width: 999px) {
  .content-container {
    padding: 32px 25px 32px;
  }
}

@media (min-width: 1000px) {
  .content-container {
    padding: 32px 40px 32px;
  }
}

@media (min-width: 768px) {
  .sidebar-overlay { display: none; }
}
</style>
