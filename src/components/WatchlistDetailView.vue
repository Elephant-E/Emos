<script setup>
import { ref, reactive, onMounted, onUnmounted, onActivated, onDeactivated, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import { normalizeList } from '@/utils/format.js'
import ImageUploader from '@/components/ImageUploader.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

// 组件名称（用于keep-alive）
defineOptions({
  name: 'WatchlistDetailView'
})

// ================= 状态管理 =================
const detailState = reactive({
  id: null,
  name: '',
  description: '',
  carrot: 0,
  tags: [],
  isPublic: false,
  imagePosterUrl: '',
  videos: [],
  videoCount: 0,
  searchQuery: '',
  isLoading: false,
  isSelf: false,
  isEditVideo: false,
  isShowEmpty: false,
  userIsShow: null,
  isSubscribe: false,
  dynamicUrl: '',
  userSort: 80,
  maintainers: []
})

// 加载状态
const isLoadingInfo = ref(false)
const isLoadingMore = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const hasMoreVideos = ref(true)

// 搜索防抖定时器
let searchTimeout = null
let addVideoSearchTimeout = null

// 模态框状态
const modals = reactive({
  editWatch: false,
  addVideo: false,
  maintainer: false,
  sort: false,
  dynamic: false,
  editVideo: false
})

// 编辑片单表单
const editForm = reactive({
  id: null,
  name: '',
  description: '',
  carrot: 0,
  tags: [],
  isPublic: false,
  isShowEmpty: false,
  imagePosterUrl: ''  // 新 API：只使用 URL
})

const tagInput = ref('')
const addVideoSkeletonCount = 6
const detailVideoSkeletonCount = 6

// 添加视频搜索
const addVideoSearch = ref('')
const searchResults = ref([])
const selectedVideos = ref([])
const isLoadingVideos = ref(false)

// 维护者管理
const maintainerState = reactive({
  currentMaintainers: [],
  newUserId: '',
  isLoading: false
})

// 片单排序
const sortState = reactive({
  currentSort: 80
})

// 视频编辑表单
const videoEditForm = reactive({
  videoId: null,
  sort: 80,
  remark: ''
})

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

const closeAddVideoModal = () => {
  modals.addVideo = false
  addVideoSearch.value = ''
  searchResults.value = []
  selectedVideos.value = []
}

const closeMaintainerModal = () => {
  modals.maintainer = false
  maintainerState.currentMaintainers = []
  maintainerState.newUserId = ''
}

const closeSortModal = () => {
  modals.sort = false
  sortState.currentSort = 80
}

const closeDynamicModal = () => {
  modals.dynamic = false
}

const closeEditVideoModal = () => {
  modals.editVideo = false
  videoEditForm.videoId = null
  videoEditForm.sort = 80
  videoEditForm.remark = ''
}

// ================= 生命周期 =================
onMounted(() => {
  const watchId = route.params.id
  if (watchId) {
    detailState.id = watchId
    loadWatchlistInfo(watchId)
    loadWatchVideos()
    window.addEventListener('scroll', handleDetailScroll)
  } else {
    showToast('无效的片单ID', 'error')
    // 如果有历史记录，返回上一页；否则跳转到片单列表
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/watchlist')
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleDetailScroll)
  clearTimeout(searchTimeout)
  clearTimeout(addVideoSearchTimeout)
})

// keep-alive 激活时刷新数据
onActivated(() => {
  window.addEventListener('scroll', handleDetailScroll)
  // 如果路由参数变化，重新加载
  const watchId = route.params.id
  if (watchId && watchId !== detailState.id) {
    detailState.id = watchId
    loadWatchlistInfo(watchId)
    loadWatchVideos()
  }
})

onDeactivated(() => {
  window.removeEventListener('scroll', handleDetailScroll)
  clearTimeout(searchTimeout)
  clearTimeout(addVideoSearchTimeout)
})

// 监听账号切换，重新加载片单详情
watch(() => appStore.userInfo, (newUserInfo) => {
  if (newUserInfo && detailState.id) {
    // 切换账号后重新加载片单信息和视频列表
    loadWatchlistInfo(detailState.id)
    loadWatchVideos(true)
  }
}, { immediate: false })

// ================= 方法 =================

const applyWatchlistDetail = (watch = {}) => {
  detailState.name = watch.name || ''
  detailState.description = watch.description || ''
  detailState.carrot = watch.carrot || 0
  detailState.tags = Array.isArray(watch.tags) ? [...watch.tags] : []
  detailState.isPublic = Boolean(watch.is_public)
  detailState.imagePosterUrl = watch.image_poster_url || ''
  detailState.isSelf = Boolean(watch.is_self)
  detailState.isEditVideo = Boolean(watch.is_edit_video)
  detailState.isShowEmpty = Boolean(watch.is_show_empty)
  detailState.isSubscribe = Boolean(watch.is_subscribe)
  detailState.userIsShow = watch.user_is_show ?? (watch.is_subscribe ? true : null)
  detailState.dynamicUrl = watch.dynamic_url || ''
  detailState.videoCount = watch.video_count || 0
  detailState.userSort = watch.user_sort ?? 80
  detailState.maintainers = Array.isArray(watch.maintainers) ? [...watch.maintainers] : []
}

// 加载片单基本信息
const loadWatchlistInfo = async (watchId) => {
  isLoadingInfo.value = true
  try {
    const response = await watchlistApi.getList({ watch_id: watchId })
    const watch = response.items?.[0]

    if (!watch) {
      throw new Error('片单不存在或无权访问')
    }

    applyWatchlistDetail(watch)
  } catch (error) {
    console.error('加载片单信息失败:', error)
    showToast(error.message || '加载失败', 'error')
    // 如果有历史记录，返回上一页；否则跳转到片单列表
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/watchlist')
    }
  } finally {
    isLoadingInfo.value = false
  }
}

