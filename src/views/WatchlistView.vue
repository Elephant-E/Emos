<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll.js'
import ImageUploader from '@/components/ImageUploader.vue'
import { formatRelativeTime } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const router = useRouter()
const appStore = useAppStore()

defineOptions({
  name: 'WatchlistView'
})

// ================= 状态管理 =================
const filterType = ref('all') // 'all' | 'mine' | 'subscribed'

const filterTabs = computed(() => [
  { label: '全部', value: 'all' },
  { label: '我的', value: 'mine' },
  { label: '已订阅', value: 'subscribed' }
])
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
  imagePosterUrl: ''  // 封面图URL（新API：只使用URL）
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
  editForm.id = null
  editForm.name = ''
  editForm.description = ''
  editForm.carrot = 0
  editForm.tags = []
  editForm.isPublic = false
  editForm.isShowEmpty = false
  editForm.imagePosterUrl = ''
  modals.editWatch = true
}

const closeEditWatchModal = () => {
  modals.editWatch = false
  editForm.id = null
  editForm.name = ''
  editForm.description = ''
  editForm.carrot = 0
  editForm.tags = []
  editForm.isPublic = false
  editForm.isShowEmpty = false
  editForm.imagePosterUrl = ''
  tagInput.value = ''
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

watch(filterType, () => {
  loadWatchlists(false)
})

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

onMounted(() => {
  loadWatchlists()
})

useInfiniteScroll({
  loadMore: () => loadMore(),
  shouldLoad: () => !isLoadingMore.value && hasMore.value,
  threshold: 200,
})

// 监听账号切换，重新加载片单列表
watch(() => appStore.userInfo, (newUserInfo) => {
  if (newUserInfo) {
    loadWatchlists()
  }
}, { immediate: false })
</script>

<template>
  <header class="page-header">
    <h1 class="page-title">片单管理</h1>
  </header>

  <div class="filter-bar">
    <SegmentedControl :tabs="filterTabs" v-model="filterType" full />
    <div class="search-sort-group">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input type="text" v-model="searchQuery" @input="handleSearchInput" :placeholder="searchType === 'name' ? '搜索片单名称...' : '搜索作者名称...'" class="search-input" />
      </div>
      <div class="cloud-buttons">
        <button class="cloud-btn" @click="toggleSearchType" :title="searchType === 'name' ? '搜索作者' : '搜索片单'"><i :class="searchType === 'name' ? 'fas fa-user' : 'fas fa-film'"></i></button>
        <button class="cloud-btn" @click="openEditModal()" title="新增片单"><i class="fas fa-plus"></i></button>
      </div>
    </div>
  </div>

  <div v-if="isLoading" class="loading-state">
    <i class="fas fa-circle-notch fa-spin"></i>
  </div>

  <div v-else-if="watchlists.length === 0" class="list-empty">
    <i class="fas fa-list"></i>
    <p>暂无片单</p>
  </div>

  <div v-else class="watchlist-grid">
    <div
      v-for="watch in watchlists"
      :key="watch.id"
      class="watch-card"
      @click="openWatchDetail(watch)"
    >
      <div class="card-cover">
        <img :src="watch.image_poster_url || `https://picsum.photos/seed/${watch.id}/600/338`" loading="lazy" :alt="watch.name">
        <div class="cover-badges">
          <span class="cover-badge"><i class="fas fa-film"></i> {{ watch.video_count || 0 }}</span>
          <span v-if="watch.subscribe_count > 0" class="cover-badge"><i class="fas fa-user-friends"></i> {{ formatCount(watch.subscribe_count) }}</span>
        </div>
      </div>
      <div class="card-info">
        <div class="info-header">
          <h3 class="card-title">{{ watch.name }}</h3>
          <span class="carrot-badge"><i class="fas fa-carrot"></i> {{ watch.carrot > 0 ? watch.carrot : 'Free' }}</span>
        </div>
        <div class="tags-container" v-if="watch.tags && watch.tags.length">
          <span v-for="(tag, idx) in watch.tags.slice(0, 3)" :key="idx" class="tag">{{ tag }}</span>
          <span v-if="watch.tags.length > 3" class="tag more">+{{ watch.tags.length - 3 }}</span>
        </div>
        <div class="card-footer">
          <div class="author-info" v-if="watch.author">
            <div class="author-avatar">
              <img v-if="watch.author.avatar" :src="watch.author.avatar" :alt="watch.author.username" loading="lazy">
              <i v-else class="fas fa-user"></i>
            </div>
            <span class="author-name">{{ watch.author.username }}</span>
            <span v-if="watch.updated_at" class="update-time">{{ formatRelativeTime(watch.updated_at) }}</span>
          </div>
          <div class="cloud-buttons">
            <button :class="['cloud-btn', { 'cloud-btn--active': watch.is_subscribe }]" @click.stop="toggleSubscribe(watch)">
              <i :class="watch.is_subscribe ? 'fas fa-check' : 'fas fa-plus'"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <template v-if="isLoadingMore">
      <div v-for="i in 3" :key="'loading-more-' + i" class="watch-card skeleton-card">
        <div class="card-cover skeleton-cover"></div>
        <div class="card-info">
          <div class="info-header"><div class="skeleton-text" style="width: 70%; height: 20px;"></div></div>
          <div class="skeleton-text" style="width: 100%; margin-bottom: 8px;"></div>
          <div class="skeleton-text" style="width: 85%;"></div>
        </div>
      </div>
    </template>
  </div>

  <BaseModal :visible="modals.editWatch" :title="editForm.id ? '编辑片单' : '新建片单'" @close="closeEditWatchModal">
    <div class="form-group">
      <label class="form-label">片单封面</label>
      <ImageUploader
        :model-value="editForm.imagePosterUrl"
        @change="(data) => { editForm.imagePosterUrl = data.url || '' }"
        :max-size="5 * 1024 * 1024"
        placeholder-text="点击上传封面"
        hint-text="支持 JPG、PNG，≤5MB"
      />
    </div>
    <div class="form-group">
      <label class="form-label">片单名称</label>
      <input type="text" class="modal-input" v-model="editForm.name" placeholder="片单名称（100字内）" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">简介</label>
      <textarea class="modal-input modal-textarea" v-model="editForm.description" rows="3" placeholder="简介（1万字内）" maxlength="10000"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">所需萝卜</label>
      <input type="number" class="modal-input" v-model.number="editForm.carrot" min="0" max="50000" placeholder="0 - 50000">
    </div>
    <div class="form-group">
      <label class="form-label">标签 (回车添加)</label>
      <input type="text" class="modal-input" v-model="tagInput" @keypress="addTag" placeholder="输入标签...">
      <div class="tags-list">
        <span v-for="tag in editForm.tags" :key="tag" class="tag-item">{{ tag }} <i class="fas fa-times" @click="removeTag(tag)"></i></span>
      </div>
    </div>
    <div class="toggle-row">
      <span class="form-label" style="margin:0">是否公开</span>
      <div :class="['toggle-switch', { active: editForm.isPublic }]" @click="editForm.isPublic = !editForm.isPublic"><div class="toggle-slider"></div></div>
    </div>
    <div class="toggle-row">
      <span class="form-label" style="margin:0">显示空媒体</span>
      <div :class="['toggle-switch', { active: editForm.isShowEmpty }]" @click="editForm.isShowEmpty = !editForm.isShowEmpty"><div class="toggle-slider"></div></div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="modals.editWatch = false">取消</button>
      <button class="modal-btn primary" @click="saveWatchlist" :disabled="isSaving">
        <i v-if="isSaving" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>保存</span>
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.watchlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.watch-card {
  background: var(--opaque-shelf-bg);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
}

.watch-card:active {
  opacity: 0.85;
}

.card-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--grouped-bg);
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-badges {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
}

