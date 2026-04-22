<script setup>
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import videoApi from '@/api/videoApi.js'
import watchlistApi from '@/api/watchlistApi.js'
import liveApi from '@/api/liveApi.js'
import seekApi from '@/api/seekApi.js'
import { escapeHtml } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import ImageUploader from '@/components/ImageUploader.vue'

const router = useRouter()

// 状态
const currentView = ref('video') // 'video' | 'live'
const searchQuery = ref('')
const isLoading = ref(false)
const isSearching = ref(false) // 标记是否正在搜索
const videos = ref([])
const liveChannels = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)

// 直播状态
const livePage = ref(1)
const liveHasMore = ref(true)
const liveLoading = ref(false)

// ✅ 搜索防抖定时器
let searchTimeout = null

// 片单相关状态
const showPlaylistModal = ref(false)
const playlists = ref([])
const selectedPlaylistIds = ref([])  // ✅ 改为数组，支持多选
const currentVideoForPlaylist = ref(null)
const playlistLoading = ref(false)

// 新增频道相关状态
const showAddChannelModal = ref(false)
const liveLibraries = ref([])
const channelForm = ref({
  id: null,
  live_library_id: '',
  title: '',
  description: '',
  tagline: '',
  image_poster: ''
})
const isSubmittingChannel = ref(false)

// 显示片单选择模态框
const showPlaylistSelectionModal = async (video) => {
  currentVideoForPlaylist.value = video
  selectedPlaylistIds.value = []
  showPlaylistModal.value = true
  
  await loadPlaylists()
}

// 显示新增频道模态框
const showAddChannelModalFunc = async () => {
  // 先加载直播库列表
  await loadLiveLibraries()
  
  // 重置表单
  channelForm.value = {
    id: null,
    live_library_id: liveLibraries.value.length > 0 ? liveLibraries.value[0].id : '',
    title: '',
    description: '',
    tagline: '',
    image_poster: ''
  }
  
  showAddChannelModal.value = true
}

// 加载直播库列表
const loadLiveLibraries = async () => {
  try {
    const response = await liveApi.getLibrary()
    // API 返回的是数组格式: [{ id, title, image_poster_url }]
    if (Array.isArray(response)) {
      liveLibraries.value = response.map(lib => ({
        id: lib.id,
        name: lib.title || lib.name  // 兼容 title 和 name 字段
      }))
    } else {
      liveLibraries.value = []
    }
  } catch (error) {
    console.error('加载直播库列表失败:', error)
    showToast('加载直播库列表失败', 'error')
  }
}

// 关闭新增频道模态框
const closeAddChannelModal = () => {
  showAddChannelModal.value = false
  channelForm.value = {
    id: null,
    live_library_id: '',
    title: '',
    description: '',
    tagline: '',
    image_poster: ''
  }
}

// 提交新增频道
const submitChannel = async () => {
  // 验证必填字段
  if (!channelForm.value.live_library_id) {
    showToast('请选择直播库', 'warning')
    return
  }
  
  if (!channelForm.value.title || !channelForm.value.title.trim()) {
    showToast('请输入频道标题', 'warning')
    return
  }
  
  isSubmittingChannel.value = true
  
  try {
    // 准备请求数据
    const requestData = {
      id: channelForm.value.id,
      live_library_id: channelForm.value.live_library_id,
      title: channelForm.value.title.trim(),
      description: channelForm.value.description.trim() || null,
      tagline: channelForm.value.tagline.trim() || null,
      image_poster: channelForm.value.image_poster.trim() || null
    }
    
    await liveApi.createOrUpdateChannel(requestData)
    
    showToast('频道添加成功', 'success')
    
    // 关闭模态框
    closeAddChannelModal()
    
    // 重新加载直播频道列表
    livePage.value = 1
    liveChannels.value = []
    liveHasMore.value = true
    await loadLiveChannels()
  } catch (error) {
    console.error('添加频道失败:', error)
    showToast(error.message || '添加频道失败', 'error')
  } finally {
    isSubmittingChannel.value = false
  }
}