const handleDetailScroll = () => {
  if (detailState.isLoading || isLoadingMore.value || !hasMoreVideos.value) return

  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  if (scrollTop + windowHeight >= documentHeight - 240) {
    loadWatchVideos(false)
  }
}

// 加载片单视频
const loadWatchVideos = async (reset = true) => {
  if (!detailState.id) return
  
  if (reset) {
    detailState.isLoading = true
    currentPage.value = 1
    hasMoreVideos.value = true
  } else {
    if (!hasMoreVideos.value) return
    isLoadingMore.value = true
  }

  try {
    const response = await watchlistApi.getVideos(detailState.id, {
      page: currentPage.value,
      page_size: pageSize.value,
      video_title: detailState.searchQuery.trim() || undefined
    })
    const items = response.items || []
    const total = response.total ?? items.length

    if (reset) {
      detailState.videos = items
    } else {
      detailState.videos = [...detailState.videos, ...items]
    }

    detailState.videoCount = total
    hasMoreVideos.value = detailState.videos.length < total && items.length > 0

    if (hasMoreVideos.value) {
      currentPage.value += 1
    }
  } catch (error) {
    console.error('加载片单视频失败:', error)
    showToast(error.message || '加载失败', 'error')
  } finally {
    if (reset) {
      detailState.isLoading = false
    } else {
      isLoadingMore.value = false
    }
  }
}

// 返回片单列表
const backToList = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push('/watchlist')
}

// 跳转到视频详情
const goToVideoDetail = (video) => {
  router.push(`/media/${video.video_id}`)
}

// 处理搜索输入（防抖）
const handleDetailSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadWatchVideos(true)
  }, 300)
}

const loadAvailableVideos = async (title = '') => {
  isLoadingVideos.value = true
  try {
    const response = await watchlistApi.searchVideos(detailState.id, {
      title: title.trim() || undefined
    })
    searchResults.value = normalizeList(response)
  } catch (error) {
    console.error('加载可添加视频失败:', error)
    showToast(error.message || '加载失败', 'error')
  } finally {
    isLoadingVideos.value = false
  }
}

// 打开添加视频模态框
const openAddVideoModal = async () => {
  addVideoSearch.value = ''
  searchResults.value = []
  selectedVideos.value = []
  modals.addVideo = true
  await loadAvailableVideos()
}

