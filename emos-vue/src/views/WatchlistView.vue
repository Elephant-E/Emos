<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import ImageUploader from '@/components/ImageUploader.vue'
import { formatRelativeTime } from '@/utils/format.js'

const router = useRouter()
const appStore = useAppStore()

defineOptions({
  name: 'WatchlistView'
})

// ================= 状态管理 =================
const filterType = ref('all') // 'all' | 'mine' | 'subscribed'
const isLoading = ref(false)
const watchlists = ref([])
const searchQuery = ref('')
const searchType = ref('name') // 'name' | 'author' - 搜索类型

// 分页状态
const currentPage = ref(1)
const pageSize = ref(20)
const totalItems = ref(0)
const hasMore = ref(true)
const isLoadingMore = ref(false)

// 搜索防抖定时器
let searchTimeout = null

// 模态框状态
const modals = reactive({
  editWatch: false
})

// 编辑片单表单
const editForm = reactive({
  id: null,
  name: '',
  description: '',
  carrot: 0,
  tags: [],
  isPublic: false,
  isShowEmpty: false,  // 是否显示空媒体
  imagePosterUrl: '',  // 封面图URL（新增时使用）
  imagePosterFileId: '' // 封面图file_id（编辑时使用）
})

const tagInput = ref('')

const isSaving = ref(false)

// 切换搜索类型
const toggleSearchType = () => {
  searchType.value = searchType.value === 'name' ? 'author' : 'name'
  // 切换后如果有搜索内容，重新触发搜索
  if (searchQuery.value.trim()) {
    handleSearchInput()
  }
}

// 封面图上传成功处理
const handleCoverUploadSuccess = (fileId) => {
  editForm.imagePosterFileId = fileId
}

// ================= API 调用 =================

// 加载片单列表
const loadWatchlists = async (isLoadMore = false) => {
  // 如果是加载更多，设置loading状态
  if (isLoadMore) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
    // 重置分页
    currentPage.value = 1
    watchlists.value = []
  }
  
  try {
    let params = {
      page: currentPage.value,
      page_size: pageSize.value
    }
    
    // 添加过滤参数
    if (filterType.value === 'mine') {
      params.is_self = '1'
    } else if (filterType.value === 'subscribed') {
      params.is_subscribe = '1'
    } else if (filterType.value === 'all') {
      // 全部片单：只显示公共片单
      params.is_public = '1'
    }
    
    // 添加搜索参数
    if (searchQuery.value.trim()) {
      if (searchType.value === 'name') {
        params.name = searchQuery.value.trim()
      } else {
        params.author_username = searchQuery.value.trim()
      }
    }
    
    const response = await watchlistApi.getList(params)
    const items = response.items || []
    totalItems.value = response.total || 0
    
    // 追加或替换数据
    if (isLoadMore) {
      watchlists.value = [...watchlists.value, ...items]
    } else {
      watchlists.value = items
    }
    
    // 判断是否还有更多数据
    hasMore.value = items.length > 0 && watchlists.value.length < totalItems.value
  } catch (error) {
    console.error('加载片单失败:', error)
    showToast(error.message || '加载失败', 'error')
    if (!isLoadMore) {
      watchlists.value = []
    }
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// 加载更多
const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  
  currentPage.value++
  await loadWatchlists(true)
}

// 打开片单详情（跳转到独立页面）
const openWatchDetail = (watch) => {
  router.push(`/watchlist/${watch.id}`)
}

// 打开编辑片单模态框（仅用于新增）
const openEditModal = () => {
  // 新建片单
  editForm.id = null
  editForm.name = ''
  editForm.description = ''
  editForm.carrot = 0
  editForm.tags = []
  editForm.isPublic = false
  editForm.isShowEmpty = false
  editForm.imagePosterUrl = ''
  editForm.imagePosterFileId = ''
  modals.editWatch = true
}

// 保存片单（仅新增）
const saveWatchlist = async () => {
  if (isSaving.value) return
  
  if (!editForm.name.trim()) {
    showToast('请输入片单名称', 'warning')
    return
  }

  isSaving.value = true

  try {
    const data = {
      id: null,  // 新增时 id 为 null
      name: editForm.name,
      description: editForm.description,
      is_public: editForm.isPublic,
      point: editForm.carrot,
      tags: editForm.tags,
      is_show_empty: editForm.isShowEmpty
    }
    
    // 添加封面图参数（新增时使用 URL）
    if (editForm.imagePosterUrl) {
      data.image_poster_url = editForm.imagePosterUrl
    }

    await watchlistApi.create(data)
    showToast('片单创建成功', 'success')

    modals.editWatch = false
    await loadWatchlists()
  } catch (error) {
    console.error('创建片单失败:', error)
    showToast(error.message || '创建失败', 'error')
  } finally {
    isSaving.value = false
  }
}

