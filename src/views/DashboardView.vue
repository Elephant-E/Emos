<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app.js'
import { userApi } from '@/api/userApi.js'

import carrotApi from '@/api/carrotApi.js'
import inviteApi from '@/api/inviteApi.js'
import signApi from '@/api/signApi.js'

import { showToast } from '@/utils/toast.js'

import { STORAGE_KEYS } from '@/utils/storage.js'
import { formatFileSize, animateValue, copyToClipboard as copyText } from '@/utils/format.js'

import BaseModal from '@/components/common/BaseModal.vue'

import UploadRankModal from '@/components/dashboard/UploadRankModal.vue'
import SignRankModal from '@/components/dashboard/SignRankModal.vue'
import VoteModal from '@/components/dashboard/VoteModal.vue'
import ViewingModal from '@/components/dashboard/ViewingModal.vue'
import CarrotModal from '@/components/dashboard/CarrotModal.vue'
import InviteModal from '@/components/dashboard/InviteModal.vue'
import RedpacketModal from '@/components/dashboard/RedpacketModal.vue'
import LotteryModal from '@/components/dashboard/LotteryModal.vue'

const appStore = useAppStore()
const { token: activeToken } = storeToRefs(appStore)

// 用户信息（本地 ref，用于动画）
const userInfo = ref(null)
const isLoading = ref(true)

// 统计数据动画
const animatedStats = ref({
  carrot: 0,
  size_upload: 0,
  invite_remaining: 0,
  slot_remaining: 0
})

const animationFrameIds = []

const animateStats = () => {
  if (!userInfo.value) return
  
  animationFrameIds.forEach(id => cancelAnimationFrame(id))
  animationFrameIds.length = 0
  
  animateValue(0, userInfo.value.carrot || 0, 1200, (value) => {
    animatedStats.value.carrot = value
  }, animationFrameIds)
  
  const uploadTotal = userInfo.value.size_upload || 0
  let uploadStartTime = null
  const uploadDuration = 1500
  const animateUpload = (timestamp) => {
    if (!uploadStartTime) uploadStartTime = timestamp
    const progress = Math.min((timestamp - uploadStartTime) / uploadDuration, 1)
    const ease = 1 - Math.pow(1 - progress, 4)
    const currentBytes = Math.floor(uploadTotal * ease)
    animatedStats.value.size_upload = currentBytes
    if (progress < 1) {
      const id = requestAnimationFrame(animateUpload)
      animationFrameIds.push(id)
    }
  }
  const uploadAnimId = requestAnimationFrame(animateUpload)
  animationFrameIds.push(uploadAnimId)
  
  animateValue(0, userInfo.value.invite_remaining || 0, 1000, (value) => {
    animatedStats.value.invite_remaining = value
  }, animationFrameIds)
  
  animateValue(0, userInfo.value.slot_remaining || 0, 1000, (value) => {
    animatedStats.value.slot_remaining = value
  }, animationFrameIds)
}

// 监听 Store 中的用户信息变化，自动同步到本地
watch(() => appStore.userInfo, (newUserInfo) => {
  if (newUserInfo) {
    userInfo.value = newUserInfo
    // 执行动画（无论是否正在加载）
    animateStats()
  }
}, { immediate: true })
const signStatus = ref({ 
  signed: false, 
  message: '',
  hint: ''
})
const signInfo = ref(null)

// 模态框状态（使用 reactive 确保响应式）
const modals = reactive({
  sign: false,
  transfer: false,
  invite: false, // 邀请名额（带Tab）
  simpleInvite: false, // 邀请用户（简单版）
  redpacket: false,
  lottery: false,
  vote: false,
  carrot: false,
  upload: false,
  signRank: false,
  history: false,
  viewing: false
})

// 表单数据（使用 reactive 确保响应式）
const forms = reactive({
  sign: { content: '', submitting: false },
  transfer: { userId: '', amount: '', submitting: false },
  invite: { userId: '', submitting: false }
})