// 搜索视频
const searchVideos = () => {
  clearTimeout(addVideoSearchTimeout)
  addVideoSearchTimeout = setTimeout(() => {
    loadAvailableVideos(addVideoSearch.value)
  }, 300)
}

// 切换视频选择
const toggleVideoSelection = (video) => {
  const index = selectedVideos.value.findIndex(v => v.video_id === video.video_id)
  if (index > -1) {
    selectedVideos.value.splice(index, 1)
  } else {
    selectedVideos.value.push(video)
  }
}

const isVideoSelected = (videoId) => {
  return selectedVideos.value.some((video) => video.video_id === videoId)
}

const addVideos = async () => {
  if (selectedVideos.value.length === 0) {
    showToast('请至少选择一个视频', 'warning')
    return
  }

  let successCount = 0
  let failCount = 0

  try {
    for (const video of selectedVideos.value) {
      try {
        await watchlistApi.addVideo(detailState.id, video.video_id, {
          sort: 80
        })
        successCount++
      } catch {
        failCount++
      }
    }

    if (successCount > 0) {
      showToast(`成功添加 ${successCount} 个视频${failCount > 0 ? `，${failCount} 个失败` : ''}`, successCount > 0 ? 'success' : 'error')
      modals.addVideo = false
      await loadWatchVideos(true)
    } else {
      showToast('添加失败', 'error')
    }
  } catch (error) {
    console.error('添加视频失败:', error)
    showToast(error.message || '添加失败', 'error')
  }
}

// 打开编辑片单模态框
const openEditModal = () => {
  editForm.id = detailState.id
  editForm.name = detailState.name
  editForm.description = detailState.description
  editForm.carrot = detailState.carrot
  editForm.tags = [...detailState.tags]
  editForm.isPublic = detailState.isPublic
  editForm.isShowEmpty = detailState.isShowEmpty
  editForm.imagePosterUrl = detailState.imagePosterUrl || ''  // 新 API：只使用 URL
  modals.editWatch = true
}

// 保存片单编辑
const saveWatchlist = async () => {
  if (!editForm.name.trim()) {
    showToast('请输入片单名称', 'warning')
    return
  }
  
  try {
    const payload = {
      id: editForm.id,
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      point: editForm.carrot ?? 0,
      tags: editForm.tags,
      is_public: editForm.isPublic,
      is_show_empty: editForm.isShowEmpty
    }

    if (editForm.imagePosterUrl) {
      payload.image_poster_url = editForm.imagePosterUrl  // 新 API：使用 URL
    }

    await watchlistApi.create(payload)
    
    showToast('片单已更新', 'success')
    modals.editWatch = false
    await loadWatchlistInfo(detailState.id)
  } catch (error) {
    console.error('更新片单失败:', error)
    showToast(error.message || '更新失败', 'error')
  }
}

// 标签管理
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

// 打开维护者管理模态框
const openMaintainerModal = () => {
  maintainerState.currentMaintainers = detailState.maintainers.map((maintainer) => ({ ...maintainer }))
  maintainerState.newUserId = ''
  maintainerState.isLoading = false
  modals.maintainer = true
}

// 添加维护者
const addMaintainer = () => {
  const userId = maintainerState.newUserId.trim()
  if (!userId) {
    showToast('请输入用户ID', 'warning')
    return
  }
  
  const exists = maintainerState.currentMaintainers.some(m => m.user_id === userId)
  if (exists) {
    showToast('该用户已是维护者', 'warning')
    return
  }
  
  maintainerState.currentMaintainers.push({
    user_id: userId,
    username: userId,
    avatar: null
  })
  
  maintainerState.newUserId = ''
  showToast('已添加维护者', 'success')
}

// 移除维护者
const removeMaintainer = (userId) => {
  maintainerState.currentMaintainers = maintainerState.currentMaintainers.filter(
    m => m.user_id !== userId
  )
  showToast('已移除维护者', 'success')
}

// 保存维护者
const saveMaintainers = async () => {
  try {
    const maintainerIds = maintainerState.currentMaintainers.map(m => m.user_id)
    await watchlistApi.updateMaintainer(detailState.id, maintainerIds)
    
    showToast('维护者更新成功', 'success')
    modals.maintainer = false
    await loadWatchlistInfo(detailState.id)
  } catch (error) {
    console.error('更新维护者失败:', error)
    showToast(error.message || '更新失败', 'error')
  }
}

