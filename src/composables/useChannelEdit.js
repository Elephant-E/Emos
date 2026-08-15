import { ref, reactive } from 'vue'
import liveApi from '@/api/liveApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'

/**
 * 直播频道编辑域：编辑频道信息、删除频道。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - detailState：共享频道详情状态
 *   - modals：共享模态框状态（editChannel 开关）
 *   - loadChannelInfo(channelId)：保存后刷新频道信息
 */
export function useChannelEdit({ detailState, modals, loadChannelInfo }) {
  // ================= 状态 =================
  // 编辑频道表单
  const editChannelForm = reactive({
    id: null,
    title: '',
    description: '',
    tagline: '',
    imagePosterUrl: ''  // 新 API：使用 URL
  })

  const isSubmittingChannel = ref(false)

  // ================= 模态框 =================

  const closeEditChannelModal = () => {
    modals.editChannel = false
    editChannelForm.id = null
    editChannelForm.title = ''
    editChannelForm.description = ''
    editChannelForm.tagline = ''
    editChannelForm.imagePosterUrl = ''
  }

  // 打开编辑频道模态框
  const openEditChannelModal = () => {
    editChannelForm.id = detailState.id
    editChannelForm.title = detailState.title
    editChannelForm.description = detailState.description || ''
    editChannelForm.tagline = detailState.tagline || ''
    // 默认显示当前频道的封面图片
    editChannelForm.imagePosterUrl = detailState.imagePosterUrl || ''  // 新 API：使用 URL
    isSubmittingChannel.value = false
    modals.editChannel = true
  }

  // 保存编辑频道
  const saveEditChannel = async () => {
    if (!editChannelForm.title.trim()) {
      showToast('请输入频道标题', 'warning')
      return
    }

    isSubmittingChannel.value = true

    try {
      const requestData = {
        id: editChannelForm.id,
        title: editChannelForm.title.trim(),
        description: editChannelForm.description.trim() || null,
        tagline: editChannelForm.tagline.trim() || null
      }

      // 如果有上传图片，添加到请求中
      if (editChannelForm.imagePosterUrl) {
        requestData.image_poster_url = editChannelForm.imagePosterUrl  // 新 API：使用 URL
      }

      await liveApi.createOrUpdateChannel(requestData)

      showToast('频道信息已更新', 'success')
      modals.editChannel = false

      // 重新加载频道信息
      await loadChannelInfo(detailState.id)
    } catch (error) {
      console.error('更新频道失败:', error)
      showToast(error.message || '更新失败', 'error')
    } finally {
      isSubmittingChannel.value = false
    }
  }

  // ================= 删除频道 =================

  const deleteChannel = async () => {
    if (!detailState.id) return
    if (!(await confirmDialog('确定要删除该频道吗？此操作不可恢复！', '确认', true))) return

    try {
      await liveApi.deleteChannel(detailState.id)
      showToast('频道已删除', 'success')
      routerPushMedia()
    } catch (error) {
      console.error('删除频道失败:', error)
      showToast(error.message || '删除失败', 'error')
    }
  }

  // 删除后跳转媒体页（注入路由跳转）
  let routerPushMedia = () => {}

  const setRouterPushMedia = (fn) => {
    routerPushMedia = fn
  }

  return {
    editChannelForm,
    isSubmittingChannel,
    closeEditChannelModal,
    openEditChannelModal,
    saveEditChannel,
    deleteChannel,
    setRouterPushMedia,
  }
}