// 加载片单列表
const loadPlaylists = async () => {
  playlistLoading.value = true
  try {
    const response = await watchlistApi.getList()
    playlists.value = response.items || []
  } catch (error) {
    console.error('加载片单失败:', error)
    showToast('加载片单失败', 'error')
  } finally {
    playlistLoading.value = false
  }
}

// 确认添加到片单
const confirmAddToPlaylist = async () => {
  if (selectedPlaylistIds.value.length === 0 || !currentVideoForPlaylist.value) {
    showToast('请至少选择一个片单', 'warning')
    return
  }
  
  try {
    // ✅ 批量添加到选中的片单
    const promises = selectedPlaylistIds.value.map(watchId => 
      watchlistApi.addVideo(watchId, {
        video_id: currentVideoForPlaylist.value.video_id,
        sort: 80
      })
    )
    
    await Promise.all(promises)
    
    showToast(`已成功添加到 ${selectedPlaylistIds.value.length} 个片单`, 'success')
    showPlaylistModal.value = false
  } catch (error) {
    console.error('添加到片单失败:', error)
    showToast('添加失败，请重试', 'error')
  }
}

// 关闭片单模态框
const closePlaylistModal = () => {
  showPlaylistModal.value = false
  selectedPlaylistIds.value = []  // ✅ 清空选中列表
  currentVideoForPlaylist.value = null
}

// 切换视图
const switchView = (view) => {
  currentView.value = view
  searchQuery.value = ''
  currentPage.value = 1
  
  if (view === 'video') {
    loadVideos()
  } else {
    loadLiveChannels()
  }
}

// 跳转到直播频道详情页
const goToLiveChannelDetail = (channel) => {
  router.push(`/live/${channel.id}`)
}
const loadVideos = async (reset = true) => {
  if (isLoading.value) return
  if (!reset && !hasMore.value) return
  
  if (reset) {
    currentPage.value = 1
    // 不在这里清空 videos，等待 API 返回后再替换
  }
  
  isLoading.value = true
  
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize.value
    }
    
    // ✅ 根据搜索内容判断是 TMDB ID 还是标题
    if (searchQuery.value) {
      if (/^\d+$/.test(searchQuery.value)) {
        // 纯数字：作为 TMDB ID
        params.tmdb_id = searchQuery.value
      } else {
        // 文本：作为标题搜索
        params.title = searchQuery.value
      }
    }
    
    const response = await videoApi.list(params)
    
    if (reset) {
      // API 返回后再清空并替换数据
      videos.value = response.items || []
    } else {
      videos.value = [...videos.value, ...(response.items || [])]
    }
    
    // ✅ 兼容处理：如果 has_more 为 undefined，根据返回数据判断
    if (response.has_more !== undefined) {
      hasMore.value = response.has_more
    } else if (response.total !== undefined) {
      // 如果有 total 字段，计算是否还有更多
      const totalPages = Math.ceil(response.total / pageSize.value)
      hasMore.value = currentPage.value < totalPages
    } else {
      // 如果都没有，根据返回的数据量判断
      hasMore.value = (response.items?.length || 0) === pageSize.value
    }
    
    // ✅ 如果还有更多数据，递增页码
    if (hasMore.value) {
      currentPage.value++
    }
  } catch (error) {
    showToast('加载视频失败: ' + error.message, 'error')
  } finally {
    isLoading.value = false
    isSearching.value = false // 清除搜索状态
  }
}

// 生成骨架屏数组
const generateSkeletonArray = (count) => {
  return Array.from({ length: count }, (_, i) => i)
}

