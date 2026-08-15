import { ref } from 'vue'
import { userApi } from '@/api/userApi.js'
import { showToast } from '@/utils/toast.js'

/**
 * 账号「封禁管理」域：封禁列表加载、封禁/解禁操作。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - isAdmin：管理员判定（懒求值）
 */
export function useBanManager({ isAdmin }) {
  // ================= 状态 =================
  const isBanListModalVisible = ref(false)
  const isLoadingBanList = ref(false)
  const isUpdatingBanStatus = ref(false)

  // 封禁列表数据
  const banList = ref([])
  const currentBanUser = ref(null)
  const banReasonForm = ref({ reason: '' })

  // ================= 模态框 =================

  const openBanListModal = async () => {
    if (!isAdmin.value) {
      showToast('仅管理员可访问', 'error')
      return
    }

    isBanListModalVisible.value = true
    await loadBanList()
  }

  const closeBanListModal = () => {
    isBanListModalVisible.value = false
    banList.value = []
    currentBanUser.value = null
    banReasonForm.value.reason = ''
  }

  // ================= 数据 =================

  const loadBanList = async () => {
    try {
      isLoadingBanList.value = true
      const res = await userApi.getBanList()
      if (res && Array.isArray(res)) {
        banList.value = res
      }
    } catch (error) {
      showToast('加载封禁列表失败: ' + error.message, 'error')
    } finally {
      isLoadingBanList.value = false
    }
  }

  // ================= 操作 =================

  const openUpdateBanStatus = (user) => {
    currentBanUser.value = user
    banReasonForm.value.reason = ''
  }

  const updateBanStatus = async (type) => {
    if (!currentBanUser.value) return
    if (isUpdatingBanStatus.value) return

    const reason = banReasonForm.value.reason.trim()
    if (!reason) {
      showToast('请输入原因', 'error')
      return
    }

    isUpdatingBanStatus.value = true

    try {
      await userApi.updateBanStatus(type, currentBanUser.value.user_id, reason)
      showToast(type === 'disable' ? '封禁成功' : '解禁成功', 'success')
      closeBanListModal()
    } catch (error) {
      showToast('操作失败: ' + error.message, 'error')
    } finally {
      isUpdatingBanStatus.value = false
    }
  }

  return {
    isBanListModalVisible,
    isLoadingBanList,
    isUpdatingBanStatus,
    banList,
    currentBanUser,
    banReasonForm,
    openBanListModal,
    closeBanListModal,
    loadBanList,
    openUpdateBanStatus,
    updateBanStatus,
  }
}