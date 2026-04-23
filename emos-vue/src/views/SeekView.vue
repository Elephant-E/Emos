<template>
  <!-- MainLayout 已提供 main-wrapper，这里直接渲染内容 -->
  <header class="page-header">
    <h1 class="page-title">求片管理</h1>
    <p class="page-subtitle">浏览与认领影视求片，共建优质资源库</p>
  </header>

  <!-- 筛选与控制面板 - 使用 bento-card 样式 -->
  <div class="bento-card filter-card">
      <div class="status-row">
        <button 
          v-for="status in statusList" 
          :key="status.value"
          class="status-chip"
          :class="{ active: selectedStatus === status.value }"
          @click="handleStatusChange(status.value)"
        >
          <i :class="status.icon"></i> {{ status.label }}
        </button>
      </div>
      
      <div class="search-row">
        <input 
          type="text" 
          class="modal-input search-input" 
          v-model="searchQuery"
          @input="handleSearchInput"
          placeholder="输入片名搜索..." 
          autocomplete="off"
        >
        <i class="fas fa-search search-icon"></i>
      </div>
      
      <div class="filter-row">
        <div class="toggle-wrapper">
          <div 
            class="toggle-switch" 
            :class="{ active: isUploadSelf }"
            @click="isUploadSelf = !isUploadSelf"
          ></div>
          <span class="toggle-label">我认领的</span>
        </div>
        
        <div class="sort-buttons">
          <button 
            v-for="sort in sortList" 
            :key="sort.field"
            class="sort-btn"
            :class="{ active: currentSort === sort.field }"
            @click="handleSortChange(sort.field)"
          >
            <i :class="currentSort === sort.field ? (currentOrder === 'asc' ? 'fas fa-arrow-up' : 'fas fa-arrow-down') : 'fas fa-arrow-down'"></i>
            {{ sort.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 - 使用骨架屏 -->
    <div v-if="loading && seekList.length === 0" class="seek-grid">
      <div 
        v-for="i in 6" 
        :key="i"
        class="bento-card seek-card skeleton-seek-card"
      >
        <div class="card-main-row">
          <!-- 海报骨架 -->
          <div class="card-poster skeleton-poster"></div>
          
          <!-- 信息骨架 -->
          <div class="card-info">
            <div class="skeleton-text skeleton-title"></div>
            <div class="card-buttons">
              <div class="skeleton-button skeleton-btn-id"></div>
              <div class="skeleton-button skeleton-btn-tmdb"></div>
            </div>
            <div class="card-stats">
              <div class="skeleton-button skeleton-stat"></div>
              <div class="skeleton-button skeleton-stat"></div>
            </div>
          </div>
        </div>
        
        <!-- 用户记录骨架 -->
        <div class="user-record-section">
          <div class="record-title">
            <div class="skeleton-text-sm skeleton-record-title"></div>
          </div>
          <div class="user-record-list">
            <div class="user-record-item">
              <div class="user-left">
                <div class="skeleton-circle skeleton-avatar"></div>
                <div class="skeleton-text-sm skeleton-username"></div>
              </div>
              <div class="user-right">
                <div class="skeleton-text-sm skeleton-carrot"></div>
                <div class="skeleton-text-sm skeleton-time"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮骨架 -->
        <div class="card-actions">
          <div class="skeleton-button skeleton-action-btn"></div>
          <div class="skeleton-button skeleton-action-btn"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 - 使用公共样式 -->
    <div v-else-if="!loading && seekList.length === 0" class="empty-state">
      {{ getEmptyMessage() }}
    </div>

    <!-- 求片网格 - 使用 bento-grid 布局 -->
    <div v-else class="seek-grid">
      <div 
        v-for="item in seekList" 
        :key="item.id"
        class="bento-card seek-card"
      >
        <div class="card-main-row">
          <div class="card-poster">
            <img v-if="item.video_image_poster" 
              :src="item.video_image_poster" 
              alt="海报"
             loading="lazy">
            <div v-else class="poster-placeholder">
              <i class="fas fa-film"></i>
            </div>
            <div class="poster-status" :class="item.status">
              {{ getStatusText(item.status) }}
            </div>
          </div>
          
          <div class="card-info">
            <div class="card-title">{{ item.video_title_display }}</div>
            <div class="card-buttons">
              <span 
                class="id-btn" 
                @click="copyId(item.item_id)"
              >
                <i class="fas fa-hashtag"></i> {{ item.item_id }}
              </span>
              <a 
                :href="getTmdbUrl(item)" 
                target="_blank" 
                class="tmdb-btn"
                @click.stop
              >
                <i class="fas fa-external-link-alt"></i> TMDB
              </a>
            </div>
            <div class="card-stats">
              <span><i class="fas fa-users"></i> {{ item.count_request }}</span>
              <span><i class="fas fa-carrot"></i> {{ item.seek_carrot }}</span>
            </div>
          </div>
        </div>

        <!-- 认领信息 -->
        <div 
          v-if="item.status === 'upload' && item.upload_username" 
          class="claim-info-row"
        >
          <i class="fas fa-user-check"></i> 
          认领人：{{ item.upload_username }} · 剩余 {{ getRemainingTime(item.upload_expired_at) }}
        </div>

        <!-- 用户求片记录 -->
        <div v-if="item.users && item.users.length > 0" class="user-record-section">
          <div class="record-title">求片记录</div>
          <div class="user-record-list">
            <div 
              v-for="(user, index) in item.users" 
              :key="index"
              class="user-record-item"
            >
              <div class="user-left">
                <div class="user-avatar">
                  <img v-if="user.avatar" :src="user.avatar" alt="" loading="lazy">
                  <i v-else class="fas fa-user"></i>
                </div>
                <span class="user-name">{{ user.username }}</span>
              </div>
              <div class="user-right">
                <span class="record-carrot" v-if="user.carrot > 0">
                  <i class="fas fa-carrot"></i> {{ user.carrot }}
                </span>
                <span class="record-time">{{ formatDate(user.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="card-actions">
          <button 
            class="card-action-btn" 
            @click="goToDetail(item)"
          >
            <i class="fas fa-info-circle"></i> 详情
          </button>
          
          <button 
            v-if="item.status === 'default'"
            class="card-action-btn primary claim-btn"
            :disabled="claiming[item.id]"
            @click="handleClaim(item.id, item.status)"
          >
            <i v-if="claiming[item.id]" class="fas fa-circle-notch fa-spin"></i>
            <i v-else class="fas fa-hand-holding-heart"></i>
          </button>
          
          <button 
            v-if="item.status === 'upload' && item.upload_username === '我'"
            class="card-action-btn secondary cancel-claim-btn"
            :disabled="claiming[item.id]"
            @click="handleClaim(item.id, item.status)"
          >
            <i v-if="claiming[item.id]" class="fas fa-circle-notch fa-spin"></i>
            <i v-else class="fas fa-times-circle"></i>
          </button>
          
          <button 
            v-if="item.status === 'default' || item.status === 'forget'"
            class="card-action-btn urge-btn"
            @click="openUrgeModal(item.id)"
          >
            <i class="fas fa-bell"></i> 催上片
          </button>
        </div>
      </div>
    </div>

    <!-- 加载更多指示器 - 使用骨架屏 -->
    <div v-if="loadingMore" class="seek-grid">
      <div 
        v-for="i in 3" 
        :key="i"
        class="bento-card seek-card skeleton-seek-card"
      >
        <div class="card-main-row">
          <div class="card-poster skeleton-poster"></div>
          <div class="card-info">
            <div class="skeleton-text skeleton-title"></div>
            <div class="card-buttons">
              <div class="skeleton-button skeleton-btn-id"></div>
              <div class="skeleton-button skeleton-btn-tmdb"></div>
            </div>
            <div class="card-stats">
              <div class="skeleton-button skeleton-stat"></div>
              <div class="skeleton-button skeleton-stat"></div>
            </div>
          </div>
        </div>
        
        <div class="user-record-section">
          <div class="record-title">
            <div class="skeleton-text-sm skeleton-record-title"></div>
          </div>
          <div class="user-record-list">
            <div class="user-record-item">
              <div class="user-left">
                <div class="skeleton-circle skeleton-avatar"></div>
                <div class="skeleton-text-sm skeleton-username"></div>
              </div>
              <div class="user-right">
                <div class="skeleton-text-sm skeleton-carrot"></div>
                <div class="skeleton-text-sm skeleton-time"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card-actions">
          <div class="skeleton-button skeleton-action-btn"></div>
          <div class="skeleton-button skeleton-action-btn"></div>
        </div>
      </div>
    </div>

    <!-- 催上片模态框 - 使用全局模态框样式 -->
    <Teleport to="body">
      <div class="modal-overlay" :class="{ show: showUrgeModal }">
        <div class="modal-content sm">
          <div class="modal-header">
            <h3 class="modal-title">催上片</h3>
            <button class="modal-close" @click="closeUrgeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <input 
              type="number" 
              class="modal-input" 
              v-model="urgeCarrot"
              placeholder="输入萝卜数量 (1-5000)" 
              min="1" 
              max="5000" 
              step="1"
            >
            
            <div class="modal-error">{{ urgeError }}</div>
          </div>
          
          <div class="modal-footer">
            <button class="modal-btn secondary" @click="closeUrgeModal">取消</button>
            <button 
              class="modal-btn primary" 
              :disabled="urging"
              @click="handleUrge"
            >
              <span v-if="!urging">确认</span>
              <i v-else class="fas fa-circle-notch fa-spin"></i>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup>
import { ref, reactive, onUnmounted, onActivated, onDeactivated, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import seekApi from '@/api/seekApi.js'
import { formatDate } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'

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

// 催上片模态框
const showUrgeModal = ref(false)
const currentSeekId = ref(null)
const urgeCarrot = ref('')
const urgeError = ref('')
const urging = ref(false)

// 状态列表
const statusList = [
  { value: 'default', label: '待认领', icon: 'fas fa-clock' },
  { value: 'upload', label: '已认领', icon: 'fas fa-hand-holding-heart' },
  { value: 'complete', label: '已完成', icon: 'fas fa-check-circle' },
  { value: 'cancel', label: '已取消', icon: 'fas fa-times-circle' },
  { value: 'forget', label: '遗忘', icon: 'fas fa-exclamation-triangle' }
]

// 排序列表
const sortList = [
  { field: 'updated_at', label: '更新时间' },
  { field: 'count_request', label: '求片人数' },
  { field: 'seek_carrot', label: '萝卜数' }
]

let debounceTimer = null

// ================= 方法 =================

// 获取视频ID
const getVideoId = (item) => {
  return item.video_type === 'movie' ? `vl-${item.video_list_id}` : item.todb_id
}

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

// 状态切换
const handleStatusChange = (status) => {
  selectedStatus.value = status
  resetAndLoad()
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
      item.status = response.data.status || (type === 'confirm' ? 'upload' : 'default')
      item.upload_username = type === 'confirm' ? '我' : null
    }
    
    // 重新加载列表以获取最新数据
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
/* ================= 筛选面板特有样式 ================= */
.filter-card {
  margin-bottom: 1.5rem;
}

.filter-card .status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-chip {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 40px;
  padding: 0.4rem 1.2rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s var(--spring);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.status-chip:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-hover);
}

.status-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent);
}

.filter-card .search-row {
  margin-bottom: 1rem;
  position: relative;
}

.search-input {
  padding-left: 3rem;
}

.search-icon {
  position: absolute;
  left: 1.1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
  transition: color 0.2s;
}

.search-input:focus ~ .search-icon {
  color: var(--accent);
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
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
  background: var(--bg-input);
  border-radius: 30px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 27px;
  height: 27px;
  background: #ffffff;
  border-radius: 50%;
  top: 1.5px;
  left: 1.5px;
  transition: 0.2s var(--spring);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.toggle-switch.active {
  background: var(--success);
  border-color: var(--success);
}

.toggle-switch.active::after {
  left: 21.5px;
}

.toggle-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.sort-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sort-btn {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 40px;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s var(--spring);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.sort-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-hover);
}

.sort-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.sort-btn i {
  font-size: 0.75rem;
}

/* ================= 求片网格布局 ================= */
.seek-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* ================= 求片卡片骨架屏样式 ================= */
.skeleton-seek-card {
  pointer-events: none;
  cursor: default;
}

.skeleton-seek-card .skeleton-poster {
  width: 100%;
  aspect-ratio: 2/3;
  border-radius: 16px;
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    color-mix(in srgb, var(--bg-input) 40%, white) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-seek-card .skeleton-text,
.skeleton-seek-card .skeleton-text-sm,
.skeleton-seek-card .skeleton-button,
.skeleton-seek-card .skeleton-circle {
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    color-mix(in srgb, var(--bg-input) 40%, white) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* 骨架屏尺寸变体 */
.skeleton-title { width: 80%; height: 20px; margin-bottom: 12px; }
.skeleton-btn-id { width: 80px; }
.skeleton-btn-tmdb { width: 60px; }
.skeleton-stat { width: 50px; }
.skeleton-record-title { width: 60px; }
.skeleton-avatar { width: 24px; height: 24px; }
.skeleton-username { width: 60px; }
.skeleton-carrot { width: 40px; }
.skeleton-time { width: 70px; }
.skeleton-action-btn { flex: 1; height: 32px; }

@media (max-width: 900px) {
  .seek-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 650px) {
  .seek-grid {
    grid-template-columns: 1fr;
  }
}

/* 求片卡片特有样式 */
.seek-card {
  padding: 1.2rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.card-main-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.card-poster {
  position: relative;
  width: 85px;
  height: 120px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-input);
  box-shadow: var(--shadow-sm);
}

.card-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.seek-card:hover .card-poster img {
  transform: scale(1.05);
}

.poster-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
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
  font-size: 0.65rem;
  text-align: center;
  font-weight: 500;
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255,255,255,0.1);
}

.poster-status.default {
  background: rgba(42,42,42,0.85);
  color: #aaa;
}

.poster-status.upload {
  background: rgba(255,170,51,0.85);
  color: #000;
}

.poster-status.complete {
  background: rgba(40,167,69,0.85);
  color: #fff;
}

.poster-status.cancel {
  background: rgba(108,117,125,0.85);
  color: #fff;
}

.poster-status.forget {
  background: rgba(220,53,69,0.85);
  color: #fff;
}

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.id-btn, .tmdb-btn {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 40px;
  padding: 0.25rem 0.8rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s var(--spring);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  text-decoration: none;
}

.id-btn:hover, .tmdb-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.card-stats {
  display: flex;
  gap: 0.8rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}

.card-stats i {
  margin-right: 0.2rem;
  color: var(--accent);
}

.claim-info-row {
  background: color-mix(in srgb, var(--warning) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
  border-radius: 40px;
  padding: 0.4rem 0.8rem;
  margin-bottom: 0.8rem;
  font-size: 0.75rem;
  color: var(--warning);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.user-record-section {
  margin: 0.8rem 0;
  border-top: 1px solid var(--border);
  padding-top: 0.8rem;
}

.record-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
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

.user-record-list::-webkit-scrollbar {
  width: 4px;
}

.user-record-list::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 2px;
}

.user-record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.6rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 40px;
  font-size: 0.75rem;
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
  background: var(--bg-surface);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar i {
  font-size: 0.6rem;
  color: var(--text-tertiary);
}

.user-name {
  font-size: 0.75rem;
  color: var(--text-primary);
}

.user-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.record-carrot {
  color: var(--warning);
  font-size: 0.65rem;
}

.record-carrot i {
  margin-right: 0.1rem;
}

.record-time {
  font-size: 0.65rem;
  color: var(--text-tertiary);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto; /* 自动推到卡片底部 */
  padding-top: 0.8rem;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.card-action-btn {
  flex: 1;
  min-width: 0;
  text-align: center;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 40px;
  padding: 0.45rem 0.3rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s var(--spring);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.card-action-btn i {
  font-size: 0.8rem;
}

.card-action-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-hover);
}

.card-action-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent);
}

.card-action-btn.primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.card-action-btn.secondary {
  background: transparent;
  border-color: var(--border);
  color: var(--text-secondary);
}

.card-action-btn.secondary:hover {
  background: var(--bg-surface-hover);
  border-color: var(--danger);
  color: var(--danger);
}

.card-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ================= 加载动画 ================= */
.apple-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 auto;
}

.apple-loading .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: apple-spin 0.8s linear infinite;
  margin-bottom: 0.8rem;
}

@keyframes apple-spin {
  to { transform: rotate(360deg); }
}

/* ================= 移动端适配 ================= */
@media (max-width: 768px) {
  .filter-card {
    padding: 1rem;
  }
  
  .sort-buttons {
    width: 100%;
    justify-content: flex-start;
    margin-top: 0.5rem;
  }
  
  .sort-btn {
    padding: 0.35rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .card-main-row {
    flex-direction: row;
    align-items: center;
  }
  
  .card-poster {
    width: 85px;
    height: 120px;
  }
  
  .card-actions {
    flex-direction: row;
  }
}
</style>
