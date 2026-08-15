import { ref, reactive } from 'vue'
import liveApi from '@/api/liveApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'

/**
 * 直播频道「媒体管理」域：添加直播源（批量表单）、删除直播源。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - detailState：共享频道详情状态（含 id）
 *   - modals：共享模态框状态（addMedia 开关）
 *   - loadChannelMedias(reset)：添加/删除后刷新资源列表
 */
export function useChannelMedia({ detailState, modals, loadChannelMedias }) {
  // ================= 状态 =================
  // 添加直播源表单（支持批量）
  const mediaFormList = ref([
    { name: '', pathUrl: '', pathType: 'm3u8' }
  ])

  const isSavingMedia = ref(false)

  // ================= 模态框 =================

  const closeAddMediaModal = () => {
    modals.addMedia = false
    mediaFormList.value = [{ name: '', pathUrl: '', pathType: 'm3u8' }]
  }

  // 打开添加直播源模态框
  const openAddMediaModal = () => {
    // 重置为一个空表单行
    mediaFormList.value = [
      { name: '', pathUrl: '', pathType: 'm3u8' }
    ]
    modals.addMedia = true
  }

  // ================= 表单行 =================

  // 添加新的表单行
  const addMediaRow = () => {
    mediaFormList.value.push({ name: '', pathUrl: '', pathType: 'm3u8' })
  }

  // 删除表单行
  const removeMediaRow = (index) => {
    if (mediaFormList.value.length > 1) {
      mediaFormList.value.splice(index, 1)
    } else {
      showToast('至少保留一个表单行', 'warning')
    }
  }

  // ================= 保存 =================

  // 保存直播源（使用批量更新 API）
  const saveMedia = async () => {
    if (isSavingMedia.value) return

    // 验证所有表单行
    for (let i = 0; i < mediaFormList.value.length; i++) {
      const row = mediaFormList.value[i]
      if (!row.name.trim()) {
        showToast(`第 ${i + 1} 行的直播源名称不能为空`, 'warning')
        return
      }
      if (!row.pathUrl.trim()) {
        showToast(`第 ${i + 1} 行的直播源地址不能为空`, 'warning')
        return
      }
    }

    isSavingMedia.value = true

    try {
      // 构建批量提交数据
      const medias = mediaFormList.value
        .filter(row => row.name.trim() && row.pathUrl.trim())
        .map(row => ({
          name: row.name.trim(),
          path_type: row.pathType,
          path_url: row.pathUrl.trim()
        }))

      if (medias.length === 0) {
        showToast('请至少填写一个有效的直播源', 'warning')
        return
      }

      // 使用批量更新 API 添加直播源
      await liveApi.updateMediaBatch({
        live_list_id: detailState.id,
        medias: medias
      })

      showToast(`成功添加 ${medias.length} 个直播源`, 'success')
      modals.addMedia = false
      await loadChannelMedias(true)
    } catch (error) {
      console.error('添加直播源失败:', error)
      showToast(error.message || '添加失败', 'error')
    } finally {
      isSavingMedia.value = false
    }
  }

  // ================= 删除直播源 =================

  const deleteMedia = async (mediaId) => {
    if (!(await confirmDialog('确定要删除该直播源吗？', '确认', true))) return

    try {
      await liveApi.deleteMedia(mediaId)
      showToast('直播源已删除', 'success')
      await loadChannelMedias(true)
    } catch (error) {
      console.error('删除直播源失败:', error)
      showToast(error.message || '删除失败', 'error')
    }
  }

  return {
    mediaFormList,
    isSavingMedia,
    closeAddMediaModal,
    openAddMediaModal,
    addMediaRow,
    removeMediaRow,
    saveMedia,
    deleteMedia,
  }
}