// 打开片单排序模态框
const openSortModal = () => {
  sortState.currentSort = detailState.userSort ?? 80
  modals.sort = true
}

// 保存片单排序
const saveSort = async () => {
  if (sortState.currentSort < 1 || sortState.currentSort > 100) {
    showToast('排序值必须在1-100之间', 'warning')
    return
  }
  
  try {
    await watchlistApi.updateSort(detailState.id, sortState.currentSort)
    
    showToast('片单排序更新成功', 'success')
    modals.sort = false
    await loadWatchlistInfo(detailState.id)
  } catch (error) {
    console.error('更新片单排序失败:', error)
    showToast(error.message || '更新失败', 'error')
  }
}

// 打开动态片单设置模态框
const openDynamicModal = () => {
  modals.dynamic = true
}

// 保存动态片单设置
const saveDynamic = async () => {
  try {
    await watchlistApi.updateDynamic(detailState.id, detailState.dynamicUrl.trim())
    
    showToast(detailState.dynamicUrl ? '动态片单已启用' : '动态片单已关闭', 'success')
    modals.dynamic = false
    await loadWatchlistInfo(detailState.id)
  } catch (error) {
    console.error('设置动态片单失败:', error)
    showToast(error.message || '设置失败', 'error')
  }
}

// 切换片单可见性
const toggleSubscriptionVisibility = async () => {
  if (!detailState.id) return
  
  try {
    const response = await watchlistApi.toggleShow(detailState.id)
    detailState.userIsShow = response?.is_show ?? !detailState.userIsShow
    showToast(detailState.userIsShow ? '已显示订阅片单' : '已隐藏订阅片单', 'success')
    await loadWatchlistInfo(detailState.id)
  } catch (error) {
    console.error('切换片单可见性失败:', error)
    showToast(error.message || '操作失败', 'error')
  }
}

// 清空所有视频
const clearAllVideos = async () => {
  if (!detailState.id) return
  if (!(await confirmDialog('确定要清空所有视频吗？', '确认', true))) return

  try {
    await watchlistApi.emptyVideos(detailState.id)
    showToast('已清空所有视频', 'success')
    await loadWatchVideos()
  } catch (error) {
    console.error('清空视频失败:', error)
    showToast(error.message || '清空失败', 'error')
  }
}

// 删除片单
const deleteWatchlist = async () => {
  if (!detailState.id) return
  if (!(await confirmDialog('确定要删除该片单吗？此操作不可恢复！', '确认', true))) return

  try {
    await watchlistApi.delete(detailState.id)
    showToast('片单已删除', 'success')
    router.push('/watchlist')
  } catch (error) {
    console.error('删除片单失败:', error)
    showToast(error.message || '删除失败', 'error')
  }
}

// 打开视频编辑模态框
const openVideoEditModal = (video) => {
  videoEditForm.videoId = video.video_id
  videoEditForm.sort = video.sort || 80
  videoEditForm.remark = video.remark || ''
  modals.editVideo = true
}

// 保存视频编辑
const saveVideoEdit = async () => {
  if (videoEditForm.sort < 1 || videoEditForm.sort > 100) {
    showToast('排序值必须在1-100之间', 'warning')
    return
  }
  
  if (videoEditForm.remark && videoEditForm.remark.length > 100) {
    showToast('备注不能超过100字', 'warning')
    return
  }
  
  try {
    await watchlistApi.addVideo(detailState.id, videoEditForm.videoId, {
      sort: videoEditForm.sort,
      remark: videoEditForm.remark.trim() || null
    })
    
    showToast('视频信息已更新', 'success')
    modals.editVideo = false
    await loadWatchVideos(true)
  } catch (error) {
    console.error('更新视频失败:', error)
    showToast(error.message || '更新失败', 'error')
  }
}

