import { ref } from 'vue'

/**
 * 上传项「音乐候选选择」模态框域：打开/关闭/选择候选歌曲。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - uploadStore：上传队列 store（selectMusicCandidate）
 */
export function useMusicSelect({ uploadStore }) {
  // ================= 状态 =================
  const musicSelectVisible = ref(false)
  const musicSelectCandidates = ref([])
  const musicSelectItemId = ref(null)
  const musicSelectTitle = ref('')

  // ================= 模态框 =================

  const closeMusicSelectModal = () => {
    musicSelectVisible.value = false
    musicSelectItemId.value = null
    musicSelectCandidates.value = []
    musicSelectTitle.value = ''
  }

  const openMusicSelect = (item) => {
    musicSelectItemId.value = item.id
    musicSelectCandidates.value = item.musicCandidates
    musicSelectTitle.value = item.videoInfo?.title || item.name
    musicSelectVisible.value = true
  }

  // ================= 选择 =================

  const handleMusicSelect = (song) => {
    uploadStore.selectMusicCandidate(musicSelectItemId.value, song.song_id)
    musicSelectVisible.value = false
  }

  return {
    musicSelectVisible,
    musicSelectCandidates,
    musicSelectItemId,
    musicSelectTitle,
    closeMusicSelectModal,
    openMusicSelect,
    handleMusicSelect,
  }
}