// 加载直播频道
const loadLiveChannels = async (reset = true) => {
  if (liveLoading.value) return
  if (!reset && !liveHasMore.value) return
  
  if (reset) {
    livePage.value = 1
    // 不在这里清空 liveChannels，等待 API 返回后再替换
  }
  
  liveLoading.value = true
  
  try {
    const params = {
      page: livePage.value,
      page_size: pageSize.value,
    }
    
    if (searchQuery.value) {
      params.title = searchQuery.value
    }
    
    const response = await liveApi.getChannelList()
    
    const channels = response.items || []
    
    if (reset) {
      // API 返回后再清空并替换数据
      liveChannels.value = channels
    } else {
      liveChannels.value = [...liveChannels.value, ...channels]
    }
    
    const totalPages = response.total ? Math.ceil(response.total / pageSize.value) : 0
    liveHasMore.value = livePage.value < totalPages
    
    if (liveHasMore.value) {
      livePage.value++
    }
  } catch (error) {
    console.error('加载直播频道失败:', error)
    showToast('加载直播频道失败', 'error')
  } finally {
    liveLoading.value = false
    isSearching.value = false // 清除搜索状态
  }
}

// 解析频道编码，提取前缀和数字
const parseChannelCode = (code) => {
  if (!code) return { prefix: '', number: '' }
  const prefix = code.replace(/[0-9]+/g, '')  // 提取字母前缀
  const number = code.replace(/[^0-9]/g, '')  // 提取数字
  return { prefix, number }
}

// 将前缀中的第一个字母变为红色（CCTV风格）
const formatChannelPrefix = (prefix) => {
  if (!prefix) return ''
  return prefix.replace(/^([A-Z])/, '<span class="red-c">$1</span>')
}

// 获取高清图片 URL
const getOriginalImageUrl = (url) => {
  if (!url) return null
  // 将 /w500/ 或 /original/ 等替换为 /original/
  return url.replace(/\/w\d+\//, '/original/')
}

// 搜索（防抖）
const handleSearchInput = () => {
  // 清除之前的定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  // ✅ 500ms 后执行搜索（等待输入法完成）
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    livePage.value = 1
    isSearching.value = true // 标记为搜索状态
    if (currentView.value === 'video') {
      loadVideos()
    } else {
      loadLiveChannels()
    }
  }, 500)
}

// 搜索（Enter 键）
const handleSearch = () => {
  currentPage.value = 1
  livePage.value = 1
  isSearching.value = true // 标记为搜索状态
  if (currentView.value === 'video') {
    loadVideos()
  } else {
    loadLiveChannels()
  }
}

// 无限滚动
const handleScroll = () => {
  const scrollContainer = window._mediaScrollContainer || window
  
  let scrollHeight, scrollTop, clientHeight
  
  if (scrollContainer === window) {
    // window 作为滚动容器
    scrollHeight = document.documentElement.scrollHeight
    scrollTop = window.scrollY || document.documentElement.scrollTop
    clientHeight = window.innerHeight
  } else {
    // 元素作为滚动容器
    scrollHeight = scrollContainer.scrollHeight
    scrollTop = scrollContainer.scrollTop
    clientHeight = scrollContainer.clientHeight
  }
  
  const distanceToBottom = scrollHeight - scrollTop - clientHeight
  
  if (distanceToBottom < 200) {
    if (currentView.value === 'video' && hasMore.value && !isLoading.value) {
      loadVideos(false)
    } else if (currentView.value === 'live' && liveHasMore.value && !liveLoading.value) {
      loadLiveChannels(false)
    }
  }
}

// 跳转到详情页
const goToDetail = (videoId) => {
  router.push(`/media/${videoId}`)
}

// 求片功能
const handleSeekRequest = async (video) => {
  try {
    const response = await seekApi.apply('vl', video.video_id)
    
    if (response.seek_is_request) {
      video.seek_is_request = true
      showToast('求片成功', 'success')
    } else {
      video.seek_is_request = false
      showToast('已取消求片', 'info')
    }
  } catch (error) {
    console.error('求片操作失败:', error)
    showToast('求片操作失败', 'error')
  }
}

// 提取年份
const extractYear = (dateString) => {
  if (!dateString) return ''
  return dateString.substring(0, 4)
}

// HTML 转义


