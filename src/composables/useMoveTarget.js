import { ref } from 'vue'
import videoApi from '@/api/videoApi.js'
import { showToast } from '@/utils/toast.js'
import { normalizeList } from '@/utils/format.js'

/**
 * 移动资源目标选择域：搜索目标视频、加载季/集树、选择目标、提交移动。
 *
 * 依赖注入（与原实现同源）：
 *   - currentResource：当前操作资源（ref，来自资源操作域）
 *   - showActionDropdown：操作下拉菜单（ref，来自资源操作域）
 *   - loadResourcesForEpisode(seasonId, episodeId)：移动成功后刷新资源
 *   - selectedEpisode：当前选中集（ref）
 */
export function useMoveTarget({ currentResource, showActionDropdown, loadResourcesForEpisode, selectedEpisode }) {
  // ================= 状态 =================
  const showMoveModal = ref(false)
  const moveForm = ref({ media_id: '', item_type: 've', item_id: '' })
  const isMoving = ref(false)
  const moveSearchQuery = ref('')
  const moveSearchResults = ref([])
  const moveSearching = ref(false)
  const moveSearched = ref(false)
  const selectedMoveVideo = ref(null)
  const moveTreeData = ref([])
  const moveTreeLoading = ref(false)
  const expandedMoveSeasons = ref({})
  const selectedMoveTarget = ref(null)
  let moveDebounceTimer = null

  // ================= 搜索 =================

  const handleMoveSearchInput = () => {
    clearTimeout(moveDebounceTimer)
    moveDebounceTimer = setTimeout(() => {
      searchMoveTarget()
    }, 500)
  }

  const searchMoveTarget = async () => {
    if (!moveSearchQuery.value.trim()) return
    moveSearching.value = true
    moveSearched.value = false
    moveSearchResults.value = []
    selectedMoveVideo.value = null
    moveTreeData.value = []
    selectedMoveTarget.value = null
    try {
      const res = await videoApi.search({ title: moveSearchQuery.value.trim(), page_size: 20 })
      moveSearchResults.value = normalizeList(res)
    } catch (error) {
      showToast('搜索失败', 'error')
    } finally {
      moveSearching.value = false
      moveSearched.value = true
    }
  }

  // ================= 树加载 =================

  const selectMoveVideo = async (video) => {
    selectedMoveVideo.value = video
    moveTreeData.value = []
    selectedMoveTarget.value = null
    expandedMoveSeasons.value = {}
    if (video.video_type === 'movie') {
      selectedMoveTarget.value = { item_type: 'vl', item_id: video.video_id, label: video.video_title }
    } else {
      moveTreeLoading.value = true
      try {
        const tree = await videoApi.tree({ video_id: video.video_id })
        const videoList = Array.isArray(tree) ? tree : (tree?.items || [])
        const videoData = videoList[0]
        moveTreeData.value = videoData?.seasons || []
      } catch (error) {
        showToast('加载季集信息失败', 'error')
      } finally {
        moveTreeLoading.value = false
      }
    }
  }

  // ================= 选择 =================

  const selectMoveEpisode = (episode) => {
    selectedMoveTarget.value = { item_type: episode.item_type, item_id: episode.item_id, label: `${episode.episode_title}` }
  }

  const toggleMoveSeason = (seasonIdx) => {
    expandedMoveSeasons.value[seasonIdx] = !expandedMoveSeasons.value[seasonIdx]
  }

  // ================= 模态框 =================

  const moveResource = async (resource) => {
    currentResource.value = resource
    moveForm.value = { media_id: resource.media_id, item_type: 've', item_id: '' }
    moveSearchQuery.value = ''
    moveSearchResults.value = []
    selectedMoveVideo.value = null
    moveTreeData.value = []
    selectedMoveTarget.value = null
    moveSearched.value = false
    showMoveModal.value = true
    showActionDropdown.value = false
  }

  const closeMoveModal = () => {
    showMoveModal.value = false
    moveForm.value = { media_id: '', item_type: 've', item_id: '' }
    moveSearchQuery.value = ''
    moveSearchResults.value = []
    selectedMoveVideo.value = null
    moveTreeData.value = []
    selectedMoveTarget.value = null
    moveSearched.value = false
  }

  const submitMove = async () => {
    if (isMoving.value || !selectedMoveTarget.value) return
    isMoving.value = true
    try {
      await videoApi.moveMedia({
        media_id: moveForm.value.media_id,
        item_type: selectedMoveTarget.value.item_type,
        item_id: selectedMoveTarget.value.item_id
      })
      showToast('移动成功', 'success')
      closeMoveModal()
      await loadResourcesForEpisode(selectedEpisode.value?.season_id || null, selectedEpisode.value?.episode_id || null)
    } catch (error) {
      showToast('移动失败: ' + error.message, 'error')
    } finally {
      isMoving.value = false
    }
  }

  return {
    showMoveModal,
    moveForm,
    isMoving,
    moveSearchQuery,
    moveSearchResults,
    moveSearching,
    moveSearched,
    selectedMoveVideo,
    moveTreeData,
    moveTreeLoading,
    expandedMoveSeasons,
    selectedMoveTarget,
    handleMoveSearchInput,
    searchMoveTarget,
    selectMoveVideo,
    selectMoveEpisode,
    toggleMoveSeason,
    moveResource,
    closeMoveModal,
    submitMove,
  }
}