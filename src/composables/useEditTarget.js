import { ref } from 'vue'
import videoApi from '@/api/videoApi.js'
import musicApi from '@/api/musicApi.js'
import { showToast } from '@/utils/toast.js'

/**
 * 上传项「编辑关联资源」目标选择域：搜索目标视频/音乐、加载季集树、选择目标、提交更新。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - uploadStore：上传队列 store（更新 queue[idx]）
 */
export function useEditTarget({ uploadStore }) {
  // ================= 状态 =================
  const editModalVisible = ref(false)
  const editItemId = ref(null)
  const editItemType = ref(null)
  const editSearchKeyword = ref('')
  const editSearchResults = ref([])
  const editSearching = ref(false)
  const editSearched = ref(false)
  const editSubmitting = ref(false)
  const editSelectedVideo = ref(null)
  const editTreeData = ref([])
  const editTreeLoading = ref(false)
  const editExpandedSeasons = ref({})
  const editSelectedTarget = ref(null)

  let editDebounceTimer = null

  // ================= 模态框 =================

  const closeEditModal = () => {
    editModalVisible.value = false
    editItemId.value = null
    editItemType.value = null
    editSearchKeyword.value = ''
    editSearchResults.value = []
    editSearching.value = false
    editSearched.value = false
    editSubmitting.value = false
    editSelectedVideo.value = null
    editTreeData.value = []
    editTreeLoading.value = false
    editExpandedSeasons.value = {}
    editSelectedTarget.value = null
  }

  const openEditModal = (item) => {
    editItemId.value = item.id
    editItemType.value = item.type
    editSearchKeyword.value = ''
    editModalVisible.value = true
  }

  // ================= 搜索 =================

  const handleEditSearchInput = () => {
    clearTimeout(editDebounceTimer)
    editDebounceTimer = setTimeout(() => {
      performEditSearch()
    }, 500)
  }

  const performEditSearch = async () => {
    const keyword = editSearchKeyword.value.trim()
    if (!keyword) return

    editSearching.value = true
    editSearched.value = false
    editSearchResults.value = []
    editSelectedVideo.value = null
    editTreeData.value = []
    editSelectedTarget.value = null

    try {
      if (editItemType.value === 'video' || editItemType.value === 'subtitle') {
        const data = await videoApi.search({ title: keyword, page: 1, page_size: 20 })
        editSearchResults.value = data.items || []
      } else if (editItemType.value === 'music') {
        const data = await musicApi.songSearch({ name: keyword, page: 1, page_size: 20 })
        editSearchResults.value = data.items || []
      }
    } catch (error) {
      showToast('搜索失败: ' + (error.message || '未知错误'), 'error')
    } finally {
      editSearching.value = false
      editSearched.value = true
    }
  }

  // ================= 目标选择 =================

  const selectEditVideo = async (video) => {
    editSelectedVideo.value = video
    editTreeData.value = []
    editSelectedTarget.value = null
    editExpandedSeasons.value = {}

    if (video.video_type === 'movie') {
      editSelectedTarget.value = {
        item_type: 'vl',
        item_id: video.video_id,
        label: video.video_title,
        video_type: 'movie'
      }
    } else {
      editTreeLoading.value = true
      try {
        const tree = await videoApi.tree({ video_id: video.video_id })
        const videoList = Array.isArray(tree) ? tree : (tree?.items || [])
        const videoData = videoList[0]
        editTreeData.value = videoData?.seasons || []
      } catch (error) {
        showToast('加载季集信息失败', 'error')
      } finally {
        editTreeLoading.value = false
      }
    }
  }

  const toggleEditSeason = (sIdx) => {
    editExpandedSeasons.value[sIdx] = !editExpandedSeasons.value[sIdx]
  }

  const selectEditEpisode = (episode) => {
    editSelectedTarget.value = {
      item_type: episode.item_type,
      item_id: episode.item_id,
      label: episode.episode_title,
      video_type: 'tv'
    }
  }

  const handleEditSelectMusic = (song) => {
    editSelectedVideo.value = song
    editSelectedTarget.value = {
      name: song.name,
      song_id: song.song_id,
      person_artists: song.person_artists || []
    }
  }

  // ================= 提交 =================

  const handleEditSelect = async () => {
    if (!editSelectedTarget.value) return

    editSubmitting.value = true
    try {
      const idx = uploadStore.queue.findIndex(i => i.id === editItemId.value)
      if (idx === -1) return

      if (editItemType.value === 'video' || editItemType.value === 'subtitle') {
        uploadStore.queue[idx].videoInfo = {
          title: editSelectedVideo.value.video_title,
          item_type: editSelectedTarget.value.item_type,
          item_id: editSelectedTarget.value.item_id,
          video_type: editSelectedTarget.value.video_type
        }
      } else if (editItemType.value === 'music') {
        const result = editSelectedTarget.value
        uploadStore.queue[idx].videoInfo = {
          title: result.name,
          item_type: 'music',
          item_id: result.song_id,
          song_id: result.song_id,
          person_artists: result.person_artists || []
        }
      }

      if (uploadStore.queue[idx].status === 'failed') {
        uploadStore.queue[idx].status = 'ready'
        uploadStore.queue[idx].error = null
      }

      uploadStore.queue[idx].updatedAt = Date.now()
      showToast('已更新关联资源', 'success')
      closeEditModal()
    } catch (error) {
      showToast('更新失败: ' + (error.message || '未知错误'), 'error')
    } finally {
      editSubmitting.value = false
    }
  }

  // ================= 辅助 =================

  const canEditItem = (item) => {
    return item.status === 'completed' || item.status === 'failed' || item.status === 'ready'
  }

  return {
    editModalVisible,
    editItemId,
    editItemType,
    editSearchKeyword,
    editSearchResults,
    editSearching,
    editSearched,
    editSubmitting,
    editSelectedVideo,
    editTreeData,
    editTreeLoading,
    editExpandedSeasons,
    editSelectedTarget,
    closeEditModal,
    openEditModal,
    handleEditSearchInput,
    performEditSearch,
    selectEditVideo,
    toggleEditSeason,
    selectEditEpisode,
    handleEditSelectMusic,
    handleEditSelect,
    canEditItem,
  }
}