onMounted(() => {
  loadVideos()
  
  // 添加滚动监听（只添加一次）
  const scrollContainer = document.querySelector('.main-content') || window
  scrollContainer.addEventListener('scroll', handleScroll)
  window._mediaScrollContainer = scrollContainer
})

// keep-alive 激活时 - 重新添加滚动监听
onActivated(() => {
  // 检查当前的滚动容器是否仍然有效
  const currentContainer = document.querySelector('.main-content') || window
  const cachedContainer = window._mediaScrollContainer
  
  // 如果容器改变了，需要重新绑定监听器
  if (currentContainer !== cachedContainer) {
    // 移除旧的监听器
    if (cachedContainer) {
      cachedContainer.removeEventListener('scroll', handleScroll)
    }
    
    // 添加新的监听器
    currentContainer.addEventListener('scroll', handleScroll)
    window._mediaScrollContainer = currentContainer
  } else {
    // 容器未变，直接添加监听器
    currentContainer.addEventListener('scroll', handleScroll)
  }
})

// keep-alive 停用时 - 移除滚动监听（防止页面切换时触发）
onDeactivated(() => {
  // 移除滚动监听，防止页面切换时触发
  const scrollContainer = window._mediaScrollContainer || window
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  // 移除滚动事件监听（备用）
  const scrollContainer = window._mediaScrollContainer || window
  scrollContainer.removeEventListener('scroll', handleScroll)
  delete window._mediaScrollContainer
  
  // ✅ 清理搜索防抖定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>

<template>
  <!-- MainLayout 已提供 main-wrapper -->
  <header class="page-header">
    <h1 class="page-title">媒体管理</h1>
    <p class="page-subtitle">管理影视资源和直播频道</p>
  </header>
    
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-group">
        <button 
          class="filter-chip" 
          :class="{ active: currentView === 'video' }"
          @click="switchView('video')"
        >
          <i class="fas fa-film"></i> 影视
        </button>
        <button 
          class="filter-chip" 
          :class="{ active: currentView === 'live' }"
          @click="switchView('live')"
        >
          <i class="fas fa-broadcast-tower"></i> 直播
        </button>
      </div>
      
      <!-- 搜索框 -->
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input 
          type="text" 
          v-model="searchQuery"
          @input="handleSearchInput"
          @keyup.enter="handleSearch"
          placeholder="搜索标题或 TMDB ID..." 
          class="search-input"
        />
      </div>
      
      <!-- 新增频道按钮 -->
      <button 
        v-if="currentView === 'live'"
        class="action-btn-primary" 
        style="width: 38px; height: 38px; font-size: 0.9rem;"
        title="新增频道"
        @click="showAddChannelModalFunc"
      >
        <i class="fas fa-plus"></i>
      </button>
    </div>

    <!-- 影视视图 -->
    <div v-if="currentView === 'video'" id="videoView" class="view-container">
      <!-- 视频网格（始终显示，包含骨架屏） -->
      <div 
        id="videoListContainer" 
        class="video-grid" 
        style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem;"
      >
        <!-- 首次加载或搜索时显示骨架屏 -->
        <template v-if="isLoading && (videos.length === 0 || isSearching)">
          <div 
            v-for="i in generateSkeletonArray(pageSize)" 
            :key="'skeleton-' + i"
            class="skeleton-card-wrapper"
          >
            <div class="skeleton-card">
              <div class="skeleton-poster"></div>
            </div>
            <div class="skeleton-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-year"></div>
            </div>
          </div>
        </template>
        
        <!-- 视频卡片 -->
        <template v-else-if="!isSearching">
          <div 
            v-for="video in videos"
            :key="video.video_id"
            class="video-card-wrapper"
            style="cursor: pointer;"
            @click="goToDetail(video.video_id)"
          >
          <!-- 海报图容器 -->
          <div class="video-card">
            <div class="video-poster-wrapper">
              <img v-if="video.video_image_poster" 
                :src="getOriginalImageUrl(video.video_image_poster)" 
                :alt="escapeHtml(video.video_title)"
                class="video-poster"
                @error="$event.target.style.display='none'"
               loading="lazy">
              <div v-else class="video-poster" style="display: flex; align-items: center; justify-content: center; background: var(--bg-input);">
                <i class="fas fa-film" style="font-size: 2.5rem; color: var(--text-tertiary);"></i>
              </div>
              
              <!-- 收藏按钮 - 右下角 -->
              <button 
                class="video-favorite-btn" 
                :data-video-id="video.video_id"
                title="收藏"
                @click.stop="showPlaylistSelectionModal(video)"
              >
                <i class="fas fa-star"></i>
              </button>
              
              <!-- 求片按钮 - 左下角 -->
              <button 
                class="video-like-btn" 
                :class="{ active: video.seek_is_request }"
                :data-video-id="video.video_id"
                title="求片"
                @click.stop="handleSeekRequest(video)"
              >
                <i class="fas fa-heart"></i>
              </button>
            </div>
          </div>
          
          <!-- 信息 - 海报图下方居中 -->
          <div class="video-info">
            <div class="video-title">{{ escapeHtml(video.video_title) }}</div>
            <div class="video-year">{{ extractYear(video.video_date_air) }}</div>
          </div>
        </div>
        </template>
        
        <!-- 加载更多骨架屏 -->
        <template v-if="isLoading && videos.length > 0">
          <div 
            v-for="i in generateSkeletonArray(pageSize)" 
            :key="'skeleton-more-' + i"
            class="skeleton-card-wrapper"
          >
            <div class="skeleton-card">
              <div class="skeleton-poster"></div>
            </div>
            <div class="skeleton-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-year"></div>
            </div>
          </div>
        </template>
      </div>
      
      <!-- 空状态 -->
      <div 
        v-if="!isLoading && videos.length === 0"
        id="videoEmptyState" 
        style="text-align: center; padding: 4rem 2rem;"
      >
        <i class="fas fa-film" style="font-size: 3rem; color: var(--text-tertiary); margin-bottom: 1rem;"></i>
        <p style="color: var(--text-secondary); font-size: 1rem;">
          {{ searchQuery ? '没有找到匹配的视频' : '暂无影视资源' }}
        </p>
      </div>
    </div>

    <!-- 直播视图 -->
    <div v-else id="liveView" class="view-container">
      <!-- 直播频道网格（始终显示，包含骨架屏） -->
      <div 
        id="liveChannelList" 
        class="live-grid" 
        style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.2rem;"
      >
        <!-- 首次加载或搜索时显示骨架屏 -->
        <template v-if="liveLoading && (liveChannels.length === 0 || isSearching)">
          <div 
            v-for="i in generateSkeletonArray(pageSize)" 
            :key="'skeleton-live-' + i"
            class="skeleton-live-card-wrapper"
          >
            <div class="skeleton-live-card">
              <div class="skeleton-live-logo"></div>
              <div class="skeleton-live-info">
                <div class="skeleton-live-title"></div>
                <div class="skeleton-live-meta"></div>
              </div>
            </div>
          </div>
        </template>
        
        <!-- 直播频道卡片 -->
        <template v-else-if="!isSearching">
          <div 
            v-for="channel in liveChannels"
            :key="channel.id || channel.code"
            class="live-channel-card"
            @click="goToLiveChannelDetail(channel)"
          >
          <!-- Logo容器 -->
          <div class="live-logo-container">
            <img v-if="channel.image_poster_url || channel.image_poster" 
              :src="getOriginalImageUrl(channel.image_poster_url || channel.image_poster)" 
              :alt="escapeHtml(channel.title)"
              @error="$event.target.style.display='none'; $event.target.nextElementSibling.style.display='flex'"
             loading="lazy">
            <!-- 回退：CCTV风格台标 -->
            <div class="live-logo-fallback" style="display: none; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; height: 100%;">
              <div class="live-logo-badge">
                <span class="live-logo-prefix" v-html="formatChannelPrefix(parseChannelCode(channel.code || channel.title).prefix)"></span>
                <span class="live-logo-number-badge">{{ parseChannelCode(channel.code || channel.title).number }}</span>
              </div>
              <div class="live-logo-channel-name">综合</div>
            </div>
          </div>
          
          <!-- 频道信息 -->
          <div class="live-channel-info">
            <div class="live-channel-title">{{ escapeHtml(channel.title) }}</div>
            <div v-if="channel.tagline" class="live-channel-tagline">{{ escapeHtml(channel.tagline) }}</div>
            <div v-if="channel.description" class="live-channel-desc">{{ escapeHtml(channel.description) }}</div>
            <div class="live-channel-meta">
              <span><i class="fas fa-tv"></i> {{ channel.media_count || 0 }} 个节目</span>
            </div>
          </div>
        </div>
        </template>
        
        <!-- 加载更多骨架屏 -->
        <template v-if="liveLoading && liveChannels.length > 0">
          <div 
            v-for="i in generateSkeletonArray(pageSize)" 
            :key="'skeleton-live-more-' + i"
            class="skeleton-live-card-wrapper"
          >
            <div class="skeleton-live-card">
              <div class="skeleton-live-logo"></div>
              <div class="skeleton-live-info">
                <div class="skeleton-live-title"></div>
                <div class="skeleton-live-meta"></div>
              </div>
            </div>
          </div>
        </template>
      </div>
      
      <!-- 空状态 -->
      <div 
        v-if="!liveLoading && liveChannels.length === 0"
        id="liveEmptyState" 
        style="text-align: center; padding: 4rem 2rem;"
      >
        <i class="fas fa-broadcast-tower" style="font-size: 3rem; color: var(--text-tertiary); margin-bottom: 1rem;"></i>
        <p style="color: var(--text-secondary); font-size: 1rem;">
          {{ searchQuery ? '没有找到匹配的频道' : '暂无直播频道' }}
        </p>
      </div>
    </div>

    <!-- 片单选择模态框 -->
    <div v-if="showPlaylistModal" class="modal-overlay show" @click.self="closePlaylistModal">
      <div class="modal-content lg">
        <div class="modal-header">
          <span class="modal-title">添加到片单</span>
          <button class="modal-close" @click="closePlaylistModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 16px;">
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px;">
              视频：{{ currentVideoForPlaylist?.video_title }}
            </p>
          </div>
          
          <!-- 加载状态 -->
          <div v-if="playlistLoading" style="max-height: 400px; overflow-y: auto;">
            <div v-for="i in 5" :key="i" class="skeleton-playlist-item" style="display: flex; align-items: center; padding: 12px; border-radius: 12px; margin-bottom: 8px;">
              <div style="width: 18px; height: 18px; border-radius: 4px; margin-right: 12px; background: linear-gradient(90deg, var(--bg-input) 0%, color-mix(in srgb, var(--bg-input) 40%, white) 50%, var(--bg-input) 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;"></div>
              <div style="flex: 1;">
                <div style="height: 16px; border-radius: 4px; margin-bottom: 8px; background: linear-gradient(90deg, var(--bg-input) 0%, color-mix(in srgb, var(--bg-input) 40%, white) 50%, var(--bg-input) 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;"></div>
                <div style="height: 12px; width: 40%; border-radius: 4px; background: linear-gradient(90deg, var(--bg-input) 0%, color-mix(in srgb, var(--bg-input) 40%, white) 50%, var(--bg-input) 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;"></div>
              </div>
            </div>
          </div>
          
          <!-- 片单列表 -->
          <div v-else style="max-height: 400px; overflow-y: auto;">
            <label
              v-for="playlist in playlists" 
              :key="playlist.id"
              class="playlist-item"
            >
              <input 
                type="checkbox" 
                class="playlist-checkbox"
                :value="playlist.id" 
                v-model="selectedPlaylistIds"
              >
              <div class="playlist-info">
                <div class="playlist-name">{{ playlist.name }}</div>
                <div class="playlist-meta">
                  {{ playlist.is_public ? '公开' : '私有' }} · {{ playlist.video_count || 0 }} 个视频
                </div>
              </div>
            </label>
            
            <!-- 空状态 -->
            <div v-if="playlists.length === 0" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
              <i class="fas fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
              <p>暂无片单</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="closePlaylistModal">
            取消
          </button>
          <button 
            class="modal-btn primary" 
            @click="confirmAddToPlaylist"
            :disabled="selectedPlaylistIds.length === 0"
          >
            确认添加
          </button>
        </div>
      </div>
    </div>

    <!-- 新增频道模态框 -->
    <div v-if="showAddChannelModal" class="modal-overlay show" @click.self="closeAddChannelModal">
      <div class="modal-content lg">
        <div class="modal-header">
          <span class="modal-title">新增直播频道</span>
          <button class="modal-close" @click="closeAddChannelModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- 直播库选择 -->
          <div class="form-group">
            <label class="form-label">直播库</label>
            <select 
              v-model="channelForm.live_library_id"
              class="modal-input"
            >
              <option value="">请选择直播库</option>
              <option 
                v-for="lib in liveLibraries" 
                :key="lib.id" 
                :value="lib.id"
              >
                {{ lib.name }}
              </option>
            </select>
          </div>
        
          <!-- 频道标题 -->
          <div class="form-group">
            <label class="form-label">频道标题</label>
            <input 
              v-model="channelForm.title" 
              class="modal-input" 
              type="text" 
              placeholder="请输入频道标题" 
            />
          </div>
        
          <!-- 宣传词 -->
          <div class="form-group">
            <label class="form-label">宣传词</label>
            <input 
              v-model="channelForm.tagline" 
              class="modal-input" 
              type="text" 
              placeholder="请输入宣传词（可选）" 
            />
          </div>
        
          <!-- 简介 -->
          <div class="form-group">
            <label class="form-label">简介</label>
            <textarea 
              v-model="channelForm.description" 
              class="modal-textarea" 
              placeholder="请输入频道简介（可选）" 
              rows="3"
            ></textarea>
          </div>
        
          <!-- 封面图片上传 -->
          <div class="form-group">
            <label class="form-label">封面图片</label>
            <ImageUploader
              :model-value="channelForm.image_poster"
              @update:model-value="(val) => channelForm.image_poster = val"
              :max-size="5 * 1024 * 1024"
              placeholder-text="点击上传封面"
              hint-text="支持 JPG、PNG，≤5MB"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="closeAddChannelModal">
            取消
          </button>
          <button 
            class="modal-btn primary" 
            @click="submitChannel"
            :disabled="isSubmittingChannel"
          >
            <i v-if="isSubmittingChannel" class="fas fa-spinner fa-spin"></i>
            <span v-else>确认添加</span>
          </button>
        </div>
      </div>
    </div>
</template>

<style scoped>
/* 搜索框样式 */
/* 视频卡片样式 */
.video-card-wrapper {
  cursor: pointer;
}

.video-card {
  position: relative;
  border-radius: 24px;
  overflow: visible;
  transition: transform 0.3s var(--spring, cubic-bezier(0.34, 1.56, 0.64, 1)), box-shadow 0.3s var(--spring, cubic-bezier(0.34, 1.56, 0.64, 1));
}

.video-card-wrapper:hover .video-card {
  transform: translateY(-4px);
}

.video-poster-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 2/3;
  overflow: hidden;
  border-radius: 24px;
  background: var(--bg-input);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.3s var(--spring, cubic-bezier(0.34, 1.56, 0.64, 1));
}

.video-card-wrapper:hover .video-poster-wrapper {
  box-shadow: var(--shadow-lg);
}

.video-poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 收藏按钮 - 右下角 */
.video-favorite-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 1rem;
  transition: all 0.2s var(--ease, ease);
  opacity: 0;
  z-index: 10;
}

