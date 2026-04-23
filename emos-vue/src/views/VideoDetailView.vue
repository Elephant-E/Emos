<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import videoApi from '@/api/videoApi.js'
import seekApi from '@/api/seekApi.js'
import tmdbApi from '@/api/tmdbApi.js'
import { formatDate, escapeHtml, formatFileSize } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'

const route = useRoute()
const router = useRouter()

// 状态
const videoData = ref(null)
const videoId = ref(route.params.id)

// 解析视频ID，提取纯数字部分
const getNumericId = (id) => {
  if (!id) return null
  // 如果是以 vl- 开头的片单ID，提取后面的数字
  if (typeof id === 'string' && id.startsWith('vl-')) {
    return parseInt(id.replace('vl-', ''))
  }
  // 否则直接返回数字
  return typeof id === 'number' ? id : parseInt(id)
}
const isLoading = ref(true)
const showOverviewModal = ref(false)
const showResourcesModal = ref(false) // 资源列表模态框
const isLoadingResources = ref(false) // 资源加载状态
const showRenameModal = ref(false) // 重命名模态框
const renameForm = ref({ media_id: '', name: '' }) // 重命名表单
const isRenaming = ref(false)
const showActionDropdown = ref(false) // 操作下拉菜单
const dropdownPosition = ref({ top: 0, left: 0 }) // 下拉菜单位置
const currentResource = ref(null) // 当前操作的资源
const showSubtitleModal = ref(false) // 字幕列表模态框
const subtitles = ref([]) // 字幕列表
const isLoadingSubtitles = ref(false) // 字幕加载状态
const showEditSubtitleModal = ref(false) // 编辑字幕模态框
const currentSubtitle = ref(null) // 当前编辑的字幕
const editSubtitleForm = ref({ subtitle_id: '', subtitle_title: '' }) // 编辑字幕表单
const isEditingSubtitle = ref(false)
const showDeleteSubtitleModal = ref(false) // 删除字幕模态框
const deleteSubtitleForm = ref({ subtitle_id: '', reason: '' }) // 删除字幕表单
const showMoveModal = ref(false) // 移动资源模态框
const moveForm = ref({ media_id: '', item_type: 've', item_id: '' }) // 移动表单
const isMoving = ref(false)
const showDeleteModal = ref(false) // 删除资源模态框
const deleteForm = ref({ media_id: '', reason: '' }) // 删除表单

// 季列表、集列表、资源列表
const seasons = ref([])
const episodes = ref({}) // { season_id: [episodes] }

// 预告片相关
const trailerKey = ref(null) // YouTube 视频 key
const trailerEmbedUrl = ref(null) // YouTube embed URL（来自后端）
const showTrailer = ref(false) // 是否显示预告片
const isTrailerMuted = ref(true) // 是否静音（默认静音）
let trailerTimer = null // 预告片播放定时器
const trailerIframeRef = ref(null)
const resources = ref([]) // 当前选中的集的资源列表
const expandedSeasons = ref({}) // { season_id: boolean } 跟踪哪些季被展开
const selectedEpisode = ref(null) // 当前选中的集
const allEpisodesData = ref([]) // 存储所有集的原始数据