.cover-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 1000px;
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 255, 255, 0.9);
  font: var(--footnote);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.cover-badge i {
  font-size: 0.6rem;
}

.card-info {
  padding: 0.75rem 1rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-title {
  font: var(--callout-emphasized);
  color: var(--system-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  margin: 0;
}

.carrot-badge {
  flex-shrink: 0;
  font: var(--footnote);
  color: var(--warning);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.carrot-badge i {
  font-size: 0.6rem;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  font: var(--footnote);
  color: var(--system-secondary);
  background: var(--grouped-bg);
  padding: 2px 8px;
  border-radius: 1000px;
  white-space: nowrap;
}

.tag.more {
  color: var(--system-tertiary);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.2rem;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.author-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--grouped-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-avatar i {
  font-size: 0.55rem;
  color: var(--system-tertiary);
}

.author-name {
  font: var(--footnote);
  color: var(--system-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.update-time {
  font: var(--footnote);
  color: var(--system-tertiary);
  flex-shrink: 0;
}

.card-footer .cloud-buttons {
  padding: 2px;
}

.card-footer .cloud-btn {
  width: 26px;
  height: 26px;
  font-size: 0.65rem;
}

.skeleton-card .skeleton-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--system-quaternary);
}

.skeleton-card .skeleton-text {
  height: 14px;
  border-radius: 4px;
  background: var(--system-quaternary);
}

@media (max-width: 768px) {
  .watchlist-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.8rem;
  }
}

@media (max-width: 480px) {
  .watchlist-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .card-info {
    padding: 0.5rem 0.6rem 0.6rem;
    gap: 0.25rem;
  }

  .card-title {
    font: var(--footnote-emphasized);
  }

  .cover-badge {
    padding: 1px 5px;
    font-size: 9px;
  }

  .author-name,
  .update-time {
    font-size: 9px;
  }
}
</style>