// 订阅/取消订阅
const toggleSubscribe = async (watchlist) => {
  try {
    const response = await watchlistApi.toggleSubscribe(watchlist.id)
    
    // 更新本地状态
    watchlist.is_subscribe = response.is_subscribe
    
    if (response.is_subscribe) {
      showToast('订阅成功', 'success')
    } else {
      showToast('已取消订阅', 'success')
    }
  } catch (error) {
    console.error('切换订阅失败:', error)
    showToast(error.message || '操作失败', 'error')
  }
}

// ================= 标签管理 =================

const addTag = (event) => {
  if (event.key === 'Enter' && tagInput.value.trim()) {
    const tag = tagInput.value.trim()
    if (!editForm.tags.includes(tag)) {
      editForm.tags.push(tag)
    }
    tagInput.value = ''
  }
}

const removeTag = (tag) => {
  editForm.tags = editForm.tags.filter(t => t !== tag)
}

// ================= 过滤器切换 =================

const setFilter = (filter) => {
  filterType.value = filter
  loadWatchlists(false)
}

// ================= 搜索处理 =================

const handleSearchInput = () => {
  // 清除之前的定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  // 设置防抖，500ms 后执行搜索
  searchTimeout = setTimeout(() => {
    loadWatchlists(false)
  }, 500)
}

// ================= 工具函数 =================

// 格式化数字（超过1000显示k）
const formatCount = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num
}

// ================= 生命周期 =================

// 滚动加载处理
const handleScroll = () => {
  if (isLoadingMore.value || !hasMore.value) return
  
  // 获取滚动容器（通常是 window 或者特定的滚动容器）
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  
  // 距离底部 200px 时触发加载
  if (scrollTop + windowHeight >= documentHeight - 200) {
    loadMore()
  }
}

// 生命周期
onMounted(() => {
  loadWatchlists()
  // 添加滚动监听（只添加一次）
  window.addEventListener('scroll', handleScroll)
})

// 监听账号切换，重新加载片单列表
watch(() => appStore.userInfo, (newUserInfo) => {
  if (newUserInfo) {
    loadWatchlists()
  }
}, { immediate: false })

// keep-alive 激活时 - 重新添加滚动监听
onActivated(() => {
  window.addEventListener('scroll', handleScroll)
})