const loadUserInfo = async () => {
  isLoading.value = true
  try {
    const info = await appStore.refreshUserInfo()
    userInfo.value = info
    animateStats()
    updateSignStatus()
  } catch (e) {
    showToast('加载用户信息失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const updateSignStatus = () => {
  const sign = userInfo.value?.sign
  if (sign) {
    signStatus.value = {
      signed: true,
      message: '今日已签到',
      hint: ''
    }
    signInfo.value = sign
  } else {
    signStatus.value = {
      signed: false,
      message: '',
      hint: ''
    }
    signInfo.value = null
  }
}

const getUserRoleText = () => {
  if (!userInfo.value?.roles) return '用户'
  if (userInfo.value.roles.includes('admin')) return '管理员'
  if (userInfo.value.roles.includes('vip')) return 'VIP'
  return '用户'
}

const copyToClipboard = async (text, msg) => {
  try {
    await copyText(text)
    showToast(msg || '已复制', 'success')
  } catch {
    showToast('复制失败', 'error')
  }
}

const copyPassword = async () => {
  if (userInfo.value?.password) {
    copyToClipboard(String(userInfo.value.password), '已复制密码')
    return
  }
  try {
    const data = await userApi.getLoginPassword()
    if (data && data.password != null) {
      showToast(`动态密码: ${data.password}${data.second ? ` (${data.second}秒内有效)` : ''}`, 'success', 5000)
    } else {
      showToast('未找到密码', 'error')
    }
  } catch {
    showToast('获取密码失败', 'error')
  }
}

const openModal = (name) => {
  modals[name] = true
  if (name === 'sign') {
    checkSignStatus()
  }
}

const closeModal = (name) => {
  modals[name] = false
  if (name === 'sign') {
    forms.sign.content = ''
    forms.sign.submitting = false
  } else if (name === 'transfer') {
    forms.transfer.userId = ''
    forms.transfer.amount = ''
    forms.transfer.submitting = false
  } else if (name === 'simpleInvite') {
    forms.invite.userId = ''
    forms.invite.submitting = false
  }
}

const checkSignStatus = async () => {
  updateSignStatus()
}

const submitSign = async () => {
  forms.sign.submitting = true
  try {
    const res = await signApi.submit(forms.sign.content.trim())
    const data = res.data || res
    signStatus.value = {
      signed: true,
      message: '今日已签到',
      hint: ''
    }
    signInfo.value = data
    showToast('签到成功！', 'success')
    await loadUserInfo()
    closeModal('sign')
  } catch (e) {
    const msg = e.message || '未知错误'
    if (msg.includes('重复')) {
      signStatus.value.signed = true
      signStatus.value.message = '今日已签到'
      showToast('今日已签到', 'info')
      closeModal('sign')
    } else {
      showToast('签到失败: ' + msg, 'error')
    }
  } finally {
    forms.sign.submitting = false
  }
}

const submitTransfer = async () => {
  const { userId, amount } = forms.transfer
  if (!userId || userId.length !== 10) {
    showToast('请输入 10 位用户 ID', 'error')
    return
  }
  const num = Number(amount)
  if (!num || num < 2 || num > 6000) {
    showToast('转赠数量需在 2-6000 之间', 'error')
    return
  }
  forms.transfer.submitting = true
  try {
    await carrotApi.transfer(userId, num)
    showToast('转赠成功！', 'success')
    await loadUserInfo()
    closeModal('transfer')
    forms.transfer.userId = ''
    forms.transfer.amount = ''
  } catch (e) {
    showToast('转赠失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    forms.transfer.submitting = false
  }
}

const submitInvite = async () => {
  const { userId } = forms.invite
  if (!userId || userId.length !== 10) {
    showToast('请输入 10 位用户 ID', 'error')
    return
  }
  forms.invite.submitting = true
  try {
    await inviteApi.send(userId)
    showToast('邀请成功！', 'success')
    await loadUserInfo()
    closeModal('simpleInvite')
    forms.invite.userId = ''
  } catch (e) {
    showToast('邀请失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    forms.invite.submitting = false
  }
}

onMounted(() => {
  loadUserInfo()
  checkSignStatus()
})

onUnmounted(() => {
  animationFrameIds.forEach(id => cancelAnimationFrame(id))
})
</script>

<template>
  <!-- MainLayout 已提供 main-wrapper，这里直接渲染内容 -->
  <header class="page-header">
    <h1 class="page-title">仪表盘</h1>
    <p class="page-subtitle">欢迎回来，<span>{{ userInfo?.pseudonym || userInfo?.username }}</span></p>
  </header>

  <div v-if="isLoading" class="loading-state">
    <i class="fas fa-circle-notch fa-spin"></i>
    </div>

  <div v-else class="bento-grid">
    <!-- 个人资料卡片 -->
    <div class="bento-card card-profile">
      <div class="profile-header">
        <div class="profile-avatar" id="avatarBox">
          <i v-if="!userInfo?.avatar" class="fas fa-user"></i>
          <img v-if="userInfo?.avatar" 
            :src="userInfo.avatar" 
            alt="头像" 
            id="avatarImg"
           loading="lazy">
        </div>
        <div class="profile-info">
          <div class="user-name">{{ userInfo?.username }}</div>
          <div class="profile-role">
            <span>{{ getUserRoleText() }}</span>
          </div>
        </div>
        <div class="quick-actions">
          <div class="cloud-buttons">
            <button class="cloud-btn" @click="copyToClipboard(userInfo?.user_id, '已复制用户ID')" title="复制用户ID">
              <i class="fas fa-id-card"></i>
            </button>
            <button class="cloud-btn" @click="copyToClipboard(activeToken || '', '已复制Token')" title="复制 Token">
              <i class="fas fa-key"></i>
            </button>
            <button class="cloud-btn" @click="copyPassword" title="复制密码">
              <i class="fas fa-lock"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="card-profile__body">
        <div class="stats-grid">
          <div class="stat-box" @click="openModal('carrot')">
            <div class="stat-value">{{ animatedStats.carrot }}</div>
            <div class="stat-label"><i class="fas fa-carrot"></i> 萝卜余额</div>
          </div>
          <div class="stat-box" @click="openModal('upload')">
            <div class="stat-value">{{ formatFileSize(animatedStats.size_upload) }}</div>
            <div class="stat-label"><i class="fas fa-cloud-arrow-up"></i> 上传总量</div>
          </div>
          <div class="stat-box" @click="openModal('invite')">
            <div class="stat-value">{{ userInfo?.roles?.includes('admin') ? '∞' : animatedStats.invite_remaining }}</div>
            <div class="stat-label"><i class="fas fa-user-plus"></i> 邀请名额</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{{ animatedStats.slot_remaining }}</div>
            <div class="stat-label"><i class="fas fa-clapperboard"></i> 片单额度</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bento-card card-server">
      <div class="card-header">
        <i class="fas fa-server"></i>
        <span>服务器连接</span>
      </div>
      <div class="card-server__body">
        <div class="server-links">
          <div 
            v-if="userInfo?.server_video" 
            class="copy-link-btn" 
            @click="copyToClipboard(userInfo.server_video, '已复制Emby地址')"
          >
            <span>Emby 地址</span>
            <i class="far fa-copy"></i>
          </div>
          <div 
            v-if="userInfo?.server_live" 
            class="copy-link-btn" 
            @click="copyToClipboard(userInfo.server_live, '已复制TV端地址')"
          >
            <span>TV 端地址</span>
            <i class="far fa-copy"></i>
          </div>
          <div 
            v-if="userInfo?.server_music" 
            class="copy-link-btn" 
            @click="copyToClipboard(userInfo.server_music, '已复制音乐端地址')"
          >
            <span>音乐端地址</span>
            <i class="far fa-copy"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 签到卡片 -->
    <div class="bento-card card-signin">
      <div class="card-header">
        <i class="fas fa-calendar-check"></i>
        <span>每日签到</span>
        <i class="fas fa-trophy card-header-action" @click="openModal('signRank')"></i>
      </div>
      <div class="card-signin__body">
        <div class="signin-visual">
          <div class="signin-ring"></div>
        </div>
        <div class="signin-status">
          <div class="signin-msg">{{ signStatus.message || '今日还未签到' }}</div>
          <div class="signin-hint">
            <template v-if="signStatus.signed && signInfo">
              获得 <span class="highlight-value">{{ signInfo.earn_point || 3 }}</span> 萝卜 · 连续 <span class="highlight-value">{{ signInfo.continuous_days }}</span> 天
            </template>
            <template v-else>点击签到，写下今日寄语</template>
          </div>
        </div>
        <button class="btn-primary" @click="openModal('sign')" :disabled="signStatus.signed">
          <i class="fas fa-check-circle"></i> {{ signStatus.signed ? '已签到' : '立即签到' }}
        </button>
      </div>
    </div>

    <!-- 快捷操作卡片 -->
    <div class="bento-card card-actions">
      <div class="card-header">
        <i class="fas fa-bolt"></i> 
        <span>快捷操作</span>
      </div>
      <div class="card-actions__body">
        <div class="quick-grid">
          <button class="action-btn" @click="openModal('transfer')"><i class="fas fa-exchange-alt"></i>转赠萝卜</button>
          <button class="action-btn" @click="openModal('simpleInvite')"><i class="fas fa-user-plus"></i>邀请用户</button>
          <button class="action-btn" @click="openModal('redpacket')"><i class="fas fa-gift"></i>红包工具</button>
          <button class="action-btn" @click="openModal('lottery')"><i class="fas fa-ticket"></i>抽奖工具</button>
          <button class="action-btn" @click="openModal('vote')"><i class="fas fa-poll"></i>投票工具</button>
          <button class="action-btn" @click="openModal('viewing')"><i class="fas fa-film"></i>请求记录</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= 模态框区域 ================= -->
   
  <BaseModal :visible="modals.sign" title="今日签到" @close="closeModal('sign')">
    <div class="form-group">
      <input 
        type="text" 
        class="modal-input" 
        v-model="forms.sign.content"
        placeholder="对自己说点什么...（最多 10 字）" 
        maxlength="10"
      >
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeModal('sign')">取消</button>
      <button class="modal-btn primary" @click="submitSign" :disabled="forms.sign.submitting">
        <i v-if="forms.sign.submitting" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>提交</span>
      </button>
    </template>
  </BaseModal>

  <BaseModal :visible="modals.transfer" title="转赠萝卜" @close="closeModal('transfer')">
    <div class="form-group">
      <label class="form-label">对方用户 ID</label>
      <input 
        type="text" 
        class="modal-input" 
        v-model="forms.transfer.userId"
        placeholder="请输入 10 位用户 ID" 
        maxlength="10"
      >
    </div>
    <div class="form-group">
      <label class="form-label">转赠数量</label>
      <input 
        type="number" 
        class="modal-input" 
        v-model="forms.transfer.amount"
        placeholder="2 - 6000" 
        min="2" 
        max="6000"
      >
      <div class="form-hint">单次转赠最少 2 萝卜，最多 6000 萝卜</div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeModal('transfer')">取消</button>
      <button class="modal-btn primary" @click="submitTransfer" :disabled="forms.transfer.submitting">
        <i v-if="forms.transfer.submitting" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>确认</span>
      </button>
    </template>
  </BaseModal>

  <BaseModal :visible="modals.simpleInvite" title="邀请用户" @close="closeModal('simpleInvite')">
    <div class="form-group">
      <label class="form-label">对方用户 ID</label>
      <input 
        type="text" 
        class="modal-input" 
        v-model="forms.invite.userId"
        placeholder="请输入对方 10 位用户 ID" 
        maxlength="10"
      >
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeModal('simpleInvite')">取消</button>
      <button class="modal-btn primary" @click="submitInvite" :disabled="forms.invite.submitting">
        <i v-if="forms.invite.submitting" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>邀请</span>
      </button>
    </template>
  </BaseModal>

  <InviteModal :visible="modals.invite" :user-info="userInfo" @close="closeModal('invite')" />

  <RedpacketModal :visible="modals.redpacket" @close="closeModal('redpacket')" />
  <LotteryModal :visible="modals.lottery" @close="closeModal('lottery')" />

  <VoteModal :visible="modals.vote" @close="closeModal('vote')" @success="loadUserInfo()" />


  <CarrotModal :visible="modals.carrot" @close="closeModal('carrot')" />

  <!-- 上传排行榜弹窗 -->
  <UploadRankModal :visible="modals.upload" @close="closeModal('upload')" />

  <!-- 签到排行榜弹窗 -->
  <SignRankModal :visible="modals.signRank" @close="closeModal('signRank')" />

  <ViewingModal :visible="modals.viewing" @close="closeModal('viewing')" />
</template>

