<template>
  <header class="page-header">
    <h1 class="page-title">求片管理</h1>
  </header>

  <div class="filter-bar">
    <SegmentedControl
      :tabs="statusTabs"
      v-model="selectedStatus"
      full
    />
    <div class="search-sort-group">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input type="text" class="search-input" v-model="searchQuery" @input="handleSearchInput" placeholder="输入片名搜索..." autocomplete="off">
      </div>
      <div class="cloud-buttons">
        <button class="cloud-btn" ref="sortBtnRef" @click="toggleSortMenu" title="排序"><i class="fas fa-sort"></i></button>
        <button v-if="selectedStatus === 'upload'" class="cloud-btn" :class="{ active: isUploadSelf }" @click="isUploadSelf = !isUploadSelf" title="我认领的"><i class="fas fa-user-check"></i></button>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showSortMenu" class="dropdown-overlay" @click="showSortMenu = false">
        <div class="dropdown-menu" :style="sortMenuStyle" @click.stop>
          <button
            v-for="sort in sortList"
            :key="sort.field"
            :class="['dropdown-menu__item', { active: currentSort === sort.field }]"
            @click="handleSortChange(sort.field); showSortMenu = false"
          >
            {{ sort.label }}
            <i v-if="currentSort === sort.field" :class="currentOrder === 'asc' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'" style="margin-left: 0.3rem;"></i>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <div v-if="loading && seekList.length === 0" class="loading-state">
    <i class="fas fa-circle-notch fa-spin"></i>
  </div>

  <div v-else-if="!loading && seekList.length === 0" class="list-empty">
    <i class="fas fa-inbox"></i>
    <p>{{ getEmptyMessage() }}</p>
  </div>

  <div v-else class="seek-grid">
    <div
      v-for="item in seekList"
      :key="item.id"
      class="bento-card seek-card"
    >
      <div class="card-main-row">
        <div class="card-poster">
          <img v-if="item.video_image_poster" :src="item.video_image_poster" alt="海报" loading="lazy">
          <div v-else class="poster-placeholder"><i class="fas fa-film"></i></div>
          <div class="poster-status" :class="item.status">{{ getStatusText(item.status) }}</div>
        </div>
        <div class="card-info">
          <div class="card-title-row">
            <div class="card-title">{{ item.video_title_display }}</div>
            <a v-if="item.tmdb_id" :href="getTmdbUrl(item)" target="_blank" class="tmdb-link" @click.stop title="TMDB"><i class="fas fa-external-link-alt"></i></a>
          </div>
          <span v-if="item.video_type" class="type-tag">{{ item.video_type === 'movie' ? '电影' : '剧集' }}</span>
        </div>
      </div>

      <div v-if="item.status === 'upload' && item.upload_username" class="claim-info-row">
        <i class="fas fa-user-check"></i>
        认领人：{{ item.upload_username }} · 剩余 {{ getRemainingTime(item.upload_expired_at) }}
      </div>

      <div v-if="item.users && item.users.length > 0" class="user-record-section">
        <div class="record-title">求片记录</div>
        <div class="user-record-list">
          <div v-for="(user, index) in item.users" :key="index" class="user-record-item">
            <div class="user-left">
              <div class="user-avatar">
                <img v-if="user.avatar" :src="user.avatar" alt="" loading="lazy">
                <i v-else class="fas fa-user"></i>
              </div>
              <span class="user-name">{{ user.username }}</span>
            </div>
            <div class="user-right">
              <span class="record-carrot" v-if="user.carrot > 0"><i class="fas fa-carrot"></i> {{ user.carrot }}</span>
              <span class="record-time">{{ formatDate(user.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card-actions">
        <button class="card-action-btn" @click="goToDetail(item)"><i class="fas fa-info-circle"></i> 详情</button>
        <button v-if="item.status === 'default'" class="card-action-btn primary" :disabled="claiming[item.id]" @click="handleClaim(item.id, item.status)">
          <i v-if="claiming[item.id]" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-hand-holding-heart"></i>
        </button>
        <button v-if="item.status === 'upload' && item.upload_username === '我'" class="card-action-btn secondary" :disabled="claiming[item.id]" @click="handleClaim(item.id, item.status)">
          <i v-if="claiming[item.id]" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-times-circle"></i>
        </button>
        <button v-if="item.status === 'default' || item.status === 'forget'" class="card-action-btn" @click="openUrgeModal(item.id)"><i class="fas fa-bell"></i> 催上片</button>
      </div>
    </div>
  </div>

  <div v-if="loadingMore" class="loading-state loading-state--sm">
    <i class="fas fa-circle-notch fa-spin"></i>
  </div>

  <BaseModal :visible="showUrgeModal" title="催上片" @close="closeUrgeModal">
    <input type="number" class="modal-input" v-model="urgeCarrot" placeholder="输入萝卜数量 (1-5000)" min="1" max="5000" step="1">
    <div class="modal-error">{{ urgeError }}</div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeUrgeModal">取消</button>
      <button class="modal-btn primary" :disabled="urging" @click="handleUrge">
        <i v-if="urging" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>确认</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted, onActivated, onDeactivated, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import seekApi from '@/api/seekApi.js'
import { formatDate } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const router = useRouter()
const appStore = useAppStore()

defineOptions({
  name: 'SeekView'
})

// ================= 状态管理 =================
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)
const seekList = ref([])
const claiming = reactive({}) // 认领状态

// 筛选状态
const selectedStatus = ref('default')
const currentSort = ref('updated_at')
const currentOrder = ref('desc')
const isUploadSelf = ref(false)
const searchQuery = ref('')

const statusTabs = computed(() => [
  { label: '待认领', value: 'default' },
  { label: '已认领', value: 'upload' },
  { label: '已完成', value: 'complete' },
  { label: '已取消', value: 'cancel' },
  { label: '遗忘', value: 'forget' }
])

const showSortMenu = ref(false)
const sortBtnRef = ref(null)
const sortMenuStyle = ref({})

const toggleSortMenu = () => {
  if (showSortMenu.value) { showSortMenu.value = false; return }
  if (sortBtnRef.value) {
    const rect = sortBtnRef.value.getBoundingClientRect()
    sortMenuStyle.value = { top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px` }
  }
  showSortMenu.value = true
}

// 催上片模态框
const showUrgeModal = ref(false)
const currentSeekId = ref(null)
const urgeCarrot = ref('')
const urgeError = ref('')
const urging = ref(false)


const sortList = [
  { field: 'updated_at', label: '更新时间' },
  { field: 'count_request', label: '求片人数' },
  { field: 'seek_carrot', label: '萝卜数' }
]

let debounceTimer = null

// ================= 方法 =================

// 获取视频ID


// 获取TMDB链接
const getTmdbUrl = (item) => {
  const type = item.video_type === 'movie' ? 'movie' : 'tv'
  return `https://www.themoviedb.org/${type}/${item.tmdb_id}`
}

// 获取状态文本
const getStatusText = (status) => {
  const map = {
    default: '待认领',
    upload: '已认领',
    complete: '已完成',
    cancel: '已取消',
    forget: '遗忘'
  }
  return map[status] || status
}

// 获取剩余时间
const getRemainingTime = (expiredAt) => {
  if (!expiredAt) return '已过期'
  const now = new Date()
  const expire = new Date(expiredAt)
  const diffMs = expire - now
  if (diffMs <= 0) return '已过期'
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  return diffHours > 0 ? `${diffHours}小时` : `${Math.floor(diffMs / (1000 * 60))}分钟`
}

// 复制ID
const copyId = async (id) => {
  try {
    await navigator.clipboard.writeText(id)
    showToast('ID 已复制')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 跳转到视频详情页
const goToDetail = (item) => {
  // 使用 video_list_id 构建路径
  const itemId = `${item.video_list_id}`
  router.push(`/media/${itemId}`)
}

// 获取空状态消息
const getEmptyMessage = () => {
  const statusText = {
    default: '待认领',
    upload: '已认领',
    complete: '已完成',
    cancel: '已取消',
    forget: '遗忘'
  }
  return `暂无${statusText[selectedStatus.value] || ''}求片`
}

// 加载求片列表
const loadSeeks = async (reset = false) => {
  if (loading.value || loadingMore.value) return
  if (!hasMore.value && !reset) return
  
  if (reset) {
    currentPage.value = 1
    hasMore.value = true
    seekList.value = []
    loading.value = true
  } else {
    loadingMore.value = true
  }
  
  try {
    const response = await seekApi.create({
      page: currentPage.value,
      page_size: 20,
      video_type: null,
      sort_by: currentSort.value,
      sort_order: currentOrder.value,
      status: [selectedStatus.value],
      upload_self: isUploadSelf.value,
      video_title: searchQuery.value || null,
      with_user: true
    })
    
    // axios 拦截器已解包，response 直接就是 { page, page_size, total, items }
    const data = response.items || []
    
    if (reset) {
      seekList.value = data
    } else {
      seekList.value = [...seekList.value, ...data]
    }
    
    // 判断是否还有更多数据
    const total = response.total || 0
    const currentPageNum = response.page || currentPage.value
    const pageSize = response.page_size || 20
    hasMore.value = (currentPageNum * pageSize) < total
    
    if (hasMore.value) {
      currentPage.value++
    }
  } catch (error) {
    console.error('加载求片列表失败:', error)
    showToast('加载失败，请重试', 'error')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 重置并重新加载
const resetAndLoad = () => {
  loadSeeks(true)
}


// 搜索输入（防抖）
const handleSearchInput = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    resetAndLoad()
  }, 400)
}

// 排序切换
const handleSortChange = (field) => {
  if (currentSort.value === field) {
    currentOrder.value = currentOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    currentSort.value = field
    currentOrder.value = 'desc'
  }
  resetAndLoad()
}

// 认领/取消认领
const handleClaim = async (seekId, currentStatus) => {
  claiming[seekId] = true
  
  try {
    // 根据当前状态决定操作类型
    const type = currentStatus === 'upload' ? 'cancel' : 'confirm'
    const actionText = type === 'confirm' ? '认领' : '取消认领'
    
    const response = await seekApi.claim(seekId, type)
    
    showToast(`${actionText}成功！`, 'success')
    
    // 更新本地数据
    const item = seekList.value.find(s => s.id === seekId)
    if (item) {
      item.status = response.status || (type === 'confirm' ? 'upload' : 'default')
      item.upload_username = type === 'confirm' ? '我' : null
    }
    

    setTimeout(() => resetAndLoad(), 500)
  } catch (error) {
    console.error('操作失败:', error)
    const type = currentStatus === 'upload' ? 'cancel' : 'confirm'
    const actionText = type === 'confirm' ? '认领' : '取消认领'
    showToast(error.message || `${actionText}失败`, 'error')
  } finally {
    delete claiming[seekId]
  }
}

// 打开催上片模态框
const openUrgeModal = (seekId) => {
  currentSeekId.value = seekId
  urgeCarrot.value = ''
  urgeError.value = ''
  showUrgeModal.value = true
}

// 关闭催上片模态框
const closeUrgeModal = () => {
  showUrgeModal.value = false
  currentSeekId.value = null
  urgeCarrot.value = ''
  urgeError.value = ''
}

// 催上片
const handleUrge = async () => {
  const carrot = parseInt(urgeCarrot.value)
  
  if (!carrot || carrot < 1 || carrot > 5000) {
    urgeError.value = '请输入 1-5000 之间的有效数字'
    return
  }
  
  urging.value = true
  
  try {
    await seekApi.urge(currentSeekId.value, carrot)
    
    showToast('催片成功！', 'success')
    closeUrgeModal()
    
    // 重新加载列表以更新数据
    resetAndLoad()
  } catch (error) {
    console.error('催片失败:', error)
    urgeError.value = error.message || '催片失败'
  } finally {
    urging.value = false
  }
}

// 滚动加载更多
const handleScroll = () => {
  if (loading.value || loadingMore.value || !hasMore.value) return
  
  const scrollY = window.scrollY
  const windowH = window.innerHeight
  const docH = document.documentElement.scrollHeight
  
  if (scrollY + windowH >= docH - 300) {
    loadSeeks(false)
  }
}

// ================= 生命周期 =================
onMounted(() => {
  // 首次挂载时加载数据
  loadSeeks(true)
  window.addEventListener('scroll', handleScroll)
})

// 监听账号切换，重新加载求片列表
watch(() => appStore.userInfo, (newUserInfo) => {
  if (newUserInfo) {
    loadSeeks(true)
  }
}, { immediate: false })

// 监听“我认领的”切换，重新加载数据
watch(isUploadSelf, () => {
  loadSeeks(true)
})

watch(selectedStatus, () => {
  loadSeeks(true)
})

// keep-alive 激活时 - 重新添加滚动监听
onActivated(() => {
  window.addEventListener('scroll', handleScroll)
})

// keep-alive 停用时 - 移除滚动监听（防止页面切换时触发）
onDeactivated(() => {
  window.removeEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  clearTimeout(debounceTimer)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


.filter-bar :deep(.segmented-control--full) {
  margin: 0;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.toggle-switch {
  position: relative;
  width: 51px;
  height: 31px;
  background: var(--grouped-bg);
  border-radius: 30px;
  border: none;
  cursor: pointer;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 27px;
  height: 27px;
  background: #ffffff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
}

.toggle-switch.active {
  background: var(--success);
}

.toggle-switch.active::after {
  left: 22px;
}

.toggle-label {
  font: var(--callout);
  color: var(--system-secondary);
}

.seek-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.seek-card {
  padding: 0.8rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-main-row {
  display: flex;
  gap: 0.6rem;
}

.card-poster {
  position: relative;
  width: 85px;
  height: 120px;
  border-radius: 20px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--grouped-bg);
}

.card-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--system-tertiary);
}

.poster-placeholder i {
  font-size: 2rem;
}

.poster-status {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 0.25rem 0.5rem;
  font: var(--footnote);
  text-align: center;
  font-weight: 500;
}

.poster-status.default { background: rgba(42,42,42,0.85); color: #aaa; }
.poster-status.upload { background: rgba(255,170,51,0.85); color: #000; }
.poster-status.complete { background: rgba(40,167,69,0.85); color: #fff; }
.poster-status.cancel { background: rgba(108,117,125,0.85); color: #fff; }
.poster-status.forget { background: rgba(220,53,69,0.85); color: #fff; }

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}

.card-title {
  font: var(--title-3-emphasized);
  color: var(--system-primary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  flex: 1;
  min-width: 0;
  white-space: normal;
}

.tmdb-link {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--grouped-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--system-secondary);
  font-size: 0.7rem;
  text-decoration: none;
}

.tmdb-link:active {
  opacity: 0.7;
}

.type-tag {
  flex-shrink: 0;
  font: var(--footnote);
  color: var(--system-tertiary);
  background: var(--grouped-bg);
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  line-height: 1.4;
  display: inline-block;
  width: fit-content;
}

.claim-info-row {
  background: color-mix(in srgb, var(--warning) 8%, transparent);
  border-radius: 1000px;
  padding: 0.3rem 0.6rem;
  font: var(--footnote);
  color: var(--warning);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.user-record-section {
  padding-top: 0.5rem;
}

.record-title {
  font: var(--callout-emphasized);
  color: var(--system-secondary);
  margin-bottom: 0.4rem;
}

.user-record-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 90px;
  overflow-y: auto;
  padding-right: 2px;
}

.user-record-list::-webkit-scrollbar { width: 4px; }
.user-record-list::-webkit-scrollbar-thumb { background: var(--system-tertiary); border-radius: 2px; }

.user-record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.6rem;
  background: var(--grouped-bg);
  border-radius: 1000px;
  font: var(--footnote);
}

.user-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.user-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--opaque-shelf-bg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-avatar i { font-size: 0.6rem; color: var(--system-tertiary); }
.user-name { font: var(--footnote); color: var(--system-primary); }

.user-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.record-carrot { color: var(--warning); font: var(--footnote); }
.record-carrot i { margin-right: 0.1rem; }
.record-time { font: var(--footnote); color: var(--system-tertiary); }

.card-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: auto;
  padding-top: 0.5rem;
  flex-wrap: wrap;
}

.card-action-btn {
  flex: 1;
  min-width: 0;
  text-align: center;
  background: var(--grouped-bg);
  border: none;
  border-radius: 1000px;
  padding: 0.45rem 0.3rem;
  font: var(--callout);
  color: var(--system-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.card-action-btn i { font-size: 0.8rem; }

.card-action-btn:active {
  opacity: 0.7;
}

.card-action-btn.primary {
  background: var(--key-color);
  color: #fff;
}

.card-action-btn.secondary {
  background: transparent;
  color: var(--system-secondary);
}

.card-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .seek-grid { gap: 0.8rem; }
  .seek-card { padding: 0.6rem; }
  .card-action-btn { padding: 0.35rem 0.2rem; font: var(--footnote); }

}
</style>
