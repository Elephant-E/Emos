import { ref } from 'vue'
import { userApi } from '@/api/userApi.js'
import { showToast } from '@/utils/toast.js'

/**
 * 账号「资料与协议」模态框域：编辑笔名、设置密码、上传/下载协议。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - userInfo：账号信息 computed
 *   - loadUserInfo(forceRefresh)：修改后刷新
 */
export function useAccountModals({ userInfo, loadUserInfo }) {
  // ================= 模态框状态 =================
  const isEditPseudonymModalVisible = ref(false)
  const isUploadAgreementModalVisible = ref(false)
  const isDownAgreementModalVisible = ref(false)
  const isSetPasswordModalVisible = ref(false)

  // 表单数据
  const pseudonymForm = ref({ name: '' })
  const passwordForm = ref({ password: '' })

  // 提交状态
  const isSubmittingPseudonym = ref(false)
  const isAgreeingUpload = ref(false)
  const isAgreeingDown = ref(false)
  const isSubmittingPassword = ref(false)

  // ================= 笔名 =================

  const openEditPseudonymModal = () => {
    pseudonymForm.value.name = userInfo.value?.pseudonym || ''
    isEditPseudonymModalVisible.value = true
  }

  const closeEditPseudonymModal = () => {
    isEditPseudonymModalVisible.value = false
    pseudonymForm.value = { name: '' }
  }

  const submitPseudonym = async () => {
    if (isSubmittingPseudonym.value) return

    const name = pseudonymForm.value.name.trim()

    if (!name) {
      showToast('笔名不能为空', 'error')
      return
    }

    if (name.length > 20) {
      showToast('笔名不能超过20个字', 'error')
      return
    }

    isSubmittingPseudonym.value = true

    try {
      await userApi.updatePseudonym(name)
      showToast('笔名修改成功', 'success')
      closeEditPseudonymModal()
      await loadUserInfo(true)
    } catch (error) {
      showToast('修改失败: ' + error.message, 'error')
    } finally {
      isSubmittingPseudonym.value = false
    }
  }

  // ================= 密码 =================

  const openSetPasswordModal = () => {
    if (!userInfo.value) return
    if (!userInfo.value.is_viewing) {
      showToast('目前无权限', 'error')
      return
    }
    if (userInfo.value.must_otp) {
      showToast('请使用动态密码登录', 'error')
      return
    }

    passwordForm.value.password = ''
    isSetPasswordModalVisible.value = true
  }

  const closeSetPasswordModal = () => {
    isSetPasswordModalVisible.value = false
    passwordForm.value = { password: '' }
  }

  const submitPassword = async () => {
    if (isSubmittingPassword.value) return

    // 检查是否必须使用动态密码
    if (userInfo.value && userInfo.value.must_otp) {
      showToast('请使用动态密码登录，无法设置固定密码', 'error')
      closeSetPasswordModal()
      return
    }

    const pwd = passwordForm.value.password.trim()

    if (!pwd || pwd.length !== 6) {
      showToast('请输入 6 位密码', 'error')
      return
    }

    isSubmittingPassword.value = true

    try {
      await userApi.resetPassword(pwd)
      showToast('密码设置成功！', 'success')
      closeSetPasswordModal()
    } catch (error) {
      showToast('设置失败: ' + error.message, 'error')
    } finally {
      isSubmittingPassword.value = false
    }
  }

  // 密码输入限制（只允许数字）
  const handlePasswordInput = (event) => {
    event.target.value = event.target.value.slice(0, 6)
  }

  // ================= 上传协议 =================

  const openUploadAgreementModal = () => {
    isUploadAgreementModalVisible.value = true
  }

  const closeUploadAgreementModal = () => {
    isUploadAgreementModalVisible.value = false
  }

  const agreeUploadAgreement = async () => {
    if (isAgreeingUpload.value) return

    try {
      await userApi.agreeUploadAgreement()
      showToast('上传权限已开启', 'success')
      closeUploadAgreementModal()
      await loadUserInfo(true)
    } catch (error) {
      showToast('操作失败: ' + error.message, 'error')
    } finally {
      isAgreeingUpload.value = false
    }
  }

  // ================= 下载协议 =================

  const openDownAgreementModal = () => {
    isDownAgreementModalVisible.value = true
  }

  const closeDownAgreementModal = () => {
    isDownAgreementModalVisible.value = false
  }

  const agreeDownAgreement = async () => {
    if (isAgreeingDown.value) return

    try {
      await userApi.agreeDownAgreement()
      showToast('下载权限已开启', 'success')
      closeDownAgreementModal()
      await loadUserInfo(true)
    } catch (error) {
      showToast('操作失败: ' + error.message, 'error')
    } finally {
      isAgreeingDown.value = false
    }
  }

  return {
    isEditPseudonymModalVisible,
    isUploadAgreementModalVisible,
    isDownAgreementModalVisible,
    isSetPasswordModalVisible,
    pseudonymForm,
    passwordForm,
    isSubmittingPseudonym,
    isAgreeingUpload,
    isAgreeingDown,
    isSubmittingPassword,
    openEditPseudonymModal,
    closeEditPseudonymModal,
    submitPseudonym,
    openSetPasswordModal,
    closeSetPasswordModal,
    submitPassword,
    handlePasswordInput,
    openUploadAgreementModal,
    closeUploadAgreementModal,
    agreeUploadAgreement,
    openDownAgreementModal,
    closeDownAgreementModal,
    agreeDownAgreement,
  }
}