// 删除视频
const removeVideo = async (videoId) => {
  if (!detailState.id) return
  if (!(await confirmDialog('确定要删除该视频吗？', '确认', true))) return

  try {
    await watchlistApi.deleteVideo(detailState.id, videoId)
    showToast('视频已删除', 'success')
    await loadWatchVideos(true)
  } catch (error) {
    console.error('删除视频失败:', error)
    showToast(error.message || '删除失败', 'error')
  }
}
</script>

<template>
  <div class="watchlist-detail-view">
    <!-- 第一行：左侧返回 + 右侧操作按钮组 -->
    <div class="detail-header-row">
      <div class="cloud-buttons">
        <button class="cloud-btn" @click="backToList" title="返回">
          <i class="fas fa-arrow-left"></i>
        </button>
      </div>
      
      <div v-if="detailState.isSubscribe || detailState.isSelf || detailState.isEditVideo" class="detail-actions-group">
        <template v-if="detailState.isEditVideo">
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="openAddVideoModal" title="添加视频">
              <i class="fas fa-plus-circle"></i>
            </button>
          </div>
        </template>
        
        <template v-if="detailState.isSelf">
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="openEditModal" title="编辑片单">
              <i class="fas fa-edit"></i>
            </button>
            <button class="cloud-btn" @click="openMaintainerModal" title="管理维护者">
              <i class="fas fa-user-shield"></i>
            </button>
            <button class="cloud-btn" @click="openDynamicModal" :title="detailState.dynamicUrl ? '编辑动态片单' : '设置动态片单'">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button class="cloud-btn cloud-btn--danger" @click="clearAllVideos" title="清空所有视频">
              <i class="fas fa-eraser"></i>
            </button>
            <button class="cloud-btn cloud-btn--danger" @click="deleteWatchlist" title="删除片单">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </template>

        <template v-if="detailState.isSubscribe">
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="openSortModal" title="片单排序">
              <i class="fas fa-sort-amount-down-alt"></i>
            </button>
            <button class="cloud-btn" @click="toggleSubscriptionVisibility" :title="detailState.userIsShow ? '隐藏订阅片单' : '显示订阅片单'">
              <i :class="detailState.userIsShow ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- 第二行：左侧标题 + 右侧资源数 -->
    <div class="detail-title-row">
      <h1 class="detail-title">{{ detailState.name }}</h1>
      <span class="video-count-badge">
        <i class="fas fa-film"></i> {{ detailState.videoCount }}
      </span>
    </div>

    <!-- 搜索框（仅可编辑视频时显示） -->
    <div v-if="detailState.isEditVideo" class="search-container">
      <i class="fas fa-search search-icon"></i>
      <input 
        type="text" 
        class="search-input" 
        v-model="detailState.searchQuery"
        @input="handleDetailSearchInput"
        placeholder="搜索片单内的影片..."
      >
    </div>

    <!-- 初次加载骨架 -->
    <div v-if="detailState.isLoading" class="video-list">
      <div
        v-for="i in detailVideoSkeletonCount"
        :key="`detail-skeleton-${i}`"
        class="video-item"
      >
        <div class="video-poster skeleton-cover"></div>
        <div class="video-info">
          <div class="skeleton-badge" style="width: 64px; margin-bottom: 10px;"></div>
          <div class="skeleton-text" style="width: 62%; height: 18px; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 48%; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 30%;"></div>
        </div>
        <div v-if="detailState.isEditVideo" class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="detailState.videos.length === 0" class="empty-state">
      <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.8rem; opacity: 0.4;"></i>
      <div style="font-size: 1rem; font-weight: 500;">暂无影片</div>
      <div v-if="detailState.isEditVideo" style="font-size: 0.85rem; color: var(--system-tertiary); margin-top: 0.3rem;">点击右上角「+」按钮添加影片</div>
    </div>

    <!-- 视频列表 -->
    <div v-else class="video-list">
      <div 
        v-for="video in detailState.videos" 
        :key="video.video_id"
        class="video-item"
        @click="goToVideoDetail(video)"
      >
        <div class="video-poster">
          <img :src="video.video_image_poster || `https://picsum.photos/seed/${video.video_id}/200/300`" 
            alt=""
           loading="lazy">
        </div>
        <div class="video-info">
          <div class="video-type-badge">{{ video.video_type === 'tv' ? '电视剧' : '电影' }}</div>
          <div class="video-title">{{ video.video_title }}</div>
          <div class="video-origin-title">{{ video.video_origin_title }}</div>
          <div v-if="video.remark" class="video-remark">{{ video.remark }}</div>
        </div>
        <div v-if="detailState.isEditVideo" class="video-actions" @click.stop>
          <div class="cloud-buttons">
            <button class="cloud-btn cloud-btn--sm" @click="openVideoEditModal(video)" title="编辑视频">
              <i class="fas fa-edit"></i>
            </button>
            <button class="cloud-btn cloud-btn--sm cloud-btn--danger" @click="removeVideo(video.video_id)" title="删除视频">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="isLoadingMore"
        v-for="i in Math.min(pageSize, Math.max(detailState.videoCount - detailState.videos.length, 1))"
        :key="`detail-loading-more-${i}`"
        class="video-item"
      >
        <div class="video-poster skeleton-cover"></div>
        <div class="video-info">
          <div class="skeleton-badge" style="width: 64px; margin-bottom: 10px;"></div>
          <div class="skeleton-text" style="width: 62%; height: 18px; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 48%; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 30%;"></div>
        </div>
        <div v-if="detailState.isEditVideo" class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 编辑片单模态框 -->
    <BaseModal :visible="modals.editWatch" title="编辑片单" @close="closeEditWatchModal">
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
        <input 
          type="text" 
          class="modal-input"
          v-model="tagInput"
          @keypress="addTag"
          placeholder="输入标签..."
        >
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
        ><div class="toggle-slider"></div></div>
      </div>

      <div class="toggle-row">
        <span class="form-label" style="margin:0">显示空媒体</span>
        <div 
          :class="['toggle-switch', { active: editForm.isShowEmpty }]"
          @click="editForm.isShowEmpty = !editForm.isShowEmpty"
        ><div class="toggle-slider"></div></div>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeEditWatchModal">取消</button>
        <button class="modal-btn primary" @click="saveWatchlist">保存</button>
      </template>
    </BaseModal>

    <!-- 添加视频模态框 -->
    <BaseModal :visible="modals.addVideo" title="添加视频" size="xl" @close="closeAddVideoModal">
      <div class="form-group">
        <input 
          type="text" 
          class="modal-input" 
          v-model="addVideoSearch"
          @input="searchVideos"
          placeholder="搜索未加入片单的视频..."
        >
      </div>

      <div v-if="isLoadingVideos" class="video-select-list">
        <div
          v-for="i in addVideoSkeletonCount"
          :key="`add-video-skeleton-${i}`"
          class="video-select-item"
        >
          <div class="video-poster skeleton-cover"></div>
          <div class="video-info">
            <div class="skeleton-text" style="width: 68%; height: 18px; margin-bottom: 10px;"></div>
            <div class="skeleton-text-sm" style="width: 52%;"></div>
          </div>
          <div class="select-checkbox">
            <div class="skeleton-circle" style="width: 22px; height: 22px;"></div>
          </div>
        </div>
      </div>

      <div v-else-if="searchResults.length === 0" class="empty-state">
        <i class="fas fa-search" style="font-size: 2rem; opacity: 0.3;"></i>
        <div>{{ addVideoSearch ? '未找到相关视频' : '暂无可添加视频' }}</div>
      </div>

      <div v-else class="video-select-list">
        <div 
          v-for="video in searchResults" 
          :key="video.video_id"
          :class="['video-select-item', { selected: isVideoSelected(video.video_id) }]"
          @click="toggleVideoSelection(video)"
        >
          <div class="video-poster">
            <img :src="video.video_image_poster || 'https://picsum.photos/seed/' + video.video_id + '/200/300'" alt="" loading="lazy">
          </div>
          <div class="video-info">
            <div class="video-title">{{ video.video_title }}</div>
            <div class="video-origin-title">{{ video.video_origin_title }}</div>
          </div>
          <div class="select-checkbox">
            <i v-if="isVideoSelected(video.video_id)" class="fas fa-check-circle"></i>
            <i v-else class="far fa-circle"></i>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeAddVideoModal">取消</button>
        <button class="modal-btn primary" @click="addVideos" :disabled="selectedVideos.length === 0">
          {{ selectedVideos.length > 0 ? `添加（${selectedVideos.length}）` : '添加' }}
        </button>
      </template>
    </BaseModal>

    <!-- 维护者管理模态框 -->
    <BaseModal :visible="modals.maintainer" title="管理维护者" @close="closeMaintainerModal">
      <div v-if="maintainerState.isLoading" class="loading-state loading-state--sm">
        <i class="fas fa-circle-notch fa-spin"></i>
        </div>
      <template v-else>
        <div class="form-group">
          <label class="form-label">当前维护者 ({{ maintainerState.currentMaintainers.length }})</label>
          <div class="maintainer-list">
            <div 
              v-for="maintainer in maintainerState.currentMaintainers" 
              :key="maintainer.user_id"
              class="maintainer-item"
            >
              <div class="maintainer-avatar">
                <img v-if="maintainer.avatar" :src="maintainer.avatar" :alt="maintainer.username" loading="lazy">
                <i v-else class="fas fa-user"></i>
              </div>
              <div class="maintainer-info">
                <div class="maintainer-name">{{ maintainer.username }}</div>
                <div class="maintainer-id">{{ maintainer.user_id }}</div>
              </div>
              <button class="remove-maintainer-btn" @click="removeMaintainer(maintainer.user_id)">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div v-if="maintainerState.currentMaintainers.length === 0" class="empty-maintainers">
              暂无维护者
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">添加维护者</label>
          <div style="display: flex; gap: 8px;">
            <input 
              type="text" 
              class="modal-input"
              v-model="maintainerState.newUserId"
              @keyup.enter="addMaintainer"
              placeholder="输入用户ID..."
              style="flex: 1;"
            >
            <button class="btn-subtle" @click="addMaintainer" style="width: 38px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="modal-btn secondary" @click="closeMaintainerModal">取消</button>
        <button class="modal-btn primary" @click="saveMaintainers">保存</button>
      </template>
    </BaseModal>

    <!-- 片单排序模态框 -->
    <BaseModal :visible="modals.sort" title="片单排序" size="sm" @close="closeSortModal">
      <div class="form-group">
        <label class="form-label">排序</label>
        <input 
          type="number" 
          class="modal-input"
          v-model.number="sortState.currentSort"
          placeholder="1-100，越小越靠前"
          min="1"
          max="100"
        >
        <div class="form-hint">
          排序范围：1-100，默认80，数值越小越靠前
        </div>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeSortModal">取消</button>
        <button class="modal-btn primary" @click="saveSort">保存</button>
      </template>
    </BaseModal>

    <!-- 动态片单设置模态框 -->
    <BaseModal :visible="modals.dynamic" title="设置动态片单" @close="closeDynamicModal">
      <div class="form-group">
        <label class="form-label">抓取地址</label>
        <input 
          type="text" 
          class="modal-input"
          v-model="detailState.dynamicUrl"
          placeholder="输入动态抓取URL，留空则关闭此功能"
        >
        <div class="form-hint">
          留空将关闭动态抓取功能，设置后将自动从指定地址同步视频
        </div>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeDynamicModal">取消</button>
        <button class="modal-btn primary" @click="saveDynamic">保存</button>
      </template>
    </BaseModal>

    <!-- 编辑视频模态框 -->
    <BaseModal :visible="modals.editVideo" title="编辑视频" size="md" @close="closeEditVideoModal">
      <div class="form-group">
        <label class="form-label">排序</label>
        <input 
          type="number" 
          class="modal-input"
          v-model.number="videoEditForm.sort"
          min="1"
          max="100"
          placeholder="1-100，越小越靠前"
        >
        <div class="form-hint">
          排序范围：1-100，默认80，数值越小越靠前
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea 
          class="modal-input modal-textarea"
          v-model="videoEditForm.remark"
          maxlength="100"
          rows="3"
          placeholder="可选，最多100字"
        ></textarea>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeEditVideoModal">取消</button>
        <button class="modal-btn primary" @click="saveVideoEdit">保存</button>
      </template>
    </BaseModal>
  </div>
</template>