// keep-alive 停用时 - 移除滚动监听（防止页面切换时触发）
onDeactivated(() => {
  window.removeEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  // 移除滚动监听
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <!-- 片单列表视图 -->
  <header class="page-header">
    <h1 class="page-title">片单管理</h1>
    <p class="page-subtitle">浏览与订阅精选影视片单</p>
  </header>

  <div class="filter-bar">
    <div class="filter-group">
      <button 
        :class="['filter-chip', { active: filterType === 'all' }]"
        @click="setFilter('all')"
      >
        全部
      </button>
      <button 
        :class="['filter-chip', { active: filterType === 'mine' }]"
        @click="setFilter('mine')"
      >
        我的
      </button>
      <button 
        :class="['filter-chip', { active: filterType === 'subscribed' }]"
        @click="setFilter('subscribed')"
      >
        已订阅
      </button>
    </div>
    
    <!-- 搜索框 -->
    <div class="search-container">
      <i class="fas fa-search search-icon"></i>
      <input 
        type="text" 
        v-model="searchQuery"
        @input="handleSearchInput"
        :placeholder="searchType === 'name' ? '搜索片单名称...' : '搜索作者名称...'" 
        class="search-input"
      />
      <!-- 搜索类型切换按钮 -->
      <button 
        class="search-type-toggle"
        @click="toggleSearchType"
        :title="searchType === 'name' ? '切换到搜索作者' : '切换到搜索片单'"
      >
        <i :class="searchType === 'name' ? 'fas fa-film' : 'fas fa-user'"></i>
      </button>
    </div>
    
    <button class="action-btn-primary" @click="openEditModal()" title="新增片单">
      <i class="fas fa-plus"></i>
    </button>
  </div>

  <!-- 加载中 -->
  <div v-if="isLoading" class="watchlist-grid">
    <!-- 骨架屏卡片 -->
    <div 
      v-for="i in 6" 
      :key="'skeleton-' + i"
      class="watch-card skeleton-card"
    >
      <!-- 封面骨架 -->
      <div class="card-cover skeleton-cover">
        <!-- 维护者头像骨架 -->
        <div class="maintainers-queue">
          <div class="skeleton-circle" style="width: 28px; height: 28px;"></div>
          <div class="skeleton-circle" style="width: 28px; height: 28px;"></div>
          <div class="skeleton-circle" style="width: 28px; height: 28px;"></div>
        </div>
      </div>
      
      <!-- 信息区域骨架 -->
      <div class="card-info">
        <!-- 标题行骨架 -->
        <div class="info-header">
          <div class="skeleton-text" style="width: 70%; height: 20px;"></div>
          <div class="skeleton-badge"></div>
        </div>
        
        <!-- 描述骨架 -->
        <div class="skeleton-text" style="width: 100%; margin-bottom: 8px;"></div>
        <div class="skeleton-text" style="width: 85%;"></div>
        
        <!-- 标签骨架 -->
        <div class="tags-container">
          <div class="skeleton-tag"></div>
          <div class="skeleton-tag"></div>
          <div class="skeleton-tag"></div>
        </div>
        
        <!-- 底部信息骨架 -->
        <div class="card-footer">
          <div class="author-info">
            <div class="skeleton-circle" style="width: 26px; height: 26px;"></div>
            <div class="skeleton-text" style="width: 80px; height: 14px;"></div>
            <div class="skeleton-text" style="width: 60px; height: 12px;"></div>
          </div>
          <div class="skeleton-button" style="width: 80px;"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 空状态 -->
  <div v-else-if="watchlists.length === 0" class="empty-state">
    暂无片单
  </div>

  <!-- 片单网格 -->
  <div v-else class="watchlist-grid">
      <!-- 实际卡片 -->
      <div 
        v-for="watch in watchlists" 
        :key="watch.id"
        class="watch-card"
        @click="openWatchDetail(watch)"
      >
        <!-- 封面区域 -->
        <div class="card-cover">
          <img 
            :src="watch.image_poster_url || `https://picsum.photos/seed/${watch.id}/600/338`" 
            loading="lazy"
            :alt="watch.name"
          >
          <!-- 右上角徽章 -->
          <div class="cover-badges">
            <span class="cover-badge video-count">
              <i class="fas fa-film"></i> {{ watch.video_count || 0 }}
            </span>
            <span v-if="watch.subscribe_count > 0" class="cover-badge subscribe-count">
              <i class="fas fa-user-friends"></i> {{ formatCount(watch.subscribe_count) }}
            </span>
          </div>
          
          <!-- 右下角维护者头像队列 -->
          <div v-if="watch.maintainers && watch.maintainers.length > 0" class="maintainers-queue">
            <template v-for="(maintainer, index) in watch.maintainers.slice(0, 3)" :key="maintainer.user_id">
              <div class="maintainer-avatar" :style="{ zIndex: 3 - index }">
                <img 
                  v-if="maintainer.avatar" 
                  :src="maintainer.avatar" 
                  :alt="maintainer.username"
                  loading="lazy"
                >
                <i v-else class="fas fa-user"></i>
              </div>
            </template>
            <div v-if="watch.maintainers.length > 3" class="maintainer-more">
              +{{ watch.maintainers.length - 3 }}
            </div>
          </div>
        </div>

        <!-- 信息区域 -->
        <div class="card-info">
          <!-- 标题行 -->
          <div class="info-header">
            <h3 class="card-title" :title="watch.name">{{ watch.name }}</h3>
            <span class="carrot-badge">
              <i class="fas fa-carrot"></i> {{ watch.carrot > 0 ? watch.carrot : 'Free' }}
            </span>
          </div>

          <!-- 描述文本 -->
          <p v-if="watch.description" class="card-description" :title="watch.description">
            {{ watch.description }}
          </p>

          <!-- 标签列表 -->
          <div v-if="watch.tags && watch.tags.length" class="tags-container">
            <span v-for="tag in watch.tags.slice(0, 4)" :key="tag" class="tag">
              {{ tag }}
            </span>
            <span v-if="watch.tags.length > 4" class="tag more">+{{ watch.tags.length - 4 }}</span>
          </div>

          <!-- 底部作者信息和订阅按钮 -->
          <div class="card-footer">
            <div class="author-info" v-if="watch.author">
              <div class="author-avatar">
                <img 
                  v-if="watch.author.avatar" 
                  :src="watch.author.avatar" 
                  :alt="watch.author.username"
                  loading="lazy"
                >
                <i v-else class="fas fa-user"></i>
              </div>
              <span class="author-name">{{ watch.author.username }}</span>
              <span v-if="watch.updated_at" class="update-time">{{ formatRelativeTime(watch.updated_at) }}</span>
            </div>
            
            <!-- 订阅按钮（未订阅时显示） -->
            <button 
              v-if="!watch.is_subscribe && !watch.is_self" 
              class="subscribe-btn"
              @click.stop="toggleSubscribe(watch)"
              title="订阅片单"
            >
              <i class="fas fa-plus"></i>
              <span>订阅</span>
            </button>
            
            <!-- 已订阅状态 -->
            <div v-if="watch.is_subscribe" class="subscribed-status">
              <i class="fas fa-check"></i>
              <span>已订阅</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 加载更多时的骨架屏 -->
      <template v-if="isLoadingMore">
        <div 
          v-for="i in Math.min(pageSize, totalItems - watchlists.length)" 
          :key="'loading-more-' + i"
          class="watch-card skeleton-card"
        >
          <div class="card-cover skeleton-cover"></div>
          <div class="card-info">
            <div class="info-header">
              <div class="skeleton-text" style="width: 70%; height: 20px;"></div>
              <div class="skeleton-badge"></div>
            </div>
            <div class="skeleton-text" style="width: 100%; margin-bottom: 8px;"></div>
            <div class="skeleton-text" style="width: 85%;"></div>
            <div class="tags-container">
              <div class="skeleton-tag"></div>
              <div class="skeleton-tag"></div>
              <div class="skeleton-tag"></div>
            </div>
            <div class="card-footer">
              <div class="author-info">
                <div class="skeleton-circle" style="width: 26px; height: 26px;"></div>
                <div class="skeleton-text" style="width: 80px; height: 14px;"></div>
                <div class="skeleton-text" style="width: 60px; height: 12px;"></div>
              </div>
              <div class="skeleton-button" style="width: 80px;"></div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 编辑片单模态框 -->
    <div 
      :class="['modal-overlay', { show: modals.editWatch }]"
      @click.self="modals.editWatch = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">{{ editForm.id ? '编辑片单' : '新建片单' }}</span>
          <button class="modal-close" @click="modals.editWatch = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- 封面图上传 -->
          <div class="form-group">
            <label class="form-label">片单封面</label>
            <ImageUploader
              :model-value="editForm.imagePosterFileId || editForm.imagePosterUrl"
              @update:model-value="(val) => editForm.imagePosterFileId = val"
              :max-size="5 * 1024 * 1024"
              placeholder-text="点击上传封面"
              hint-text="支持 JPG、PNG，≤5MB"
              @upload-success="handleCoverUploadSuccess"
            />
          </div>

          <div class="form-group">
            <label class="form-label">片单名称</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="editForm.name"
              placeholder="片单名称（100字内）"
              maxlength="100"
            >
          </div>

          <div class="form-group">
            <label class="form-label">简介</label>
            <textarea 
              class="modal-input modal-textarea" 
              v-model="editForm.description"
              rows="3" 
              placeholder="简介（1万字内）"
              maxlength="10000"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">所需萝卜</label>
            <input 
              type="number" 
              class="modal-input" 
              v-model.number="editForm.carrot"
              min="0"
              max="50000"
              placeholder="0 - 50000"
            >
          </div>

          <div class="form-group">
            <label class="form-label">标签 (回车添加)</label>
            <div class="tags-input">
              <input 
                type="text" 
                v-model="tagInput"
                @keypress="addTag"
                placeholder="输入标签..."
              >
            </div>
            <div class="tags-list">
              <span v-for="tag in editForm.tags" :key="tag" class="tag-item">
                {{ tag }}
                <i class="fas fa-times" @click="removeTag(tag)"></i>
              </span>
            </div>
          </div>

          <div class="toggle-row">
            <span class="form-label" style="margin:0">是否公开</span>
            <div 
              :class="['toggle-switch', { active: editForm.isPublic }]"
              @click="editForm.isPublic = !editForm.isPublic"
            ></div>
          </div>

          <div class="toggle-row">
            <span class="form-label" style="margin:0">显示空媒体</span>
            <div 
              :class="['toggle-switch', { active: editForm.isShowEmpty }]"
              @click="editForm.isShowEmpty = !editForm.isShowEmpty"
            ></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="modals.editWatch = false">取消</button>
          <button class="modal-btn primary" @click="saveWatchlist" :disabled="isSaving">
            <span v-if="!isSaving">保存</span>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
          </button>
        </div>
      </div>
    </div>

</template>

<style scoped>
/* 样式将在下面定义 */
</style>
