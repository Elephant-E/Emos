import { ref } from 'vue'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import { normalizeList } from '@/utils/format.js'

/**
 * 片单「添加视频」域：搜索可添加视频、多选、批量添加。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - detailState：共享片单详情状态（含 id）
 *   - modals：共享模态框状态（addVideo 开关）
 *   - loadWatchVideos(reset)：添加成功后刷新视频列表
 */
export function useAddVideo({ detailState, modals, loadWatchVideos }) {
  // ================= 状态 =================
  const addVideoSearch = ref('')
  const searchResults = ref([])
  const selectedVideos = ref([])
  const isLoadingVideos = ref(false)
  const addVideoSkeletonCount = 6

  // 搜索防抖定时器
  let addVideoSearchTimeout = null

  // ================= 模态框 =================

  const closeAddVideoModal = () => {
    modals.addVideo = false
    addVideoSearch.value = ''
    searchResults.value = []
    selectedVideos.value = []
  }

  // 打开添加视频模态框
  const openAddVideoModal = async () => {
    addVideoSearch.value = ''
    searchResults.value = []
    selectedVideos.value = []
    modals.addVideo = true
    await loadAvailableVideos()
  }

  // ================= 搜索 =================

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

  // 搜索视频（防抖）
  const searchVideos = () => {
    clearTimeout(addVideoSearchTimeout)
    addVideoSearchTimeout = setTimeout(() => {
      loadAvailableVideos(addVideoSearch.value)
    }, 300)
  }

  // ================= 选择 =================

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

  // ================= 添加 =================

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

  return {
    addVideoSearch,
    searchResults,
    selectedVideos,
    isLoadingVideos,
    addVideoSkeletonCount,
    closeAddVideoModal,
    openAddVideoModal,
    loadAvailableVideos,
    searchVideos,
    toggleVideoSelection,
    isVideoSelected,
    addVideos,
  }
}