.video-card.show-buttons .video-favorite-btn,
.video-card:hover .video-favorite-btn {
  opacity: 1;
}

.video-favorite-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.video-favorite-btn.active {
  opacity: 1;
  color: #ff3b30;
}

/* 求片按钮 - 左下角 */
.video-like-btn {
  position: absolute;
  bottom: 12px;
  left: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 1rem;
  transition: all 0.2s var(--ease, ease);
  opacity: 0;
  z-index: 10;
}

.video-card.show-buttons .video-like-btn,
.video-card:hover .video-like-btn {
  opacity: 1;
}

.video-like-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.video-like-btn.active {
  opacity: 1;
  color: #ff3b30;
}

/* 视频信息 - 海报图下方居中 */
.video-info {
  text-align: center;
  margin-top: 0.5rem;
}

.video-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-year {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-weight: 500;
}

/* 直播相关样式 */
.live-channel-card {
  background: var(--bg-elevated);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s var(--spring, cubic-bezier(0.34, 1.56, 0.64, 1)), box-shadow 0.3s var(--spring, cubic-bezier(0.34, 1.56, 0.64, 1)), border-color 0.3s var(--ease, ease);
  box-shadow: var(--shadow-sm);
}

.live-channel-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}

.live-logo-container {
  width: 100%;
  aspect-ratio: 16/10;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.live-logo-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s var(--ease, ease);
}

