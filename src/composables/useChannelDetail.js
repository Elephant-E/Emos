import { ref, reactive, onMounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import liveApi from '@/api/liveApi.js'
import { showToast } from '@/utils/toast.js'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll.js'

/**
 * 直播频道详情核心数据域：频道信息、资源列表加载（滚动分页）、搜索、导航。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - detailState：共享频道详情状态（装配层创建）
 */
export function useChannelDetail({ detailState }) {
  const router = useRouter()
  const route = useRoute()

  // ================= 状态 =================
  const isLoadingInfo = ref(false)
  const isLoadingMore = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const hasMoreMedias = ref(true)

  // 搜索防抖定时器
  let searchTimeout = null

  // ================= 数据 =================

  const applyChannelDetail = (channel = {}) => {
    detailState.title = channel.title || ''
    detailState.description = channel.description || ''
    detailState.tagline = channel.tagline || ''
    detailState.imagePosterUrl = channel.image_poster_url || ''
    detailState.code = channel.code || ''
    detailState.mediaCount = channel.media_count || 0
    detailState.isCanEdit = channel.is_can_edit === true
  }

  // 加载频道基本信息
  const loadChannelInfo = async (channelId) => {
    isLoadingInfo.value = true
    try {
      const response = await liveApi.getChannelList({ id: channelId })

      // API 返回的可能是数组或直接对象
      let channel
      if (Array.isArray(response)) {
        channel = response[0]
      } else if (response && response.items && Array.isArray(response.items)) {
        // 如果返回的是分页格式 { items: [...] }
        channel = response.items[0]
      } else {
        channel = response
      }

      if (!channel) {
        throw new Error('频道不存在或无权访问')
      }

      applyChannelDetail(channel)
    } catch (error) {
      console.error('加载频道信息失败:', error)
      showToast(error.message || '加载失败', 'error')
      // 如果有历史记录，返回上一页；否则跳转到媒体页面
      if (window.history.length > 1) {
        router.back()
      } else {
        router.push('/media')
      }
    } finally {
      isLoadingInfo.value = false
    }
  }

  useInfiniteScroll({
    loadMore: () => loadChannelMedias(false),
    shouldLoad: () => !detailState.isLoading && !isLoadingMore.value && hasMoreMedias.value,
    threshold: 240,
  })

  // 加载频道资源列表
  const loadChannelMedias = async (reset = true) => {
    if (!detailState.id) return

    if (reset) {
      detailState.isLoading = true
      currentPage.value = 1
      hasMoreMedias.value = true
    } else {
      if (!hasMoreMedias.value) return
      isLoadingMore.value = true
    }

    try {
      const response = await liveApi.getMediaList({
        live_list_id: detailState.id,
        page: currentPage.value,
        page_size: pageSize.value,
        name: detailState.searchQuery.trim() || undefined
      })
      const items = response.items || []
      const total = response.total ?? items.length

      if (reset) {
        detailState.medias = items
      } else {
        detailState.medias = [...detailState.medias, ...items]
      }

      detailState.mediaCount = total
      hasMoreMedias.value = detailState.medias.length < total && items.length > 0

      if (hasMoreMedias.value) {
        currentPage.value += 1
      }
    } catch (error) {
      console.error('加载频道资源失败:', error)
      showToast(error.message || '加载失败', 'error')
    } finally {
      if (reset) {
        detailState.isLoading = false
      } else {
        isLoadingMore.value = false
      }
    }
  }

  // ================= 导航/搜索 =================

  // 返回频道列表
  const backToList = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push('/media')
  }

  // 处理搜索输入（防抖）
  const handleSearchInput = () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      loadChannelMedias(true)
    }, 300)
  }

  // ================= 生命周期 =================

  onMounted(() => {
    const channelId = route.params.id
    if (channelId) {
      detailState.id = channelId
      loadChannelInfo(channelId)
      loadChannelMedias()
    } else {
      showToast('无效的频道ID', 'error')
      // 如果有历史记录，返回上一页；否则跳转到媒体页面
      if (window.history.length > 1) {
        router.back()
      } else {
        router.push('/media')
      }
    }
  })

  // keep-alive 激活时刷新数据
  onActivated(() => {
    // 如果路由参数变化，重新加载
    const channelId = route.params.id
    if (channelId && channelId !== detailState.id) {
      detailState.id = channelId
      loadChannelInfo(channelId)
      loadChannelMedias()
    }
  })

  return {
    isLoadingInfo,
    isLoadingMore,
    currentPage,
    pageSize,
    hasMoreMedias,
    applyChannelDetail,
    loadChannelInfo,
    loadChannelMedias,
    backToList,
    handleSearchInput,
  }
}