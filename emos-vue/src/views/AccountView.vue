<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { userApi } from '@/api/userApi.js'
import { showToast } from '@/utils/toast.js'
import { STORAGE_KEYS } from '@/utils/storage.js'

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
  
  if (!pwd || pwd.length !== 6 || !/^\d{6}$/.test(pwd)) {
    showToast('请输入 6 位数字密码', 'error')
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
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6)
}

// 重置 Token
const resetToken = async () => {
  if (confirm('确定要重置 Token 吗？重置后需要重新登录。')) {
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
    if (confirm('确定要解绑 Telegram 吗？')) {
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
  if (confirm('确定要兑换一个片单额度吗？该操作不可撤销。')) {
    try {
      await userApi.exchangeWatchSlot()
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
  <div v-if="isLoading" class="apple-loading">
    <div class="spinner"></div>
    <span>加载中...</span>
  </div>
  
  <div v-else id="accountContent">
    <!-- 基本信息 -->
    <div class="settings-section">
      <div class="section-title">基本信息</div>
      <div class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">用户 ID</div>
            <div class="setting-desc">您的唯一标识</div>
          </div>
          <div class="setting-value" style="font-family: monospace;">{{ userInfo?.user_id || '-' }}</div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">用户名</div>
            <div class="setting-desc">登录使用的用户名</div>
          </div>
          <div class="setting-value">{{ userInfo?.username || '-' }}</div>
        </div>
        
        <div class="setting-item clickable" @click="openEditPseudonymModal">
          <div class="setting-info">
            <div class="setting-label">笔名</div>
            <div class="setting-desc">上传与邀请时显示的昵称</div>
          </div>
          <div class="setting-value">
            <span v-if="userInfo?.pseudonym">{{ userInfo.pseudonym }}</span>
            <span v-else style="color: var(--text-tertiary);">未设置</span>
            <i class="fas fa-chevron-right" style="margin-left: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"></i>
          </div>
        </div>
        
        <div class="setting-item clickable" @click="openSetPasswordModal">
          <div class="setting-info">
            <div class="setting-label">修改密码</div>
            <div class="setting-desc">
              {{ userInfo?.must_otp ? '暂时不支持修改密码，可使用动态密码登录' : '设置 6 位数字登录密码' }}
            </div>
          </div>
          <div class="setting-value">
            <span style="color: var(--accent); font-size: 0.85rem;">修改</span>
            <i class="fas fa-chevron-right" style="margin-left: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"></i>
          </div>
        </div>
        
        <div class="setting-item clickable" @click="handleTelegramAction">
          <div class="setting-info">
            <div class="setting-label">Telegram</div>
            <div class="setting-desc">
              {{ userInfo?.telegram_user_id ? `已绑定: ${userInfo.telegram_user_id}` : (userInfo?.telegram_bind_url ? '绑定 Telegram 接收通知' : '暂无 Telegram 绑定链接') }}
            </div>
          </div>
          <div class="setting-value">
            <span 
              :style="{
                color: userInfo?.telegram_user_id ? 'var(--danger)' : (userInfo?.telegram_bind_url ? 'var(--accent)' : 'var(--text-tertiary)'),
                fontSize: '0.85rem'
              }"
            >
              {{ userInfo?.telegram_user_id ? '解绑账号' : (userInfo?.telegram_bind_url ? '链接账号' : '暂无链接') }}
            </span>
            <i class="fas fa-chevron-right" style="margin-left: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"></i>
          </div>
        </div>
        
        <div class="setting-item clickable" @click="resetToken">
          <div class="setting-info">
            <div class="setting-label">重置 Token</div>
            <div class="setting-desc">重置后将需要重新登录</div>
          </div>
          <div class="setting-value">
            <span style="color: var(--danger); font-size: 0.85rem;">重置</span>
            <i class="fas fa-chevron-right" style="margin-left: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"></i>
          </div>
        </div>
        
        <!-- 封禁列表（仅管理员） -->
        <div v-if="isAdmin" class="setting-item clickable" @click="openBanListModal">
          <div class="setting-info">
            <div class="setting-label">封禁列表</div>
            <div class="setting-desc">管理被封禁的用户</div>
          </div>
          <div class="setting-value">
            <span style="color: var(--accent); font-size: 0.85rem;">查看</span>
            <i class="fas fa-chevron-right" style="margin-left: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"></i>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 权限设置 -->
    <div class="settings-section">
      <div class="section-title">权限设置</div>
      <div class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">观影权限</div>
            <div class="setting-desc">是否可以观看影片</div>
          </div>
          <div class="setting-value">
            <i class="fas fa-check-circle" v-if="userInfo?.is_viewing" style="color: var(--success);"></i>
            <i class="fas fa-times-circle" v-else style="color: var(--danger);"></i>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">上传权限</div>
            <div class="setting-desc">是否可以上传文件</div>
          </div>
          <div class="setting-value">
            <i class="fas fa-check-circle" v-if="userInfo?.is_can_upload" style="color: var(--success);"></i>
            <i class="fas fa-times-circle" v-else style="color: var(--danger);"></i>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">下载权限</div>
            <div class="setting-desc">是否可以下载媒体</div>
          </div>
          <div class="setting-value">
            <i class="fas fa-check-circle" v-if="userInfo?.is_can_down" style="color: var(--success);"></i>
            <i class="fas fa-times-circle" v-else style="color: var(--danger);"></i>
          </div>
        </div>
        
        <div class="setting-item toggle-item" @click="toggleShowEmpty">
          <div class="setting-info">
            <div class="setting-label">显示空媒体库</div>
            <div class="setting-desc">在媒体列表中显示空的媒体库</div>
          </div>
          <div class="toggle-switch" :class="{ active: userInfo?.is_show_empty }">
            <div class="toggle-slider"></div>
          </div>
        </div>
        
        <div class="setting-item toggle-item" v-if="userInfo?.carrot >= 1000" @click="toggleHdPoster">
          <div class="setting-info">
            <div class="setting-label">高清海报</div>
            <div class="setting-desc">解锁 4K/原盘画质（需萝卜 ≥ 1000）</div>
          </div>
          <div class="toggle-switch" :class="{ active: userInfo?.is_original_image }">
            <div class="toggle-slider"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 兑换与权限 -->
    <div class="settings-section" v-if="!userInfo?.is_can_upload || !userInfo?.is_can_down">
      <div class="section-title">兑换与权限</div>
      <div class="settings-list">
        <div class="setting-item clickable" @click="exchangeWatch">
          <div class="setting-info">
            <div class="setting-label">兑换片单</div>
            <div class="setting-desc">使用萝卜兑换片单额度</div>
          </div>
          <div class="setting-value">
            <span style="color: var(--accent); font-size: 0.85rem;">兑换</span>
            <i class="fas fa-chevron-right" style="margin-left: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"></i>
          </div>
        </div>
        
        <div class="setting-item clickable" v-if="!userInfo?.is_can_upload" @click="openUploadAgreementModal">
          <div class="setting-info">
            <div class="setting-label">上传权限</div>
            <div class="setting-desc">阅读并同意上传协议以开启</div>
          </div>
          <div class="setting-value">
            <span style="color: var(--accent); font-size: 0.85rem;">阅读协议</span>
            <i class="fas fa-chevron-right" style="margin-left: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"></i>
          </div>
        </div>
        
        <div class="setting-item clickable" v-if="!userInfo?.is_can_down" @click="openDownAgreementModal">
          <div class="setting-info">
            <div class="setting-label">媒体下载权限</div>
            <div class="setting-desc">获取本地下载媒体权限</div>
          </div>
          <div class="setting-value">
            <span style="color: var(--accent); font-size: 0.85rem;">获取权限</span>
            <i class="fas fa-chevron-right" style="margin-left: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 编辑笔名模态框 -->
  <div 
    class="modal-overlay" 
    id="editPseudonymModal"
    :class="{ show: isEditPseudonymModalVisible }"
    :style="{ display: isEditPseudonymModalVisible ? 'flex' : 'none' }"
    @click.self="closeEditPseudonymModal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">修改笔名</span>
        <button class="modal-close" @click="closeEditPseudonymModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <label class="form-label">新笔名</label>
        <input 
          type="text" 
          class="modal-input" 
          v-model="pseudonymForm.name"
          placeholder="请输入新笔名" 
          maxlength="20"
        >
        <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.5rem;">
          笔名将在上传和邀请时显示给其他用户
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeEditPseudonymModal">取消</button>
        <button 
          class="modal-btn primary" 
          @click="submitPseudonym"
          :disabled="isSubmittingPseudonym"
        >
          <span v-if="!isSubmittingPseudonym">提交</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>
  
  <!-- 上传协议模态框 -->
  <div 
    class="modal-overlay" 
    id="uploadAgreementModal"
    :class="{ show: isUploadAgreementModalVisible }"
    :style="{ display: isUploadAgreementModalVisible ? 'flex' : 'none' }"
    @click.self="closeUploadAgreementModal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">上传协议</span>
        <button class="modal-close" @click="closeUploadAgreementModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div style="line-height: 1.8; color: var(--text-secondary);">
          <p style="margin-bottom: 0.8rem;">• 若它承载着光明与欢笑，无惧在阳光下共赏，请归档于 emos；</p>
          <p style="margin-bottom: 0.8rem;">• 若它涌动着本能与躁动，只属于深夜的独白，请封印于 empn。</p>
          <p style="margin-bottom: 0.8rem;">• 秩序与混乱，仅在一念之间。</p>
          <div style="margin-top: 1rem; padding: 0.8rem; background: var(--bg-input); border-radius: 12px; border: 0.5px solid var(--border); color: var(--text-tertiary); font-size: 0.85rem;">
            ⚠️ 因储存问题，目前视频资源上传后存在丢失风险。
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeUploadAgreementModal">我再想想</button>
        <button 
          class="modal-btn primary" 
          @click="agreeUploadAgreement"
          :disabled="isAgreeingUpload"
        >
          <span v-if="!isAgreeingUpload">认可并同意</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>
  
  <!-- 下载协议模态框 -->
  <div 
    class="modal-overlay" 
    id="downAgreementModal"
    :class="{ show: isDownAgreementModalVisible }"
    :style="{ display: isDownAgreementModalVisible ? 'flex' : 'none' }"
    @click.self="closeDownAgreementModal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">下载协议</span>
        <button class="modal-close" @click="closeDownAgreementModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div style="line-height: 1.8; color: var(--text-secondary);">
          <p style="margin-bottom: 0.8rem;">• 请合理使用下载功能，勿滥用。</p>
          <p style="margin-bottom: 0.8rem;">• 下载资源仅限个人学习与交流使用，严禁用于商业目的。</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeDownAgreementModal">取消</button>
        <button 
          class="modal-btn primary" 
          @click="agreeDownAgreement"
          :disabled="isAgreeingDown"
        >
          <span v-if="!isAgreeingDown">同意并开启</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>
  
  <!-- 设置密码模态框 -->
  <div 
    class="modal-overlay" 
    id="setPasswordModal"
    :class="{ show: isSetPasswordModalVisible }"
    :style="{ display: isSetPasswordModalVisible ? 'flex' : 'none' }"
    @click.self="closeSetPasswordModal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">设置新密码</span>
        <button class="modal-close" @click="closeSetPasswordModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <label class="form-label">新密码（6 位数字）</label>
        <input 
          type="text" 
          class="modal-input" 
          v-model="passwordForm.password"
          @input="handlePasswordInput"
          placeholder="请输入 6 位数字密码" 
          maxlength="6" 
          inputmode="numeric"
        >
        <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.5rem;">
          密码仅用于登录验证
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeSetPasswordModal">取消</button>
        <button 
          class="modal-btn primary" 
          @click="submitPassword"
          :disabled="isSubmittingPassword"
        >
          <span v-if="!isSubmittingPassword">提交</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 封禁列表模态框 -->
  <div 
    :class="['modal-overlay', { show: isBanListModalVisible }]"
    @click.self="closeBanListModal"
  >
    <div class="modal-content lg">
      <div class="modal-header">
        <span class="modal-title">封禁列表</span>
        <button class="modal-close" @click="closeBanListModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <!-- 加载状态 - 骨架屏 -->
        <div v-if="isLoadingBanList" style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div 
            v-for="i in 4" 
            :key="`skeleton-${i}`"
            class="skeleton-list-item"
            style="padding: 0.8rem 0; border-bottom: 1px solid var(--border);"
          >
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="flex: 1;">
                <div class="skeleton-text" style="width: 30%; height: 16px; margin-bottom: 0.5rem;"></div>
                <div class="skeleton-text-sm" style="width: 50%; margin-bottom: 0.3rem;"></div>
                <div class="skeleton-text-sm" style="width: 70%;"></div>
              </div>
              <div class="skeleton-button" style="width: 48px; height: 28px; border-radius: 6px;"></div>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-else-if="banList.length === 0" class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>暂无封禁用户</p>
        </div>
        
        <!-- 封禁列表 -->
        <div v-else>
          <div 
            v-for="(user, index) in banList" 
            :key="user.user_id"
            :style="{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 0', borderBottom: index === banList.length - 1 ? 'none' : '1px solid var(--border)' }"
          >
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.3rem; color: var(--text-primary);">{{ user.username }}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                ID: {{ user.user_id }}
                <span v-if="user.telegram_user_id"> · TG: {{ user.telegram_user_id }}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                <strong>原因：</strong>{{ user.disable_reason || '未说明' }}
              </div>
              <div v-if="user.invite_pseudonym" style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                邀请人：{{ user.invite_pseudonym }} ({{ user.invite_at }})
              </div>
            </div>
            <button 
              @click="openUpdateBanStatus(user)"
              style="flex-shrink: 0; padding: 0.4rem 0.8rem; background: transparent; border: 1px solid var(--accent); border-radius: 6px; color: var(--accent); font-size: 0.8rem; cursor: pointer; transition: all 0.2s; white-space: nowrap;"
              onmouseover="this.style.background='var(--accent)'; this.style.color='#fff'"
              onmouseout="this.style.background='transparent'; this.style.color='var(--accent)'"
            >
              管理
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 更新封禁状态模态框 -->
  <div 
    :class="['modal-overlay', { show: currentBanUser }]"
    @click.self="currentBanUser = null"
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">管理封禁状态</span>
        <button class="modal-close" @click="currentBanUser = null">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" v-if="currentBanUser">
        <div class="form-group">
          <label class="form-label">用户信息</label>
          <div style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; font-size: 0.9rem; color: var(--text-secondary);">
            <strong>{{ currentBanUser.username }}</strong> ({{ currentBanUser.user_id }})
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">操作原因</label>
          <input 
            type="text" 
            class="modal-input"
            v-model="banReasonForm.reason"
            placeholder="请输入操作原因..."
          >
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="currentBanUser = null">取消</button>
        <button 
          class="modal-btn danger" 
          @click="updateBanStatus('disable')"
          :disabled="isUpdatingBanStatus"
        >
          <span v-if="!isUpdatingBanStatus"><i class="fas fa-ban"></i> 封禁</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
        <button 
          class="modal-btn success" 
          @click="updateBanStatus('unblock')"
          :disabled="isUpdatingBanStatus"
        >
          <span v-if="!isUpdatingBanStatus"><i class="fas fa-check"></i> 解禁</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式在全局CSS中定义 */
</style>