.live-channel-card:hover .live-logo-container img {
  transform: scale(1.05);
}

.live-logo-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
}

.live-logo-badge {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20px;
  padding: 8px 16px 8px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  gap: 0;
}

.live-logo-prefix {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -2px;
  line-height: 1;
  position: relative;
  -webkit-text-stroke: 2px #000;
  paint-order: stroke fill;
}

.live-logo-prefix .red-c {
  color: #ff3b30;
}

.live-logo-number-badge {
  background: #5a8f6b;
  color: #fff;
  font-size: 2rem;
  font-weight: 900;
  padding: 8px 14px;
  border-radius: 0 16px 16px 0;
  line-height: 1;
  min-width: 36px;
  text-align: center;
  -webkit-text-stroke: 1.5px #000;
  paint-order: stroke fill;
}

.live-logo-channel-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  -webkit-text-stroke: 2px #000;
  paint-order: stroke fill;
  letter-spacing: 12px;
  text-align: center;
}

.live-channel-info {
  padding: 16px;
  background: var(--bg-surface);
}

.live-channel-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.3rem;
}

.live-channel-tagline {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
}

.live-channel-desc {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 0.5rem;
}

.live-channel-meta {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.live-channel-meta i {
  margin-right: 4px;
}

/* 骨架屏样式 */
.skeleton-card-wrapper {
  display: block;
  min-width: 0;
}

.skeleton-card {
  border-radius: 24px;
  overflow: visible;
}

.skeleton-poster {
  width: 100%;
  aspect-ratio: 2/3;
  border-radius: 24px;
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    color-mix(in srgb, var(--bg-input) 40%, white) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  box-shadow: var(--shadow-sm);
}

.skeleton-info {
  text-align: center;
  margin-top: 0.5rem;
}

.skeleton-title {
  height: 16px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    color-mix(in srgb, var(--bg-input) 40%, white) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  margin-bottom: 0.2rem;
}

.skeleton-year {
  height: 12px;
  width: 40%;
  margin: 0 auto;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    color-mix(in srgb, var(--bg-input) 40%, white) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 直播骨架屏样式 */
.skeleton-live-card-wrapper {
  display: block;
  min-width: 0;
}

.skeleton-live-card {
  border-radius: 20px;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border);
}

.skeleton-live-logo {
  width: 100%;
  aspect-ratio: 16/10;
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    color-mix(in srgb, var(--bg-input) 40%, white) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-live-info {
  padding: 16px;
}

.skeleton-live-title {
  height: 18px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    color-mix(in srgb, var(--bg-input) 40%, white) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  margin-bottom: 8px;
  width: 60%;
}

.skeleton-live-meta {
  height: 14px;
  width: 40%;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--bg-input) 0%,
    color-mix(in srgb, var(--bg-input) 40%, white) 50%,
    var(--bg-input) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
</style>
