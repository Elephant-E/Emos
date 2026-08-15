import { ref, reactive, onMounted, onUnmounted, onActivated, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll.js'

/**
 * 片单详情核心数据域：片单信息、视频列表加载（滚动分页）、搜索、导航。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - detailState：共享片单详情状态（由装配层创建，供其他域使用）
 */
export function useWatchlistDetail({ detailState }) {
  const router = useRouter()
  const route = useRoute()
  const appStore = useAppStore()

  // ================= 状态 =================
  const isLoadingInfo = ref(false)
  const isLoadingMore = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const hasMoreVideos = ref(true)

  // 搜索防抖定时器
  let searchTimeout = null

  // ================= 数据 =================

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

  useInfiniteScroll({
    loadMore: () => loadWatchVideos(false),
    shouldLoad: () => !detailState.isLoading && !isLoadingMore.value && hasMoreVideos.value,
    threshold: 240,
  })

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

  // ================= 导航 =================

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

  // ================= 生命周期 =================

  onMounted(() => {
    const watchId = route.params.id
    if (watchId) {
      detailState.id = watchId
      loadWatchlistInfo(watchId)
      loadWatchVideos()
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

  // keep-alive 激活时刷新数据
  onActivated(() => {
    // 如果路由参数变化，重新加载
    const watchId = route.params.id
    if (watchId && watchId !== detailState.id) {
      detailState.id = watchId
      loadWatchlistInfo(watchId)
      loadWatchVideos()
    }
  })

  // 组件卸载时清理搜索防抖定时器
  onUnmounted(() => {
    clearTimeout(searchTimeout)
  })

  // 监听账号切换，重新加载片单详情
  watch(() => appStore.userInfo, (newUserInfo) => {
    if (newUserInfo && detailState.id) {
      // 切换账号后重新加载片单信息和视频列表
      loadWatchlistInfo(detailState.id)
      loadWatchVideos(true)
    }
  }, { immediate: false })

  return {
    isLoadingInfo,
    isLoadingMore,
    currentPage,
    pageSize,
    hasMoreVideos,
    applyWatchlistDetail,
    loadWatchlistInfo,
    loadWatchVideos,
    backToList,
    goToVideoDetail,
    handleDetailSearchInput,
  }
}