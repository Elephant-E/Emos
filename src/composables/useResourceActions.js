import { ref } from 'vue'
import videoApi from '@/api/videoApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'

/**
 * 资源操作域：下拉菜单、资源列表模态框、重命名、删除资源。
 *
 * 依赖注入（共享 ref / 刷新回调）：
 *   - selectedEpisode：当前选中集（来自 useVideoDetail）
 *   - loadResourcesForEpisode(seasonId, episodeId)：刷新集资源
 *   - loadResourcesForMovie()：刷新电影资源
 */
export function useResourceActions({ selectedEpisode, loadResourcesForEpisode, loadResourcesForMovie }) {
  // ================= 状态 =================
  const showResourcesModal = ref(false)
  const isLoadingResources = ref(false)
  const currentResource = ref(null)

  // 操作下拉菜单
  const showActionDropdown = ref(false)
  const dropdownPosition = ref({ top: 0, left: 0 })

  // 重命名模态框
  const showRenameModal = ref(false)
  const renameForm = ref({ media_id: '', name: '' })
  const isRenaming = ref(false)

  // 删除模态框
  const showDeleteModal = ref(false)
  const deleteForm = ref({ media_id: '', reason: '' })

  // ================= 下拉菜单 =================

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
      top: rect.bottom + 8, // 图标下方 8px
      left: rect.right - 160 // 右对齐图标
    }

    showActionDropdown.value = true
  }

  const closeActionDropdown = () => {
    showActionDropdown.value = false
  }

  // 全局点击关闭下拉菜单
  const handleGlobalClick = (event) => {
    // 如果点击的是下拉菜单内部，不关闭
    if (event.target.closest('.resource-action-dropdown')) {
      return
    }
    showActionDropdown.value = false
  }

  // ================= 资源列表模态框 =================

  const openResourcesModal = async (episode) => {
    selectedEpisode.value = episode
    showResourcesModal.value = true // 先显示模态框（带骨架屏）

    // 根据是否有 season_id 判断是剧集还是电影
    if (episode.season_id && episode.episode_id) {
      // 剧集：使用 season_id 和 episode_id 加载
      await loadResourcesForEpisode(episode.season_id, episode.episode_id)
    } else if (episode.media_id) {
      // 电影：直接加载资源列表
      await loadResourcesForMovie()
    }
  }

  const closeResourcesModal = () => {
    showResourcesModal.value = false
    showActionDropdown.value = false // 关闭下拉菜单
  }

  // ================= 重命名 =================

  const openRenameModal = (resource) => {
    currentResource.value = resource
    renameForm.value = {
      media_id: resource.media_id,
      name: resource.media_name || ''
    }
    showRenameModal.value = true
    showActionDropdown.value = false // 关闭下拉菜单
  }

  const closeRenameModal = () => {
    showRenameModal.value = false
    renameForm.value = { media_id: '', name: '' }
    currentResource.value = null
  }

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
      await loadResourcesForEpisode(selectedEpisode.value?.season_id || null, selectedEpisode.value?.episode_id || null)
    } catch (error) {
      showToast('重命名失败: ' + error.message, 'error')
    } finally {
      isRenaming.value = false
    }
  }

  // ================= 删除资源 =================

  const deleteResource = async (resource) => {
    currentResource.value = resource

    // 判断是否是自己上传的资源
    if (resource.is_self_upload) {
      // 自己上传的资源，二次确认
      if (await confirmDialog('确定要删除这个资源吗？', '确认', true)) {
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

  const closeDeleteModal = () => {
    showDeleteModal.value = false
    deleteForm.value = { media_id: '', reason: '' }
  }

  const confirmDelete = async (mediaId, reason) => {
    try {
      await videoApi.deleteMedia({
        media_id: mediaId,
        reason: reason
      })
      showToast('删除成功', 'success')
      closeDeleteModal()
      // 重新加载资源列表
      await loadResourcesForEpisode(selectedEpisode.value?.season_id || null, selectedEpisode.value?.episode_id || null)
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

  return {
    showResourcesModal,
    isLoadingResources,
    currentResource,
    showActionDropdown,
    dropdownPosition,
    showRenameModal,
    renameForm,
    isRenaming,
    showDeleteModal,
    deleteForm,
    showDropdown,
    closeActionDropdown,
    handleGlobalClick,
    openResourcesModal,
    closeResourcesModal,
    openRenameModal,
    closeRenameModal,
    submitRename,
    deleteResource,
    closeDeleteModal,
    confirmDelete,
    submitDelete,
  }
}