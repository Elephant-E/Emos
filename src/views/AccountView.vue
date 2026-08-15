<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { userApi } from '@/api/userApi.js'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import { STORAGE_KEYS } from '@/utils/storage.js'
import BaseModal from '@/components/common/BaseModal.vue'

const appStore = useAppStore()

// 从 Store 获取用户信息（响应式）
const userInfo = computed(() => appStore.userInfo)
const isLoading = ref(true)

// 模态框状态
const isEditPseudonymModalVisible = ref(false)
const isUploadAgreementModalVisible = ref(false)
const isDownAgreementModalVisible = ref(false)
const isSetPasswordModalVisible = ref(false)
const isBanListModalVisible = ref(false)

// 表单数据
const pseudonymForm = ref({ name: '' })
const passwordForm = ref({ password: '' })
const banReasonForm = ref({ reason: '' })

// 提交状态
const isSubmittingPseudonym = ref(false)
const isAgreeingUpload = ref(false)
const isAgreeingDown = ref(false)
const isSubmittingPassword = ref(false)
const isLoadingBanList = ref(false)
const isUpdatingBanStatus = ref(false)

// 加载用户信息
const loadUserInfo = async (forceRefresh = false) => {
  if (!forceRefresh) {
    // 先尝试从 Store 缓存读取
    if (appStore.userInfo) {
      isLoading.value = false
      return
    }
  }
  
  try {
    // 从 API 刷新（会自动更新 Store）
    await appStore.refreshUserInfo()
  } catch (error) {
    showToast('加载用户信息失败: ' + error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

// 打开编辑笔名模态框
const openEditPseudonymModal = () => {
  pseudonymForm.value.name = userInfo.value?.pseudonym || ''
  isEditPseudonymModalVisible.value = true
}

// 关闭编辑笔名模态框
const closeEditPseudonymModal = () => {
  isEditPseudonymModalVisible.value = false
  pseudonymForm.value = { name: '' }
}

// 提交笔名修改
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

// 打开设置密码模态框
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

// 关闭设置密码模态框
const closeSetPasswordModal = () => {
  isSetPasswordModalVisible.value = false
  passwordForm.value = { password: '' }
}

// 提交密码设置
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

// 重置 Token
const resetToken = async () => {
  if (await confirmDialog('确定要重置 Token 吗？重置后需要重新登录。', '确认', true)) {
    try {
      await userApi.resetToken()
      showToast('Token 已重置，请重新登录', 'success')
      // 清除本地token并跳转到登录页
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER)
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    } catch (error) {
      showToast('重置失败: ' + error.message, 'error')
    }
  }
}

// Telegram 操作
const handleTelegramAction = async () => {
  if (!userInfo.value) return
  
  if (userInfo.value.telegram_user_id) {
    // 已绑定，点击解绑
    if (await confirmDialog('确定要解绑 Telegram 吗？', '确认', true)) {
      try {
        await userApi.unbindTelegram()
        showToast('解绑成功', 'success')
        await loadUserInfo(true)
      } catch (error) {
        showToast('解绑失败: ' + error.message, 'error')
      }
    }
  } else if (userInfo.value.telegram_bind_url) {
    // 未绑定，有链接，打开链接
    window.open(userInfo.value.telegram_bind_url, '_blank')
  } else {
    // 无链接
    showToast('暂无 Telegram 绑定链接', 'error')
  }
}

// 切换显示空媒体库
const toggleShowEmpty = async () => {
  if (!userInfo.value) return
  
  const newValue = !userInfo.value.is_show_empty
  
  try {
    await userApi.setShowEmpty(newValue)
    showToast(newValue ? '已开启显示空媒体库' : '已关闭显示空媒体库', 'success')
    await loadUserInfo(true)
  } catch (error) {
    showToast('操作失败: ' + error.message, 'error')
  }
}

// 切换高清海报
const toggleHdPoster = async () => {
  if (!userInfo.value) return
  
  // 验证萝卜余额
  if (userInfo.value.carrot < 1000) {
    showToast('萝卜余额不足1000，无法开启高清海报', 'error')
    return
  }
  
  const newValue = !userInfo.value.is_original_image
  
  try {
    await userApi.setOriginalImage(newValue)
    showToast(newValue ? '高清海报已开启' : '高清海报已关闭', 'success')
    await loadUserInfo(true)
  } catch (error) {
    showToast('操作失败: ' + error.message, 'error')
  }
}

// 打开上传协议模态框
const openUploadAgreementModal = () => {
  isUploadAgreementModalVisible.value = true
}

// 关闭上传协议模态框
const closeUploadAgreementModal = () => {
  isUploadAgreementModalVisible.value = false
}

// 同意上传协议
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

// 打开下载协议模态框
const openDownAgreementModal = () => {
  isDownAgreementModalVisible.value = true
}

// 关闭下载协议模态框
const closeDownAgreementModal = () => {
  isDownAgreementModalVisible.value = false
}

// 同意下载协议
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

// 兑换片单
const exchangeWatch = async () => {
  if (await confirmDialog('确定要兑换一个片单额度吗？该操作不可撤销。')) {
    try {
      await watchlistApi.exchangeSlot()
      showToast('兑换成功', 'success')
      await loadUserInfo(true)
    } catch (error) {
      showToast('兑换失败: ' + error.message, 'error')
    }
  }
}

// ==================== 封禁管理 ====================

// 封禁列表数据
const banList = ref([])
const currentBanUser = ref(null)

// 判断是否为管理员
const isAdmin = computed(() => {
  return userInfo.value?.roles?.includes('admin') || false
})

// 打开封禁列表模态框
const openBanListModal = async () => {
  if (!isAdmin.value) {
    showToast('仅管理员可访问', 'error')
    return
  }
  
  isBanListModalVisible.value = true
  await loadBanList()
}

// 关闭封禁列表模态框
const closeBanListModal = () => {
  isBanListModalVisible.value = false
  banList.value = []
  currentBanUser.value = null
  banReasonForm.value.reason = ''
}

// 加载封禁列表
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

// 打开更新状态模态框
const openUpdateBanStatus = (user) => {
  currentBanUser.value = user
  banReasonForm.value.reason = ''
}

// 更新封禁状态
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

onMounted(() => {
  loadUserInfo()
})
</script>

<template>
  <!-- MainLayout 已提供 main-wrapper -->
  <div v-if="isLoading" class="loading-state">
    <i class="fas fa-circle-notch fa-spin"></i>
    </div>
  
  <div v-else id="accountContent">
    <!-- 基本信息 -->
    <div class="settings-section">
      <div class="section-title">基本信息</div>
      <div class="list-group">
        <div class="list-row">
          <div class="list-row__content">
            <div class="list-row__title">用户 ID</div>
            <div class="list-row__subtitle">您的唯一标识</div>
          </div>
          <div class="list-row__value value-mono">{{ userInfo?.user_id || '-' }}</div>
        </div>
        
        <div class="list-row">
          <div class="list-row__content">
            <div class="list-row__title">用户名</div>
            <div class="list-row__subtitle">登录使用的用户名</div>
          </div>
          <div class="list-row__value">{{ userInfo?.username || '-' }}</div>
        </div>
        
        <div class="list-row clickable" @click="openEditPseudonymModal">
          <div class="list-row__content">
            <div class="list-row__title">笔名</div>
            <div class="list-row__subtitle">上传与邀请时显示的昵称</div>
          </div>
          <div class="list-row__value">
            <span v-if="userInfo?.pseudonym">{{ userInfo.pseudonym }}</span>
            <span v-else class="text-tertiary">未设置</span>
            <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
        
        <div class="list-row clickable" @click="openSetPasswordModal">
          <div class="list-row__content">
            <div class="list-row__title">修改密码</div>
            <div class="list-row__subtitle">{{ userInfo?.must_otp ? '暂时不支持修改密码，可使用动态密码登录' : '设置 6 位登录密码' }}</div>
          </div>
          <div class="list-row__value">
            <span class="list-row__action-text">修改</span>
            <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
        
        <div class="list-row clickable" @click="handleTelegramAction">
          <div class="list-row__content">
            <div class="list-row__title">Telegram</div>
            <div class="list-row__subtitle">
              {{ userInfo?.telegram_user_id ? `已绑定: ${userInfo.telegram_user_id}` : (userInfo?.telegram_bind_url ? '绑定 Telegram 接收通知' : '暂无 Telegram 绑定链接') }}
            </div>
          </div>
          <div class="list-row__value">
            <span :class="userInfo?.telegram_user_id ? 'list-row__action-text--danger' : (userInfo?.telegram_bind_url ? 'list-row__action-text' : 'text-tertiary')">
              {{ userInfo?.telegram_user_id ? '解绑账号' : (userInfo?.telegram_bind_url ? '链接账号' : '暂无链接') }}
            </span>
            <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
        
        <div class="list-row clickable" @click="resetToken">
          <div class="list-row__content">
            <div class="list-row__title">重置 Token</div>
            <div class="list-row__subtitle">重置后将需要重新登录</div>
          </div>
          <div class="list-row__value">
            <span class="list-row__action-text--danger">重置</span>
            <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
        
        <div v-if="isAdmin" class="list-row clickable" @click="openBanListModal">
          <div class="list-row__content">
            <div class="list-row__title">封禁列表</div>
            <div class="list-row__subtitle">管理被封禁的用户</div>
          </div>
          <div class="list-row__value">
            <span class="list-row__action-text">查看</span>
            <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 权限设置 -->
    <div class="settings-section">
      <div class="section-title">权限设置</div>
      <div class="list-group">
        <div class="list-row">
          <div class="list-row__content">
            <div class="list-row__title">观影权限</div>
            <div class="list-row__subtitle">是否可以观看影片</div>
          </div>
          <div class="list-row__value">
            <i :class="['fas', userInfo?.is_viewing ? 'fa-check-circle icon-success' : 'fa-times-circle icon-danger']"></i>
          </div>
        </div>
        
        <div class="list-row">
          <div class="list-row__content">
            <div class="list-row__title">上传权限</div>
            <div class="list-row__subtitle">是否可以上传文件</div>
          </div>
          <div class="list-row__value">
            <i :class="['fas', userInfo?.is_can_upload ? 'fa-check-circle icon-success' : 'fa-times-circle icon-danger']"></i>
          </div>
        </div>
        
        <div class="list-row">
          <div class="list-row__content">
            <div class="list-row__title">下载权限</div>
            <div class="list-row__subtitle">是否可以下载媒体</div>
          </div>
          <div class="list-row__value">
            <i :class="['fas', userInfo?.is_can_down ? 'fa-check-circle icon-success' : 'fa-times-circle icon-danger']"></i>
          </div>
        </div>
        
        <div class="list-row clickable" @click="toggleShowEmpty">
          <div class="list-row__content">
            <div class="list-row__title">显示空媒体库</div>
            <div class="list-row__subtitle">在媒体列表中显示空的媒体库</div>
          </div>
          <div class="toggle-switch list-row__action" :class="{ active: userInfo?.is_show_empty }">
            <div class="toggle-slider"></div>
          </div>
        </div>
        
        <div class="list-row clickable" v-if="userInfo?.carrot >= 1000" @click="toggleHdPoster">
          <div class="list-row__content">
            <div class="list-row__title">高清海报</div>
            <div class="list-row__subtitle">解锁 4K/原盘画质（需萝卜 ≥ 1000）</div>
          </div>
          <div class="toggle-switch list-row__action" :class="{ active: userInfo?.is_original_image }">
            <div class="toggle-slider"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 兑换与权限 -->
    <div class="settings-section" v-if="!userInfo?.is_can_upload || !userInfo?.is_can_down">
      <div class="section-title">兑换与权限</div>
      <div class="list-group">
        <div class="list-row clickable" @click="exchangeWatch">
          <div class="list-row__content">
            <div class="list-row__title">兑换片单</div>
            <div class="list-row__subtitle">使用萝卜兑换片单额度</div>
          </div>
          <div class="list-row__value">
            <span class="list-row__action-text">兑换</span>
            <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
        
        <div class="list-row clickable" v-if="!userInfo?.is_can_upload" @click="openUploadAgreementModal">
          <div class="list-row__content">
            <div class="list-row__title">上传权限</div>
            <div class="list-row__subtitle">阅读并同意上传协议以开启</div>
          </div>
          <div class="list-row__value">
            <span class="list-row__action-text">阅读协议</span>
            <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
        
        <div class="list-row clickable" v-if="!userInfo?.is_can_down" @click="openDownAgreementModal">
          <div class="list-row__content">
            <div class="list-row__title">媒体下载权限</div>
            <div class="list-row__subtitle">获取本地下载媒体权限</div>
          </div>
          <div class="list-row__value">
            <span class="list-row__action-text">获取权限</span>
            <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 编辑笔名模态框 -->
  <BaseModal :visible="isEditPseudonymModalVisible" title="修改笔名" @close="closeEditPseudonymModal">
    <div class="form-group">
      <label class="form-label">新笔名</label>
      <input type="text" class="modal-input" v-model="pseudonymForm.name" placeholder="请输入新笔名" maxlength="20">
      <div class="form-hint">笔名将在上传和邀请时显示给其他用户</div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeEditPseudonymModal">取消</button>
      <button class="modal-btn primary" @click="submitPseudonym" :disabled="isSubmittingPseudonym">
        <i v-if="isSubmittingPseudonym" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>提交</span>
      </button>
    </template>
  </BaseModal>
  
  <!-- 上传协议模态框 -->
  <BaseModal :visible="isUploadAgreementModalVisible" title="上传协议" @close="closeUploadAgreementModal">
    <div class="agreement-text">
      <p>• 若它承载着光明与欢笑，无惧在阳光下共赏，请归档于 emos；</p>
      <p>• 若它涌动着本能与躁动，只属于深夜的独白，请封印于 empn。</p>
      <p>• 秩序与混乱，仅在一念之间。</p>
      <div class="agreement-warning">⚠️ 因储存问题，目前视频资源上传后存在丢失风险。</div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeUploadAgreementModal">取消</button>
      <button class="modal-btn primary" @click="agreeUploadAgreement" :disabled="isAgreeingUpload">
        <i v-if="isAgreeingUpload" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>同意</span>
      </button>
    </template>
  </BaseModal>
  
  <!-- 下载协议模态框 -->
  <BaseModal :visible="isDownAgreementModalVisible" title="下载协议" @close="closeDownAgreementModal">
    <div class="agreement-text">
      <p>• 请合理使用下载功能，勿滥用。</p>
      <p>• 下载资源仅限个人学习与交流使用，严禁用于商业目的。</p>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeDownAgreementModal">取消</button>
      <button class="modal-btn primary" @click="agreeDownAgreement" :disabled="isAgreeingDown">
        <i v-if="isAgreeingDown" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>同意</span>
      </button>
    </template>
  </BaseModal>
  
  <!-- 设置密码模态框 -->
  <BaseModal :visible="isSetPasswordModalVisible" title="设置新密码" @close="closeSetPasswordModal">
    <div class="form-group">
      <label class="form-label">新密码</label>
      <input type="text" class="modal-input" v-model="passwordForm.password" @input="handlePasswordInput" placeholder="请输入 6 位密码" maxlength="6">
      <div class="form-hint">密码仅用于Emby登录验证</div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeSetPasswordModal">取消</button>
      <button class="modal-btn primary" @click="submitPassword" :disabled="isSubmittingPassword">
        <i v-if="isSubmittingPassword" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>提交</span>
      </button>
    </template>
  </BaseModal>

  <!-- 封禁列表模态框 -->
  <BaseModal :visible="isBanListModalVisible" title="封禁列表" size="lg" @close="closeBanListModal">
    <div v-if="isLoadingBanList">
      <div v-for="i in 4" :key="'sk-'+i" class="list-row">
        <div class="list-row__content">
          <div class="skeleton-block skeleton-w30 skeleton-h16"></div>
          <div class="skeleton-block skeleton-w50 skeleton-h10"></div>
        </div>
        <div class="skeleton-block skeleton-w48 skeleton-h28 skeleton-r6"></div>
      </div>
    </div>
    <div v-else-if="banList.length === 0" class="list-empty">
      <i class="fas fa-check-circle"></i>
      <p>暂无封禁用户</p>
    </div>
    <template v-else>
      <div v-for="user in banList" :key="user.user_id" class="list-row">
        <div class="list-row__content">
          <div class="list-row__title">{{ user.username }}</div>
          <div class="list-row__subtitle">ID: {{ user.user_id }}<span v-if="user.telegram_user_id"> · TG: {{ user.telegram_user_id }}</span></div>
          <div class="list-row__subtitle">原因：{{ user.disable_reason || '未说明' }}</div>
          <div v-if="user.invite_pseudonym" class="list-row__subtitle">邀请人：{{ user.invite_pseudonym }} ({{ user.invite_at }})</div>
        </div>
        <button class="ban-manage-btn list-row__action" @click="openUpdateBanStatus(user)">管理</button>
      </div>
    </template>
  </BaseModal>

  <!-- 更新封禁状态模态框 -->
  <BaseModal :visible="!!currentBanUser" title="管理封禁状态" @close="currentBanUser = null">
    <template v-if="currentBanUser">
      <div class="form-group">
        <label class="form-label">用户信息</label>
        <div class="ban-user-info"><strong>{{ currentBanUser.username }}</strong> ({{ currentBanUser.user_id }})</div>
      </div>
      <div class="form-group">
        <label class="form-label">操作原因</label>
        <input type="text" class="modal-input" v-model="banReasonForm.reason" placeholder="请输入操作原因...">
      </div>
    </template>
    <template #footer>
      <button class="modal-btn secondary" @click="currentBanUser = null">取消</button>
      <button class="modal-btn danger" @click="updateBanStatus('disable')" :disabled="isUpdatingBanStatus">
        <i v-if="isUpdatingBanStatus" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>封禁</span>
      </button>
      <button class="modal-btn success" @click="updateBanStatus('unblock')" :disabled="isUpdatingBanStatus">
        <i v-if="isUpdatingBanStatus" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>解禁</span>
      </button>
    </template>
  </BaseModal>
</template>

