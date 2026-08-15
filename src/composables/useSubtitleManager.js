import { ref } from 'vue'
import videoApi from '@/api/videoApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'

/**
 * 字幕管理域：字幕列表、编辑重命名、删除（自删直删 / 他人删需原因）。
 *
 * 依赖注入（与原实现同源）：
 *   - getNumericId(videoId)：解析视频纯数字 ID
 *   - videoId：当前视频 ID（ref）
 *   - selectedEpisode：当前选中集（ref）
 *   - currentResource：当前操作资源（ref，来自资源操作域）
 *   - showActionDropdown：操作下拉菜单（ref，来自资源操作域）
 */
export function useSubtitleManager({ getNumericId, videoId, selectedEpisode, currentResource, showActionDropdown }) {
  // ================= 状态 =================
  const showSubtitleModal = ref(false)
  const subtitles = ref([])
  const isLoadingSubtitles = ref(false)

  const showEditSubtitleModal = ref(false)
  const currentSubtitle = ref(null)
  const editSubtitleForm = ref({ subtitle_id: '', subtitle_title: '' })
  const isEditingSubtitle = ref(false)

  const showDeleteSubtitleModal = ref(false)
  const deleteSubtitleForm = ref({ subtitle_id: '', reason: '' })

  // ================= 加载 =================

  const manageSubtitles = async (resource) => {
    currentResource.value = resource
    showSubtitleModal.value = true
    showActionDropdown.value = false
    await loadSubtitles(resource.media_id)
  }

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

  const closeSubtitleModal = () => {
    showSubtitleModal.value = false
    subtitles.value = []
  }

  // ================= 编辑重命名 =================

  const closeEditSubtitleModal = () => {
    showEditSubtitleModal.value = false
    currentSubtitle.value = null
    editSubtitleForm.value = { subtitle_id: '', subtitle_title: '' }
  }

  const editSubtitle = (subtitle) => {
    currentSubtitle.value = subtitle
    editSubtitleForm.value = {
      subtitle_id: subtitle.subtitle_id,
      subtitle_title: subtitle.subtitle_title || ''
    }
    showEditSubtitleModal.value = true
  }

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
      await loadSubtitles(currentResource.value?.media_id)
    } catch (error) {
      showToast('重命名失败: ' + error.message, 'error')
    } finally {
      isEditingSubtitle.value = false
    }
  }

  // ================= 删除 =================

  const closeDeleteSubtitleModal = () => {
    showDeleteSubtitleModal.value = false
    deleteSubtitleForm.value = { subtitle_id: '', reason: '' }
  }

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
      if (await confirmDialog('确定要删除这个字幕吗？', '确认', true)) {
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

  return {
    showSubtitleModal,
    subtitles,
    isLoadingSubtitles,
    showEditSubtitleModal,
    currentSubtitle,
    editSubtitleForm,
    isEditingSubtitle,
    showDeleteSubtitleModal,
    deleteSubtitleForm,
    manageSubtitles,
    loadSubtitles,
    closeSubtitleModal,
    closeEditSubtitleModal,
    editSubtitle,
    submitEditSubtitle,
    closeDeleteSubtitleModal,
    confirmDeleteSubtitle,
    submitDeleteSubtitle,
    deleteSubtitle,
  }
}