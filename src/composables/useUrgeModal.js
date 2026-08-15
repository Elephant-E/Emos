import { ref } from 'vue'
import seekApi from '@/api/seekApi.js'
import { showToast } from '@/utils/toast.js'

/**
 * 催上片模态框域：打开/关闭/提交催片。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - resetAndLoad()：催片成功后刷新列表
 */
export function useUrgeModal({ resetAndLoad }) {
  // ================= 状态 =================
  const showUrgeModal = ref(false)
  const currentSeekId = ref(null)
  const urgeCarrot = ref('')
  const urgeError = ref('')
  const urging = ref(false)

  // ================= 模态框 =================

  // 打开催上片模态框
  const openUrgeModal = (seekId) => {
    currentSeekId.value = seekId
    urgeCarrot.value = ''
    urgeError.value = ''
    showUrgeModal.value = true
  }

  // 关闭催上片模态框
  const closeUrgeModal = () => {
    showUrgeModal.value = false
    currentSeekId.value = null
    urgeCarrot.value = ''
    urgeError.value = ''
  }

  // 催上片
  const handleUrge = async () => {
    const carrot = parseInt(urgeCarrot.value)

    if (!carrot || carrot < 1 || carrot > 5000) {
      urgeError.value = '请输入 1-5000 之间的有效数字'
      return
    }

    urging.value = true

    try {
      await seekApi.urge(currentSeekId.value, carrot)

      showToast('催片成功！', 'success')
      closeUrgeModal()

      // 重新加载列表以更新数据
      resetAndLoad()
    } catch (error) {
      console.error('催片失败:', error)
      urgeError.value = error.message || '催片失败'
    } finally {
      urging.value = false
    }
  }

  return {
    showUrgeModal,
    currentSeekId,
    urgeCarrot,
    urgeError,
    urging,
    openUrgeModal,
    closeUrgeModal,
    handleUrge,
  }
}