// 获取高清图片 URL
const getOriginalImageUrl = (url) => {
  if (!url) return null
  return url.replace(/\/w\d+\//, '/original/')
}

// HTML 转义

// 提取年份
const extractYear = (dateString) => {
  if (!dateString) return ''
  return dateString.substring(0, 4)
}

// 格式化类型
const formatVideoType = (type) => {
  return type === 'movie' ? '电影' : '电视剧'
}

// 格式化分类
const formatGenres = (genres) => {
  if (!genres || genres.length === 0) return ''
  
  if (typeof genres[0] === 'object') {
    return genres.map(g => g.name).join(' · ')
  }
  
  return genres.join(' · ')
}

// 格式化时长（秒转时分秒）
const formatDuration = (seconds) => {
  if (!seconds) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

const trailerPlayerUrl = computed(() => {
  if (!trailerEmbedUrl.value) return null

  const url = new URL(trailerEmbedUrl.value, window.location.origin)
  url.searchParams.set('mute', isTrailerMuted.value ? '1' : '0')
  return url.toString()
})

// 加载指定集的资源列表
const loadResourcesForEpisode = async (seasonId, episodeId) => {
  isLoadingResources.value = true
  try {
    const params = {
      video_list_id: getNumericId(videoId.value)
    }
    
    if (seasonId != null) {
      params.video_season_id = seasonId
    }
    if (episodeId != null) {
      params.video_episode_id = episodeId
    }
    
    const result = await videoApi.getMediaList(params)
    resources.value = result || []
  } catch (error) {
    console.error('加载资源列表失败:', error)
    resources.value = []
  } finally {
    isLoadingResources.value = false
  }
}

// 加载季和集列表
const loadSeasonsAndEpisodes = async () => {
  try {
    // 获取所有集的列表（包含季信息）
    const result = await videoApi.getEpisodes(getNumericId(videoId.value), {
      with_seek_is_request: 1
    })
    
    allEpisodesData.value = result || []
    
    // 从集数据中提取季信息
    const seasonMap = new Map()
    allEpisodesData.value.forEach(episode => {
      if (!seasonMap.has(episode.season_id)) {
        seasonMap.set(episode.season_id, {
          season_id: episode.season_id,
          season_number: episode.season_number,
          episodes_count: 0
        })
      }
      seasonMap.get(episode.season_id).episodes_count++
    })
    
    // 转换为数组并排序
    seasons.value = Array.from(seasonMap.values())
      .sort((a, b) => a.season_number - b.season_number)
    
    // 按season_id分组集数据
    allEpisodesData.value.forEach(episode => {
      if (!episodes.value[episode.season_id]) {
        episodes.value[episode.season_id] = []
      }
      episodes.value[episode.season_id].push(episode)
    })
    
    // 默认不展开任何季
    // if (seasons.value.length > 0) {
    //   expandedSeasons.value[seasons.value[0].season_id] = true
    // }
  } catch (error) {
    console.error('加载季和集列表失败:', error)
  }
}

// 切换季的展开/折叠状态
const toggleSeason = (season) => {
  const seasonId = season.season_id
  
  if (expandedSeasons.value[seasonId]) {
    // 折叠
    expandedSeasons.value[seasonId] = false
  } else {
    // 展开
    expandedSeasons.value[seasonId] = true
    // 数据已预先加载，无需再次请求
  }
}

// 判断季的资源状态
// 返回：'complete' - 所有集都有资源，'incomplete' - 有集没有资源
const getSeasonResourceStatus = (seasonId) => {
  const seasonEpisodes = episodes.value[seasonId]
  if (!seasonEpisodes || seasonEpisodes.length === 0) {
    return 'incomplete'
  }
  
  // 检查是否所有集都有资源
  const allHaveResources = seasonEpisodes.every(episode => episode.medias_count > 0)
  return allHaveResources ? 'complete' : 'incomplete'
}

// 选择集并加载资源列表
const selectEpisode = async (episode) => {
  selectedEpisode.value = episode
  await loadResourcesForEpisode(episode.video_season_id, episode.video_episode_id)
}

// 加载视频详情
const loadVideoDetail = async () => {
  try {
    const response = await videoApi.list({
      video_id: getNumericId(videoId.value)
    })

    if (!response || !response.items || response.items.length === 0) {
      showToast('视频不存在', 'error')
      return
    }

    const apiData = response.items[0]
    
    // 合并 API 数据
    videoData.value = {
      video_id: apiData.video_id,
      video_title: apiData.video_title,
      video_title_original: apiData.video_origin_title || apiData.video_title,
      video_date_air: apiData.video_date_air,
      video_type: apiData.video_type,
      video_image_poster: apiData.video_image_poster,
      video_image_backdrop: apiData.video_image_backdrop,
      video_image_logo: apiData.video_image_logo || null,
      genres: apiData.genres || [],
      overview: apiData.video_description || '',
      tmdb_id: apiData.tmdb_id,
      tmdb_url: apiData.tmdb_url || null,
      todb_id: apiData.todb_id,
      medias_count: apiData.medias_count || 0,
      request_count: apiData.request_count || 0,
      seek_is_request: apiData.seek_is_request || false
    }

    // 如果是电视剧，加载季列表
    if (apiData.video_type === 'tv') {
      await loadSeasonsAndEpisodes()
    } else {
      // 电影直接加载资源列表
      await loadResourcesForEpisode(null, null)
    }
  } catch (error) {
    console.error('加载视频详情失败:', error)
    showToast('加载视频详情失败', 'error')
  } finally {
    isLoading.value = false
    // 加载完成后获取预告片
    loadTrailer()
  }
}

// 获取预告片
const loadTrailer = async () => {
  if (!videoData.value?.tmdb_id || !videoData.value?.video_type) return
  
  try {
    const tmdbId = videoData.value.tmdb_id
    const mediaType = videoData.value.video_type === 'movie' ? 'movie' : 'tv'
    
    // 调用 TMDB API 获取预告片
    const trailer = await tmdbApi.getTrailer(tmdbId, mediaType)
    
    if (trailer && trailer.key) {
      if (trailerTimer) {
        clearTimeout(trailerTimer)
        trailerTimer = null
      }

      showTrailer.value = false
      isTrailerMuted.value = true
      trailerKey.value = trailer.key
      trailerEmbedUrl.value = trailer.embed_url
      
      // 3秒后显示并播放预告片
      trailerTimer = setTimeout(() => {
        showTrailer.value = true
      }, 3000)
    }
  } catch (error) {
    console.error('加载预告片失败:', error)
  }
}

// 切换预告片静音状态
const toggleTrailerMute = () => {
  isTrailerMuted.value = !isTrailerMuted.value
}

// 返回上一页
const goBack = () => {
  // 使用 nextTick 确保 UI 先响应点击
  nextTick(() => {
    router.back()
  })
}

// 播放按钮
const handlePlay = () => {
  showToast('播放功能待开发', 'info')
}

// 求片功能
const handleSeekRequest = async () => {
  try {
    const response = await seekApi.apply('vl', videoId.value)
    
    if (response.seek_is_request) {
      videoData.value.seek_is_request = true
      showToast('求片成功', 'success')
    } else {
      videoData.value.seek_is_request = false
      showToast('已取消求片', 'info')
    }
  } catch (error) {
    console.error('求片操作失败:', error)
    showToast('求片操作失败', 'error')
  }
}

// 集列表求片功能
const handleEpisodeSeekRequest = async (episode) => {
  try {
    const response = await seekApi.apply('ve', episode.episode_id)
    
    // 更新本地状态
    episode.with_seek_is_request = !episode.with_seek_is_request
    
    if (episode.with_seek_is_request) {
      showToast('求片成功', 'success')
    } else {
      showToast('已取消求片', 'info')
    }
  } catch (error) {
    console.error('求片操作失败:', error)
    showToast('求片操作失败', 'error')
  }
}

// 显示更多详情
const showMoreOverview = () => {
  showOverviewModal.value = true
}

// 关闭模态框
const closeOverviewModal = () => {
  showOverviewModal.value = false
}

// 打开资源列表模态框
const openResourcesModal = async (episode) => {
  selectedEpisode.value = episode
  showResourcesModal.value = true // 先显示模态框（带骨架屏）
  
  // 根据是否有season_id判断是剧集还是电影
  if (episode.season_id && episode.episode_id) {
    // 剧集：使用season_id和episode_id加载
    await loadResourcesForEpisode(episode.season_id, episode.episode_id)
  } else if (episode.media_id) {
    // 电影：直接加载资源列表
    await loadResourcesForMovie()
  }
}

// 加载电影资源列表
const loadResourcesForMovie = async () => {
  isLoadingResources.value = true
  try {
    const response = await videoApi.getMediaList({
      video_list_id: getNumericId(videoId.value),
      video_episode_id: '',
      video_part_id: ''
    })
    // API 返回的是数组，直接使用
    resources.value = Array.isArray(response) ? response : (response.data || [])
  } catch (error) {
    console.error('加载电影资源失败:', error)
    showToast('加载资源失败', 'error')
  } finally {
    isLoadingResources.value = false
  }
}

// 关闭资源列表模态框
const closeResourcesModal = () => {
  showResourcesModal.value = false
  showActionDropdown.value = false // 关闭下拉菜单
}

// 打开重命名模态框
const openRenameModal = (resource) => {
  currentResource.value = resource
  renameForm.value = {
    media_id: resource.media_id,
    name: resource.media_name || ''
  }
  showRenameModal.value = true
  showActionDropdown.value = false // 关闭下拉菜单
}

// 关闭重命名模态框
const closeRenameModal = () => {
  showRenameModal.value = false
  renameForm.value = { media_id: '', name: '' }
  currentResource.value = null
}

// 提交重命名
const submitRename = async () => {
  if (isRenaming.value) return
  
  if (!renameForm.value.name.trim()) {
    showToast('请输入资源名称', 'warning')
    return
  }
  
  isRenaming.value = true
  
  try {
    await videoApi.renameMedia({
      media_id: renameForm.value.media_id,
      name: renameForm.value.name.trim()
    })
    showToast('重命名成功', 'success')
    closeRenameModal()
    // 重新加载资源列表
    await loadResources()
  } catch (error) {
    showToast('重命名失败: ' + error.message, 'error')
  } finally {
    isRenaming.value = false
  }
}

// 显示操作下拉菜单
const showDropdown = (event, resource) => {
  event.stopPropagation()
  event.preventDefault()
  
  currentResource.value = resource
  
  // 获取图标位置（getBoundingClientRect 返回相对于视口的位置）
  const rect = event.target.getBoundingClientRect()
  
  // 下拉菜单位置：图标正下方，右对齐
  // rect.right 是图标的右边缘
  // 160 是下拉菜单的宽度（min-width: 160px + padding）
  dropdownPosition.value = {
    top: rect.bottom + 8,      // 图标下方 8px
    left: rect.right - 160     // 右对齐图标
  }
  
  showActionDropdown.value = true
}

// 管理字幕
const manageSubtitles = async (resource) => {
  currentResource.value = resource
  showSubtitleModal.value = true
  showActionDropdown.value = false
  await loadSubtitles(resource.media_id)
}

// 加载字幕列表
const loadSubtitles = async (mediaId) => {
  isLoadingSubtitles.value = true
  try {
    const response = await videoApi.getSubtitleList({
      video_list_id: getNumericId(videoId.value),
      video_episode_id: selectedEpisode.value?.episode_id || '',
      video_part_id: '',
      video_media_id: mediaId
    })
    // API 返回的是数组，直接使用
    subtitles.value = Array.isArray(response) ? response : (response.data || [])
  } catch (error) {
    console.error('加载字幕失败:', error)
    showToast('加载字幕失败', 'error')
  } finally {
    isLoadingSubtitles.value = false
  }
}

// 关闭编辑字幕模态框
const closeEditSubtitleModal = () => {
  showEditSubtitleModal.value = false
  currentSubtitle.value = null
  editSubtitleForm.value = { subtitle_id: '', subtitle_title: '' }
}

// 编辑字幕
const editSubtitle = (subtitle) => {
  currentSubtitle.value = subtitle
  editSubtitleForm.value = {
    subtitle_id: subtitle.subtitle_id,
    subtitle_title: subtitle.subtitle_title || ''
  }
  showEditSubtitleModal.value = true
}

// 提交编辑字幕
const submitEditSubtitle = async () => {
  if (isEditingSubtitle.value) return
  
  if (!editSubtitleForm.value.subtitle_title.trim()) {
    showToast('请输入字幕标题', 'warning')
    return
  }
  
  isEditingSubtitle.value = true
  
  try {
    await videoApi.renameSubtitle({
      subtitle_id: editSubtitleForm.value.subtitle_id,
      title: editSubtitleForm.value.subtitle_title
    })
    showToast('重命名成功', 'success')
    closeEditSubtitleModal()
    // 重新加载字幕列表
    await loadSubtitles()
  } catch (error) {
    showToast('重命名失败: ' + error.message, 'error')
  } finally {
    isEditingSubtitle.value = false
  }
}

// 关闭删除字幕模态框
const closeDeleteSubtitleModal = () => {
  showDeleteSubtitleModal.value = false
  deleteSubtitleForm.value = { subtitle_id: '', reason: '' }
}

// 确认删除字幕
const confirmDeleteSubtitle = async (subtitleId, reason) => {
  try {
    await videoApi.deleteSubtitle({
      subtitle_id: subtitleId,
      reason: reason
    })
    showToast('删除成功', 'success')
    closeDeleteSubtitleModal()
    // 重新加载字幕列表
    if (currentResource.value) {
      await loadSubtitles(currentResource.value.media_id)
    }
  } catch (error) {
    console.error('删除字幕失败:', error)
    showToast(error.message || '删除失败', 'error')
  }
}

// 提交删除字幕（带原因）
const submitDeleteSubtitle = async () => {
  if (!deleteSubtitleForm.value.reason.trim()) {
    showToast('请输入删除原因', 'warning')
    return
  }
  
  if (deleteSubtitleForm.value.reason.length > 50) {
    showToast('删除原因不能超过50字', 'warning')
    return
  }
  
  await confirmDeleteSubtitle(deleteSubtitleForm.value.subtitle_id, deleteSubtitleForm.value.reason.trim())
}

// 删除字幕
const deleteSubtitle = async (subtitle) => {
  // 判断是否是自己上传的字幕
  if (subtitle.is_self_upload) {
    // 自己上传的字幕，二次确认
    if (confirm('确定要删除这个字幕吗？')) {
      await confirmDeleteSubtitle(subtitle.subtitle_id, '')
    }
  } else {
    // 他人上传的字幕，显示模态框填写原因
    deleteSubtitleForm.value = {
      subtitle_id: subtitle.subtitle_id,
      reason: ''
    }
    showDeleteSubtitleModal.value = true
  }
}

// 关闭字幕模态框
const closeSubtitleModal = () => {
  showSubtitleModal.value = false
  subtitles.value = []
}

// 移动资源
const moveResource = async (resource) => {
  currentResource.value = resource
  moveForm.value = {
    media_id: resource.media_id,
    item_type: 've',
    item_id: ''
  }
  showMoveModal.value = true
  showActionDropdown.value = false
}

// 关闭移动模态框
const closeMoveModal = () => {
  showMoveModal.value = false
  moveForm.value = { media_id: '', item_type: 've', item_id: '' }
}

// 提交移动
const submitMove = async () => {
  if (isMoving.value) return
  
  if (!moveForm.value.item_id) {
    showToast('请输入目标ID', 'warning')
    return
  }
  
  isMoving.value = true
  
  try {
    await videoApi.moveMedia({
      media_id: moveForm.value.media_id,
      item_type: moveForm.value.item_type,
      item_id: moveForm.value.item_id
    })
    showToast('移动成功', 'success')
    closeMoveModal()
    // 重新加载资源列表
    await loadResources()
  } catch (error) {
    showToast('移动失败: ' + error.message, 'error')
  } finally {
    isMoving.value = false
  }
}

// 删除资源
const deleteResource = async (resource) => {
  currentResource.value = resource
  
  // 判断是否是自己上传的资源
  if (resource.is_self_upload) {
    // 自己上传的资源，二次确认
    if (confirm('确定要删除这个资源吗？')) {
      await confirmDelete(resource.media_id, '')
    }
  } else {
    // 他人上传的资源，显示模态框填写原因
    deleteForm.value = {
      media_id: resource.media_id,
      reason: ''
    }
    showDeleteModal.value = true
  }
  
  showActionDropdown.value = false
}

// 关闭删除模态框
const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteForm.value = { media_id: '', reason: '' }
}

// 确认删除
const confirmDelete = async (mediaId, reason) => {
  try {
    await videoApi.deleteMedia({
      media_id: mediaId,
      reason: reason
    })
    showToast('删除成功', 'success')
    closeDeleteModal()
    // 重新加载资源列表
    if (selectedEpisode.value) {
      await loadResourcesForEpisode(selectedEpisode.value.season_id, selectedEpisode.value.episode_id)
    }
  } catch (error) {
    console.error('删除失败:', error)
    showToast(error.message || '删除失败', 'error')
  }
}

// 提交删除（带原因）
const submitDelete = async () => {
  if (!deleteForm.value.reason.trim()) {
    showToast('请输入删除原因', 'warning')
    return
  }
  
  if (deleteForm.value.reason.length > 50) {
    showToast('删除原因不能超过50字', 'warning')
    return
  }
  
  await confirmDelete(deleteForm.value.media_id, deleteForm.value.reason.trim())
}

// 生命周期
onMounted(() => {
  // 激活详情页样式：调整 body padding-top 让内容贴合 TopBar
  document.body.classList.add('detail-page-active')
  loadVideoDetail()
  // 添加全局点击事件监听
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  // 清理详情页样式，恢复 body 默认 padding-top
  document.body.classList.remove('detail-page-active')
  // 移除全局点击事件监听
  document.removeEventListener('click', handleGlobalClick)
  // 清理预告片定时器
  if (trailerTimer) {
    clearTimeout(trailerTimer)
    trailerTimer = null
  }
})

// 全局点击关闭下拉菜单
const handleGlobalClick = (event) => {
  // 如果点击的是下拉菜单内部，不关闭
  if (event.target.closest('.resource-action-dropdown')) {
    return
  }
  showActionDropdown.value = false
}
</script>

<template>
  <div class="detail-container">
    <!-- 加载骨架屏 -->
    <div v-if="isLoading" class="detail-skeleton">
      <!-- Hero 区域骨架屏 -->
      <div class="hero-section">
        <div class="skeleton-backdrop"></div>
        <div class="hero-gradient"></div>
        
        <!-- 顶部操作栏骨架 -->
        <div class="hero-actions">
          <div class="skeleton-action-btn-small"></div>
        </div>
        
        <div class="hero-content">
          <div class="hero-info">
            <!-- 标题骨架 -->
            <div class="skeleton-title-logo"></div>
            
            <!-- 元信息骨架 -->
            <div class="skeleton-meta">
              <div class="skeleton-meta-item"></div>
              <div class="skeleton-meta-item"></div>
              <div class="skeleton-meta-item"></div>
            </div>
            
            <!-- 简介骨架 -->
            <div class="skeleton-overview">
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
            
            <!-- 按钮骨架 -->
            <div class="skeleton-buttons">
              <div class="skeleton-play-btn"></div>
              <div class="skeleton-action-btn"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 内容区域骨架屏 -->
      <div class="detail-content">
        <div class="detail-section">
          <!-- 章节标题骨架 -->
          <div class="skeleton-section-title"></div>
          
          <!-- 手风琴列表骨架（季+集） -->
          <div class="skeleton-accordion-list">
            <!-- 季项骨架 -->
            <div v-for="i in 2" :key="'season-' + i" class="skeleton-accordion-item">
              <div class="skeleton-chevron"></div>
              <div class="skeleton-season-info">
                <div class="skeleton-line short"></div>
              </div>
              <div class="skeleton-status-dot"></div>
            </div>
            
            <!-- 展开的集列表骨架（仅第一项展开） -->
            <div v-if="true" class="skeleton-episodes-list">
              <div v-for="j in 4" :key="'episode-' + j" class="skeleton-episode-item">
                <div class="skeleton-episode-info">
                  <div class="skeleton-line" style="width: 60%;"></div>
                  <div class="skeleton-line short" style="width: 40%; margin-top: 0.25rem;"></div>
                </div>
                <div class="skeleton-episode-actions">
                  <div class="skeleton-heart-icon"></div>
                  <div class="skeleton-count-badge"></div>
                  <div class="skeleton-chevron"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Hero Section - 背景大图 -->
    <div v-if="!isLoading" class="hero-section" id="heroSection">
        <div 
          class="hero-backdrop" 
          id="heroBackdrop"
          :style="{ backgroundImage: videoData?.video_image_backdrop ? `url(${videoData.video_image_backdrop})` : 'none' }"
        ></div>
        <div class="hero-gradient"></div>
        
        <!-- 预告片视频 -->
        <div 
          v-if="trailerPlayerUrl && showTrailer" 
          class="hero-trailer"
        >
          <iframe
            ref="trailerIframeRef"
            :src="trailerPlayerUrl"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        
        <!-- 顶部操作栏 -->
        <div class="hero-actions">
          <button class="hero-action-btn back-btn" @click="goBack">
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <!-- 预告片控制按钮 -->
          <button 
            v-if="trailerKey"
            class="hero-action-btn trailer-mute-btn" 
            @click="toggleTrailerMute"
            :title="isTrailerMuted ? '开启声音' : '静音'"
          >
            <i :class="isTrailerMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'"></i>
          </button>
        </div>
        
        <!-- 内容区域 -->
        <div class="hero-content">
          <div class="hero-info">
            <!-- 标题 -->
            <div class="hero-title-wrapper" id="heroTitleWrapper">
              <img v-if="videoData?.video_image_logo"
                class="hero-title-logo" 
                id="videoLogo" 
                :src="videoData.video_image_logo" 
                :alt="escapeHtml(videoData.video_title)"
                @error="$event.target.style.display='none'; document.getElementById('videoTitle').style.display='block'"
               loading="lazy">
              <h1 
                class="hero-title" 
                id="videoTitle"
                :style="{ display: videoData?.video_image_logo ? 'none' : 'block' }"
              >
                {{ escapeHtml(videoData?.video_title) }}
              </h1>
            </div>
            
            <!-- 元信息 -->
            <div class="hero-meta">
              <span id="videoType">{{ formatVideoType(videoData?.video_type) }}</span>
              <span class="meta-dot">·</span>
              <span id="videoYear">{{ extractYear(videoData?.video_date_air) }}年</span>
              <span class="meta-dot">·</span>
              <span id="videoGenres">{{ formatGenres(videoData?.genres) }}</span>
            </div>
            
            <!-- 简介 -->
            <div class="overview-wrapper">
              <p class="hero-overview" id="videoOverview">
                {{ escapeHtml(videoData?.overview) }}
              </p>
              <button class="more-btn-inline" id="moreOverviewBtn" @click="showMoreOverview">更多</button>
            </div>
            
            <!-- 操作按钮 -->
            <div class="hero-buttons">
              <button class="play-btn-circle" id="playBtn" @click="handlePlay">
                <i class="fas fa-play"></i>
                <span>播放</span>
              </button>
              <button 
                class="action-btn-circle" 
                id="requestBtn"
                :class="{ active: videoData?.seek_is_request }"
                @click="handleSeekRequest"
              >
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 内容区域 -->
      <div class="detail-content">
        <!-- 电视剧：显示季/集手风琴 -->
        <section class="detail-section" id="seasonsSection" v-if="videoData?.video_type === 'tv' && seasons.length > 0">
          <h2 class="section-title">
            剧集列表
            <i class="fas fa-chevron-right"></i>
          </h2>
          
          <!-- 季和集列表 -->
          <div class="seasons-episodes-container">
            <template v-for="(season, index) in seasons" :key="season.season_id">
              <!-- 季项 -->
              <div 
                class="setting-item season-item-clickable"
                :class="{ 
                  expanded: expandedSeasons[season.season_id],
                  'no-bottom-radius': expandedSeasons[season.season_id],
                  'no-top-radius': index > 0 && expandedSeasons[seasons[index - 1].season_id],
                  'last-season': index === seasons.length - 1
                }"
                @click="toggleSeason(season)"
              >
                <!-- 左侧箭头 -->
                <i 
                  class="fas fa-chevron-right chevron-icon"
                  :class="{ expanded: expandedSeasons[season.season_id] }"
                ></i>
                
                <!-- 季Logo（如果有） -->
                <img v-if="season.season_image_logo"
                  class="season-logo"
                  :src="season.season_image_logo"
                  :alt="season.season_title || `第 ${season.season_number} 季`"
                  @error="$event.target.style.display='none'"
                 loading="lazy">
                
                <!-- 季信息 -->
                <div class="setting-info">
                  <div class="setting-label">
                    {{ season.season_number === 0 ? '特别季' : `第 ${season.season_number} 季` }}
                    <span class="season-episodes-count">{{ season.episodes_count }} 集</span>
                  </div>
                </div>
                
                <!-- 右侧状态点 -->
                <div class="setting-value">
                  <div 
                    class="season-status-dot" 
                    :class="getSeasonResourceStatus(season.season_id)"
                  ></div>
                </div>
              </div>
              
              <!-- 展开的集列表 -->
              <transition name="slide-fade">
                <div 
                  v-if="expandedSeasons[season.season_id] && episodes[season.season_id]"
                  class="episodes-list"
                  :class="{
                    'no-bottom-radius': index < seasons.length - 1,
                    'no-top-radius': true
                  }"
                >
                <div 
                  v-for="(episode, epIndex) in episodes[season.season_id]" 
                  :key="episode.item_id"
                  class="setting-item episode-item-clickable"
                  :class="{ 
                    active: selectedEpisode?.item_id === episode.item_id,
                    'no-top-radius': epIndex === 0,
                    'no-bottom-radius': epIndex < episodes[season.season_id].length - 1 || index < seasons.length - 1
                  }"
                  @click="openResourcesModal(episode)"
                >
                  <!-- 集信息 -->
                  <div class="setting-info">
                    <div class="setting-label">
                      <span class="episode-number">{{ episode.episode_number }}.</span>
                      <span class="episode-title">{{ episode.episode_title || `第 ${episode.episode_number} 集` }}</span>
                    </div>
                    <div class="setting-desc" v-if="episode.date_air || episode.item_id">
                      <span v-if="episode.date_air">{{ episode.date_air }}</span>
                      <span v-if="episode.date_air && episode.item_id"> · </span>
                      <span v-if="episode.item_id">{{ episode.item_id }}</span>
                    </div>
                  </div>
                  
                  <!-- 右侧：求片logo + 资源数 + 箭头 -->
                  <div class="setting-value">
                    <span 
                      class="request-icon" 
                      :class="{ active: episode.with_seek_is_request }"
                      @click.stop="handleEpisodeSeekRequest(episode)"
                    >
                      <i class="fas fa-heart"></i>
                    </span>
                    <span class="episode-media-count">
                      {{ episode.medias_count || 0 }}
                    </span>
                    <i class="fas fa-chevron-right chevron-icon"></i>
                  </div>
                </div>
              </div>
              </transition>
            </template>
          </div>
        </section>
        
        <!-- 资源列表（仅电影显示） -->
        <section class="detail-section" id="resourcesSection" v-if="videoData?.video_type !== 'tv'">
          <h2 class="section-title">
            资源列表
            <i class="fas fa-chevron-right"></i>
          </h2>
          
          <!-- 有资源时显示列表 -->
          <div v-if="resources.length > 0" class="settings-list">
            <div 
              v-for="resource in resources" 
              :key="resource.media_id"
              class="setting-item resource-item-clickable"
            >
              <div class="setting-info">
                <div class="setting-label">{{ resource.media_name || '未命名' }}</div>
                <div class="setting-desc">
                  <span v-if="resource.media_file_size">{{ formatFileSize(resource.media_file_size) }}</span>
                  <span v-if="resource.media_file_second" class="meta-separator"> · </span>
                  <span v-if="resource.media_file_second">{{ formatDuration(resource.media_file_second) }}</span>
                  <span v-if="resource.subtitle_count > 0" class="meta-separator"> · </span>
                  <span v-if="resource.subtitle_count > 0">{{ resource.subtitle_count }} 字幕</span>
                  <span v-if="resource.created_at" class="meta-separator"> · </span>
                  <span v-if="resource.created_at">{{ formatDate(resource.created_at) }}</span>
                </div>
              </div>
              
              <!-- 右侧：操作图标 -->
              <div class="setting-value">
                <i class="fas fa-pen edit-icon-inline" title="编辑" @click.stop="openRenameModal(resource)"></i>
                <i class="fas fa-ellipsis more-icon-inline" title="更多" @click.stop="showDropdown($event, resource)"></i>
              </div>
            </div>
          </div>
          
          <!-- 无资源时显示空状态 -->
          <div v-else class="empty-state">
            <p>暂无资源</p>
          </div>
        </section>
      </div>
    </div>

  <!-- 更多详情模态框 -->
  <div v-if="showOverviewModal" class="modal-overlay show" @click.self="closeOverviewModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">详细信息</h3>
        <button class="modal-close" @click="closeOverviewModal">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="detail-info-list">
          <div class="detail-info-item">
            <span class="detail-info-label">原始标题</span>
            <span class="detail-info-value">{{ escapeHtml(videoData?.video_title_original) }}</span>
          </div>
          <div class="detail-info-item">
            <span class="detail-info-label">类型</span>
            <span class="detail-info-value">{{ formatVideoType(videoData?.video_type) }}</span>
          </div>
          <div class="detail-info-item">
            <span class="detail-info-label">上映日期</span>
            <span class="detail-info-value">{{ videoData?.video_date_air || '-' }}</span>
          </div>
          <div class="detail-info-item">
            <span class="detail-info-label">资源数</span>
            <span class="detail-info-value">{{ videoData?.medias_count || 0 }} 个</span>
          </div>
          <div class="detail-info-item">
            <span class="detail-info-label">点播数</span>
            <span class="detail-info-value">{{ videoData?.request_count || 0 }} 人</span>
          </div>
          <div class="detail-info-item" v-if="videoData?.tmdb_url">
            <span class="detail-info-label">TMDB 链接</span>
            <a class="detail-info-link" :href="videoData.tmdb_url" target="_blank" rel="noopener noreferrer">{{ videoData.tmdb_url }}</a>
          </div>
          <div class="detail-info-item">
            <span class="detail-info-label">TMDB ID</span>
            <span class="detail-info-value">{{ videoData?.tmdb_id || '-' }}</span>
          </div>
          <div class="detail-info-item">
            <span class="detail-info-label">TODB ID</span>
            <span class="detail-info-value">{{ videoData?.todb_id || '-' }}</span>
          </div>
          <div class="detail-info-item">
            <span class="detail-info-label">完整简介</span>
            <p class="detail-info-overview">{{ escapeHtml(videoData?.overview) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 资源列表模态框 -->
  <div v-if="showResourcesModal" class="modal-overlay show" @click.self="closeResourcesModal">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">资源列表</h2>
        <button class="modal-close" @click="closeResourcesModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <!-- 剧集信息 -->
        <div v-if="selectedEpisode" class="episode-info">
          <p class="episode-title">
            剧集：{{ selectedEpisode.episode_title || `第 ${selectedEpisode.episode_number} 集` }}
          </p>
        </div>
        
        <!-- 加载骨架屏 - 无容器包裹 -->
        <div v-if="isLoadingResources" class="resource-skeleton-container">
          <div 
            v-for="i in 3" 
            :key="i" 
            class="skeleton-list-item"
          >
            <div class="skeleton-info">
              <div class="skeleton-text" style="width: 70%;"></div>
              <div class="skeleton-text-sm" style="width: 50%;"></div>
            </div>
            <div class="skeleton-action-group">
              <div class="skeleton-icon"></div>
              <div class="skeleton-icon"></div>
            </div>
          </div>
        </div>
        
        <!-- 资源列表 -->
        <div v-else-if="resources.length > 0" class="modal-resource-list">
          <div 
            v-for="(resource, index) in resources" 
            :key="resource.media_id"
            :class="['resource-row', { 'no-border': index === resources.length - 1 }]"
          >
            <!-- 左侧：资源信息 -->
            <div class="resource-info">
              <div class="resource-title">{{ resource.media_name || '未命名' }}</div>
              <div class="resource-desc">
                <span v-if="resource.media_file_size">{{ formatFileSize(resource.media_file_size) }}</span>
                <span v-if="resource.media_file_second" class="meta-separator"> · </span>
                <span v-if="resource.media_file_second">{{ formatDuration(resource.media_file_second) }}</span>
                <span v-if="resource.subtitle_count > 0" class="meta-separator"> · </span>
                <span v-if="resource.subtitle_count > 0">{{ resource.subtitle_count }} 字幕</span>
                <span v-if="resource.created_at" class="meta-separator"> · </span>
                <span v-if="resource.created_at">{{ formatDate(resource.created_at) }}</span>
              </div>
            </div>
            
            <!-- 右侧：操作图标 -->
            <div class="resource-actions">
              <i class="fas fa-pen edit-icon" title="编辑" @click.stop="openRenameModal(resource)"></i>
              <i class="fas fa-ellipsis more-icon" title="更多" @click.stop="showDropdown($event, resource)"></i>
            </div>
          </div>
        </div>
        
        <!-- 无资源时显示空状态 -->
        <div v-else style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
          <p>暂无资源</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 操作下拉菜单 - 使用Teleport移到body -->
  <Teleport to="body">
    <div 
      v-if="showActionDropdown && currentResource" 
      class="resource-action-dropdown"
      :style="{ 
        position: 'fixed',
        top: dropdownPosition.top + 'px', 
        left: dropdownPosition.left + 'px',
        right: 'auto',
        zIndex: 100000
      }"
      @click.stop
    >
      <div class="dropdown-item" @click="manageSubtitles(currentResource)">
        <i class="fas fa-closed-captioning"></i>
        <span>字幕</span>
      </div>
      <div class="dropdown-item" @click="moveResource(currentResource)">
        <i class="fas fa-arrows-alt"></i>
        <span>移动</span>
      </div>
      <div class="dropdown-item danger" @click="deleteResource(currentResource)">
        <i class="fas fa-trash-alt"></i>
        <span>删除</span>
      </div>
    </div>
  </Teleport>
  
  <!-- 重命名模态框 -->
  <div v-if="showRenameModal" class="modal-overlay show" @click.self="closeRenameModal">
    <div class="modal-content lg">
      <div class="modal-header">
        <h2 class="modal-title">重命名资源</h2>
        <button class="modal-close" @click="closeRenameModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <input 
          v-model="renameForm.name" 
          type="text" 
          class="input"
          placeholder="请输入资源名称"
          @keyup.enter="submitRename"
          autofocus
        />
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeRenameModal">取消</button>
        <button class="modal-btn primary" @click="submitRename" :disabled="isRenaming">
          <span v-if="!isRenaming">确定</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>
  
  <!-- 字幕列表模态框 -->
  <div v-if="showSubtitleModal" class="modal-overlay show" @click.self="closeSubtitleModal">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">字幕列表</h2>
        <button class="modal-close" @click="closeSubtitleModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" @click.stop>
        <!-- 加载骨架屏 -->
        <div v-if="isLoadingSubtitles" style="display: flex; flex-direction: column; gap: 8px; padding: 8px 0;">
          <div 
            v-for="i in 3" 
            :key="i" 
            style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; min-height: 64px;"
          >
            <div style="flex: 1; margin-right: 16px;">
              <div style="height: 16px; border-radius: 4px; margin-bottom: 8px; width: 70%; background: linear-gradient(90deg, var(--bg-input) 0%, color-mix(in srgb, var(--bg-input) 40%, white) 50%, var(--bg-input) 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;"></div>
              <div style="height: 12px; border-radius: 4px; width: 50%; background: linear-gradient(90deg, var(--bg-input) 0%, color-mix(in srgb, var(--bg-input) 40%, white) 50%, var(--bg-input) 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;"></div>
            </div>
            <div style="display: flex; gap: 1rem; flex-shrink: 0;">
              <div style="width: 16px; height: 16px; border-radius: 4px; background: linear-gradient(90deg, var(--bg-input) 0%, color-mix(in srgb, var(--bg-input) 40%, white) 50%, var(--bg-input) 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;"></div>
              <div style="width: 16px; height: 16px; border-radius: 4px; background: linear-gradient(90deg, var(--bg-input) 0%, color-mix(in srgb, var(--bg-input) 40%, white) 50%, var(--bg-input) 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;"></div>
            </div>
          </div>
        </div>
        
        <!-- 字幕列表 -->
        <div v-else-if="subtitles.length > 0" class="modal-resource-list">
          <div 
            v-for="(subtitle, index) in subtitles" 
            :key="subtitle.subtitle_id"
            class="resource-row"
            :style="index < subtitles.length - 1 ? 'border-bottom: 0.5px solid var(--border);' : ''"
          >
            <!-- 左侧：字幕信息 -->
            <div class="resource-info">
              <div class="resource-title">{{ subtitle.subtitle_title || '未命名' }}</div>
              <div class="resource-desc">
                <span>{{ subtitle.subtitle_codec }}</span>
                <span v-if="subtitle.user_pseudonym" class="meta-separator"> · </span>
                <span v-if="subtitle.user_pseudonym">{{ subtitle.user_pseudonym }}</span>
                <span v-if="subtitle.created_at" class="meta-separator"> · </span>
                <span v-if="subtitle.created_at">{{ formatDate(subtitle.created_at) }}</span>
              </div>
            </div>
            
            <!-- 右侧：操作图标 -->
            <div class="resource-actions">
              <i class="fas fa-pen edit-icon" title="编辑" @click.stop="editSubtitle(subtitle)"></i>
              <i class="fas fa-trash subtitle-delete-icon" title="删除" @click.stop="deleteSubtitle(subtitle)"></i>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-else style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
          <p>暂无字幕</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 重命名字幕模态框 -->
  <div v-if="showEditSubtitleModal" class="modal-overlay show" @click.self="closeEditSubtitleModal">
    <div class="modal-content lg">
      <div class="modal-header">
        <h2 class="modal-title">重命名字幕</h2>
        <button class="modal-close" @click="closeEditSubtitleModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" @click.stop>
        <input 
          v-model="editSubtitleForm.subtitle_title" 
          type="text" 
          class="input"
          placeholder="请输入字幕名称"
          @keyup.enter="submitEditSubtitle"
          autofocus
        />
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeEditSubtitleModal">取消</button>
        <button class="modal-btn primary" @click="submitEditSubtitle" :disabled="isEditingSubtitle">
          <span v-if="!isEditingSubtitle">确定</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>
  
  <!-- 删除字幕模态框 -->
  <div v-if="showDeleteSubtitleModal" class="modal-overlay show" @click.self="closeDeleteSubtitleModal">
    <div class="modal-content lg">
      <div class="modal-header">
        <h2 class="modal-title">删除字幕</h2>
        <button class="modal-close" @click="closeDeleteSubtitleModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" @click.stop>
        <div class="form-hint" style="margin-bottom: 1rem;">
          请输入删除原因（50字以内）
        </div>
        <textarea 
          v-model="deleteSubtitleForm.reason" 
          class="modal-input modal-textarea"
          placeholder="请输入删除原因"
          rows="4"
          maxlength="50"
        ></textarea>
        <div class="form-hint" style="text-align: right; margin-top: 0.5rem;">
          {{ deleteSubtitleForm.reason.length }}/50
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeDeleteSubtitleModal">取消</button>
        <button class="modal-btn danger" @click="submitDeleteSubtitle">删除</button>
      </div>
    </div>
  </div>
  
  <!-- 移动资源模态框 -->
  <div v-if="showMoveModal" class="modal-overlay show" @click.self="closeMoveModal">
    <div class="modal-content lg">
      <div class="modal-header">
        <h2 class="modal-title">移动资源</h2>
        <button class="modal-close" @click="closeMoveModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" @click.stop>
        <input 
          v-model="moveForm.item_id" 
          type="text" 
          class="input"
          placeholder="请输入目标ID"
          @keyup.enter="submitMove"
          autofocus
        />
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeMoveModal">取消</button>
        <button class="modal-btn primary" @click="submitMove" :disabled="isMoving">
          <span v-if="!isMoving">确定</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>
  
  <!-- 删除资源模态框 -->
  <div v-if="showDeleteModal" class="modal-overlay show" @click.self="closeDeleteModal">
    <div class="modal-content lg">
      <div class="modal-header">
        <h2 class="modal-title">删除资源</h2>
        <button class="modal-close" @click="closeDeleteModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" @click.stop>
        <div class="form-hint" style="margin-bottom: 1rem;">
          请输入删除原因（50字以内）
        </div>
        <textarea 
          v-model="deleteForm.reason" 
          class="modal-input modal-textarea"
          placeholder="请输入删除原因"
          rows="4"
          maxlength="50"
        ></textarea>
        <div class="form-hint" style="text-align: right; margin-top: 0.5rem;">
          {{ deleteForm.reason.length }}/50
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeDeleteModal">取消</button>
        <button class="modal-btn danger" @click="submitDelete">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 详情页容器 - 负边距抵消 MainLayout 的左右边距 */
.detail-container {
  min-height: 100vh;
  background: var(--bg-primary);
  margin: 0 -20px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .detail-container {
    margin: 0 -12px;
  }
}

/* 剧集信息 */
.episode-info {
  margin-bottom: 16px;
}

.episode-title {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 8px;
}

/* 资源骨架屏容器 */
.resource-skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

/* 骨架屏图标组 */
.skeleton-action-group {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.skeleton-icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--bg-input);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

/* 资源行无边框 */
.resource-row.no-border {
  border-bottom: none !important;
}

/* 骨架屏动画 */
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.detail-skeleton {
  min-height: 100vh;
}

/* 骨架屏内容区域 - 与实际 .detail-content 的 padding 保持一致 */
.detail-skeleton .detail-content {
  padding: 2rem;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .detail-skeleton .detail-content {
    padding: 1rem;
  }
}

.skeleton-backdrop {
  position: absolute;
  top: -75px;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

/* 浅色主题下使用更明显的灰色 */
[data-theme="light"] .skeleton-backdrop {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-title-logo {
  width: 300px;
  height: 80px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

[data-theme="light"] .skeleton-title-logo {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

/* 顶部操作按钮骨架 */
.skeleton-action-btn-small {
  width: 38px;
  height: 38px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 50%;
}

[data-theme="light"] .skeleton-action-btn-small {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.skeleton-meta-item {
  width: 80px;
  height: 20px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

[data-theme="light"] .skeleton-meta-item {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-overview {
  margin-bottom: 2rem;
  max-width: 600px;
}

.skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

[data-theme="light"] .skeleton-line {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-buttons {
  display: flex;
  gap: 1rem;
}

.skeleton-play-btn {
  width: 140px;
  height: 48px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 24px;
}

[data-theme="light"] .skeleton-play-btn {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-action-btn {
  width: 48px;
  height: 48px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 50%;
}

[data-theme="light"] .skeleton-action-btn {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-section-title {
  width: 120px;
  height: 28px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

[data-theme="light"] .skeleton-section-title {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-list-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 12px;
}

[data-theme="light"] .skeleton-list-item {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-poster {
  width: 60px;
  height: 90px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 8px;
  flex-shrink: 0;
}

[data-theme="light"] .skeleton-poster {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
}

/* 手风琴列表骨架 */
.skeleton-accordion-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-accordion-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 12px;
}

[data-theme="light"] .skeleton-accordion-item {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-chevron {
  width: 16px;
  height: 16px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
  flex-shrink: 0;
}

[data-theme="light"] .skeleton-chevron {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-season-info {
  flex: 1;
}

.skeleton-status-dot {
  width: 8px;
  height: 8px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 50%;
  flex-shrink: 0;
}

[data-theme="light"] .skeleton-status-dot {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

/* 展开的集列表骨架 */
.skeleton-episodes-list {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding-left: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-episode-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 8px;
}

[data-theme="light"] .skeleton-episode-item {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-episode-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.skeleton-episode-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.skeleton-heart-icon {
  width: 16px;
  height: 16px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 50%;
}

[data-theme="light"] .skeleton-heart-icon {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-count-badge {
  width: 24px;
  height: 16px;
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 8px;
}

[data-theme="light"] .skeleton-count-badge {
  background: linear-gradient(90deg, rgba(180, 180, 185, 0.6) 25%, rgba(160, 160, 165, 0.7) 50%, rgba(180, 180, 185, 0.6) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 70vh;
}

.hero-backdrop {
  position: absolute;
  top: -75px; /* 背景图向上延伸到Topbar后面，完全覆盖顶部 */
  bottom: 0;
  left: 0;
  right: 0;
  background-size: cover;
  background-position: center;
  z-index: 0;
}

/* 预告片视频容器 */
.hero-trailer {
  position: absolute;
  top: -75px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  overflow: hidden;
  opacity: 0;
  animation: trailer-fade-in 0.8s ease forwards;
}

.hero-trailer iframe {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 177.777vh;
  min-width: 100%;
  height: 56.25vw;
  min-height: calc(100% + 75px);
  border: none;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

@keyframes trailer-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.hero-gradient {
  position: absolute;
  top: -75px; /* 与背景图同步向上延伸 */
  bottom: 0;
  left: 0;
  right: 0;
  background: 
    linear-gradient(
      to top,
      var(--hero-gradient-bottom) 0%,
      var(--hero-gradient-mid) 15%,
      var(--hero-gradient-top) 30%,
      rgba(0, 0, 0, 0) 50%
    );
}

/* 顶部操作栏 */
.hero-actions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 1.5rem 2rem 0;
  z-index: 10;
}

.hero-action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-elevated);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s var(--ease);
}

.hero-action-btn:hover {
  background: var(--bg-surface-hover);
  transform: scale(1.1);
}

/* Hero 内容 */
.hero-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 2rem 1.5rem;
  gap: 2rem;
}

.hero-info {
  flex: 1;
  max-width: 650px;
}

.hero-title-wrapper {
  margin-bottom: 0.5rem;
}

.hero-title-logo {
  max-width: 400px;
  max-height: 120px;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 2px 20px rgba(0, 0, 0, 0.5));
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.meta-dot {
  opacity: 0.5;
}

.overview-wrapper {
  position: relative;
  margin-bottom: 0.6rem;
  max-width: 300px;
}

.hero-overview {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
  padding-right: 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 85%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 85%,
    rgba(0, 0, 0, 0) 100%
  );
  mix-blend-mode: difference;
}

.more-btn-inline {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.95);
  padding: 0.1rem 0.5rem;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 400;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s var(--ease);
  line-height: 1;
}

.more-btn-inline:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* 操作按钮 */
.hero-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.play-btn-circle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.5rem;
  height: 48px;
  background: #fff;
  color: #000;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--ease);
}

.play-btn-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 20px rgba(255, 255, 255, 0.3);
}

.action-btn-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s var(--ease);
  font-size: 1.2rem;
}

.action-btn-circle:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.action-btn-circle.active {
  background: var(--danger);
  border-color: var(--danger);
}

/* 内容区域 */
.detail-content {
  padding: 2rem;
  background: var(--bg-primary);
}

.detail-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 季和集容器 */
.seasons-episodes-container {
  background: var(--bg-surface);
  border-radius: 16px;
  overflow: hidden;
}

/* 展开的集列表 */
.episodes-list {
  margin-top: 0;
  overflow: hidden;
  background: var(--bg-surface);
  padding-top: 0;
}

/* Vue Transition 动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s var(--ease);
  max-height: 2000px;
  opacity: 1;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  opacity: 0;
}

/* 季项样式 */
.season-item-clickable {
  position: relative;
  z-index: 1;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
}

/* 季项内的 setting-info 不需要 margin-bottom */
.season-item-clickable .setting-info {
  flex: 1;
  min-width: 0;
}

.season-item-clickable .setting-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0;
  display: flex;
  align-items: center;
}

/* 季项圆角处理 */
.season-item-clickable.no-top-radius {
  border-radius: 0;
}

.season-item-clickable:not(.no-top-radius) {
  border-radius: 16px 16px 0 0;
}

/* 展开时季项底部无圆角和分割线 */
.season-item-clickable.expanded {
  border-radius: 0;
  border-bottom: none !important;
}

/* 最后一个季项（未展开时）移除底部边框 */
.season-item-clickable.last-season:not(.expanded) {
  border-bottom: none;
}

/* 左侧箭头样式 */
.season-item-clickable .chevron-icon {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  transition: transform 0.3s var(--ease);
  margin-right: 0.5rem;
}

/* 展开时箭头旋转90度 */
.season-item-clickable .chevron-icon.expanded {
  transform: rotate(90deg);
}

/* 季Logo */
.season-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

/* 季集数统计 */
.season-episodes-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 400;
  margin-left: 0.5rem;
}

/* 状态点占位符 */
.status-dot-placeholder {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  margin-right: 0.75rem;
}

/* 季资源状态点 */
.season-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.75rem;
  transition: background 0.3s var(--ease);
}

/* 所有集都有资源 - 绿色 */
.season-status-dot.complete {
  background: var(--success);
  box-shadow: 0 0 8px color-mix(in srgb, var(--success) 40%, transparent);
}

/* 有集没有资源 - 红色 */
.season-status-dot.incomplete {
  background: var(--danger);
  box-shadow: 0 0 8px color-mix(in srgb, var(--danger) 40%, transparent);
}

/* 集项样式 */
.episode-item-clickable {
  position: relative;
  background: var(--bg-surface);
  transition: all 0.2s var(--ease);
}

/* 集项圆角处理 */
.episode-item-clickable.no-top-radius {
  border-radius: 0;
}

.episode-item-clickable.no-bottom-radius {
  border-radius: 0;
}

.episode-item-clickable:not(.no-top-radius):not(.no-bottom-radius) {
  border-radius: 0;
}

/* 集项悬停状态 */
.episode-item-clickable:hover {
  background: var(--bg-surface-hover);
}

/* 集项激活状态 */
.setting-item.clickable.active {
  background: var(--accent-alpha);
  border-left: 3px solid var(--accent);
}

/* 集号 */
.episode-number {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.95rem;
  margin-right: 0.25rem;
}

/* 集标题 */
.episode-title {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.95rem;
}

/* 求片图标 */
.request-icon {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin-right: 0.5rem;
  display: inline-flex;
  align-items: center;
  transition: color 0.2s var(--ease), transform 0.2s var(--ease);
  cursor: pointer;
}

/* 求片图标悬停效果 */
.request-icon:hover {
  transform: scale(1.15);
}

/* 求片图标激活状态 */
.request-icon.active {
  color: var(--accent);
}

/* 资源数 */
.episode-media-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-right: 0.5rem;
  font-weight: 500;
  min-width: 20px;
  text-align: center;
}

/* 展开的箭头旋转 */
.chevron-icon.expanded {
  transform: rotate(180deg);
}

/* 我的上传徽章 */
.badge-self-upload {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

/* 电影资源列表内联操作图标 */
.edit-icon-inline,
.more-icon-inline {
  color: var(--text-tertiary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: color 0.2s var(--ease);
  padding: 0.25rem;
  margin-left: 0.5rem;
}

.edit-icon-inline:hover {
  color: var(--text-primary);
}

.more-icon-inline:hover {
  color: var(--text-primary);
}

.chevron-icon {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  transition: all 0.2s var(--spring);
}

.resource-item-clickable:hover .chevron-icon {
  transform: translateX(2px);
  color: var(--accent);
}

/* 模态框样式（使用全局样式） */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-modal-overlay);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s var(--ease), visibility 0.25s var(--ease);
  padding: 20px;
  pointer-events: none;
}

.modal-overlay.show {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.modal-content {
  background: var(--bg-elevated);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--border);
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  transform: scale(0.96) translateY(8px);
  transition: transform 0.3s var(--spring);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
}

.modal-overlay.show .modal-content {
  transform: scale(1) translateY(0);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.1rem;
}

.modal-close:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.detail-info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-info-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-info-value {
  font-size: 0.95rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.detail-info-overview {
  font-size: 0.95rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

.detail-info-link {
  font-size: 0.95rem;
  color: var(--accent);
  text-decoration: none;
  line-height: 1.5;
  word-break: break-all;
}

.detail-info-link:hover {
  text-decoration: underline;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .hero-actions {
    padding: 1rem 1rem 0;
  }
  
  .hero-content {
    padding: 0 1rem 1rem;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .hero-info {
    max-width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .hero-title {
    font-size: 1.5rem;
  }
  
  .hero-overview {
    font-size: 0.8rem;
  }
  
  .detail-content {
    padding: 1rem;
  }
  
  .play-btn-circle {
    padding: 0 1.2rem;
    height: 42px;
    font-size: 0.9rem;
  }
  
  .action-btn-circle {
    width: 42px;
    height: 42px;
    font-size: 1rem;
  }
}

/* 资源模态框样式 */
.modal-resource-list {
  max-height: 400px;
  overflow-y: auto;
}

/* 资源行 - 无容器包裹，参考排行榜样式 */
.resource-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  min-height: 64px;
}

/* 左侧：资源信息 */
.resource-info {
  flex: 1;
  min-width: 0;
  margin-right: 16px;
}

.resource-title {
  color: var(--text-primary);
  font-weight: 400;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.resource-desc {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右侧：操作图标 */
.resource-actions {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.edit-icon,
.more-icon {
  color: var(--text-tertiary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: color 0.2s var(--ease);
  padding: 0.25rem;
}

.edit-icon:hover,
.more-icon:hover {
  color: var(--text-primary);
}

.subtitle-delete-icon {
  color: var(--text-tertiary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: color 0.2s var(--ease);
  padding: 0.25rem;
}

.subtitle-delete-icon:hover {
  color: var(--danger);
}

/* 骨架屏动画 */
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 移动端资源列表模态框适配 */
@media (max-width: 768px) {
  .resource-desc {
    white-space: normal;
    word-wrap: break-word;
    word-break: break-word;
  }
}
</style>

<style>
/* 资源操作下拉菜单 - 非scoped，因为使用Teleport */
.resource-action-dropdown {
  background: var(--bg-elevated);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 0.5px solid var(--border);
  border-radius: 16px;
  padding: 6px;
  min-width: 160px;
  box-shadow: var(--shadow-md);
  animation: dropdown-fade-in 0.2s ease;
}

@keyframes dropdown-fade-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.resource-action-dropdown .dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s ease;
}

.resource-action-dropdown .dropdown-item:hover {
  background: var(--bg-surface-hover);
}

.resource-action-dropdown .dropdown-item i {
  width: 18px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.resource-action-dropdown .dropdown-item.danger {
  color: var(--danger);
}

.resource-action-dropdown .dropdown-item.danger i {
  color: var(--danger);
}
</style>
