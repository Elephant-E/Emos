import { reactive } from 'vue'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'

/**
 * 片单内「视频编辑/移除」域：修改视频排序与备注、移除视频。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - detailState：共享片单详情状态（含 id）
 *   - modals：共享模态框状态（editVideo 开关）
 *   - loadWatchVideos(reset)：编辑/删除成功后刷新视频列表
 */
export function useVideoEdit({ detailState, modals, loadWatchVideos }) {
  // ================= 状态 =================
  // 视频编辑表单
  const videoEditForm = reactive({
    videoId: null,
    sort: 80,
    remark: ''
  })

  // ================= 模态框 =================

  const closeEditVideoModal = () => {
    modals.editVideo = false
    videoEditForm.videoId = null
    videoEditForm.sort = 80
    videoEditForm.remark = ''
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

  // ================= 移除 =================

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

  return {
    videoEditForm,
    closeEditVideoModal,
    openVideoEditModal,
    saveVideoEdit,
    removeVideo,
  }
}