<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app.js'
import { userApi } from '@/api/userApi.js'
import signApi from '@/api/signApi.js'
import carrotApi from '@/api/carrotApi.js'
import inviteApi from '@/api/inviteApi.js'
import uploadApi from '@/api/uploadApi.js'
import lotteryApi from '@/api/lotteryApi.js'
import voteApi from '@/api/voteApi.js'
import viewingApi from '@/api/viewingApi.js'
import { showToast } from '@/utils/toast.js'
import { STORAGE_KEYS } from '@/utils/storage.js'
import { formatFileSize, formatDate, formatRelativeTime, formatDateTime, animateValue, copyToClipboard as copyText } from '@/utils/format.js'

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
  watch_slot_remaining: 0
})

// 执行统计数据动画
const animateStats = () => {
  if (!userInfo.value) return
  
  // 萝卜余额动画（1200ms）
  animateValue(0, userInfo.value.carrot || 0, 1200, (value) => {
    animatedStats.value.carrot = value
  })
  
  // 上传总量动画（1500ms，实时格式化）
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
      requestAnimationFrame(animateUpload)
    }
  }
  requestAnimationFrame(animateUpload)
  
  // 邀请名额动画（1000ms）
  animateValue(0, userInfo.value.invite_remaining || 0, 1000, (value) => {
    animatedStats.value.invite_remaining = value
  })
  
  // 片单额度动画（1000ms）
  animateValue(0, userInfo.value.watch_slot_remaining || 0, 1000, (value) => {
    animatedStats.value.watch_slot_remaining = value
  })
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

// 萝卜模态框状态
const carrotModalState = reactive({
  activeTab: 'history', // 'history' | 'rank'
  historyList: [],
  historyPage: 1,
  historyTotal: 0,
  historyPageSize: 15,
  historyLoading: false,
  historyHasMore: true,
  rankList: [],
  rankLoading: false
})

// 请求记录模态框状态
const viewingModalState = reactive({
  list: [],
  page: 1,
  total: 0,
  pageSize: 15,
  loading: false,
  hasMore: true
})

// 上传排行榜状态
const uploadRankState = reactive({
  rankList: [],
  loading: false
})

// 邀请名额模态框状态
const inviteModalState = reactive({
  activeTab: 'my-info', // 'my-info' | 'history'
  myInfo: null,
  historyList: [],
  historyPage: 1,
  historyTotal: 0,
  historyPageSize: 15,
  historyLoading: false,
  historyHasMore: true
})

// 签到排行榜状态
const signRankState = reactive({
  rankList: [],
  loading: false
})

// 红包工具模态框状态
const redpacketModalState = reactive({
  activeTab: 'send', // 'send' | 'record'
  sendForm: {
    type: 'fixed', // 'fixed' | 'random' | 'password'
    carrot: '',
    number: '',
    blessing: '',
    text: '' // 口令内容
  },
  coverTab: 'upload', // 'upload' | 'url'
  coverUrl: '',
  coverFile: null,
  coverPreviewUrl: null,
  coverFileType: null, // 'image' | 'audio'
  uploading: false,
  recordId: '',
  recordList: [],
  recordPage: 1,
  recordTotal: 0,
  recordPageSize: 15,
  recordLoading: false,
  recordHasMore: true
})

// 抽奖工具模态框状态
const lotteryModalState = reactive({
  activeTab: 'create', // 'create' | 'winners'
  createForm: {
    name: '',
    description: '',
    time_start: '',
    time_end: '',
    amount: 1,
    number: 0,
    rule_carrot: 0,
    rule_sign: 0
  },
  prizes: [], // 奖品列表
  winnerQueryId: '',
  winnerList: [],
  winnerPage: 1,
  winnerTotal: 0,
  winnerPageSize: 15,
  winnerLoading: false,
  winnerHasMore: true,
  isSubmitting: false
})

// 投票工具模态框状态
const voteModalState = reactive({
  question: '',
  seconds: 3600,
  options: ['', ''], // 默认2个选项
  isSubmitting: false
})

// 加载用户信息
const loadUserInfo = async () => {
  isLoading.value = true
  
  try {
    // 从 API 刷新（会自动更新 Store，watch 会同步到本地）
    await appStore.refreshUserInfo()
    
    // 检查签到状态
    checkSignStatus()
  } catch (error) {
    console.error('[Dashboard] 加载用户信息失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 检查签到状态（从 userInfo 中获取）
const checkSignStatus = () => {
  if (!userInfo.value) return
  
  const signInfo = userInfo.value.sign
  
  if (!signInfo) {
    // 没有签到信息，显示默认状态
    signStatus.value = {
      signed: false,
      message: '今日还未签到',
      hint: '点击签到，写下今日寄语'
    }
    return
  }
  
  // 检查今天是否已签到（使用本地时区）
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const signDate = signInfo.sign_at ? signInfo.sign_at.split(' ')[0] : ''
  
  if (signDate === today) {
    // 今日已签到
    signStatus.value = {
      signed: true,
      message: '今日已签到',
      hint: `获得 <span style="color:var(--warning);font-weight:600;">${signInfo.earn_point || 3}</span> 萝卜 · 连续 <span style="color:var(--warning);font-weight:600;">${signInfo.continuous_days}</span> 天`
    }
  } else {
    // 今日未签到
    signStatus.value = {
      signed: false,
      message: '今日还未签到',
      hint: '点击签到，写下今日寄语'
    }
  }
}

// 复制文本
const copyToClipboard = async (text, message = '已复制') => {
  const success = await copyText(text)
  if (success) {
    showToast(message, 'success')
  } else {
    showToast('复制失败', 'error')
  }
}

// 复制密码（根据 must_otp 判断）
const copyPassword = async () => {
  try {
    if (userInfo.value?.must_otp) {
      // must_otp 为 true，获取动态密码
      const password = await userApi.getLoginPassword()
      if (password && password.data) {
        await copyToClipboard(password.data, '已复制动态密码')
      } else {
        showToast('获取密码失败', 'error')
      }
    } else {
      // must_otp 为 false，直接复制固定密码
      const password = userInfo.value?.emya_password || ''
      if (password) {
        await copyToClipboard(password, '已复制密码')
      } else {
        showToast('暂无密码信息', 'error')
      }
    }
  } catch (error) {
    showToast('获取密码失败: ' + error.message, 'error')
  }
}

// 获取用户角色文本
const getUserRoleText = () => {
  const roleMap = {
    admin: '管理员',
    dev: '开发者',
    moderator: '版主',
    uploader: '上传者',
    vip: 'VIP'
  }
  
  const roles = userInfo.value?.roles || []
  if (roles.length > 0) {
    const roleNames = roles.map(role => roleMap[role] || role)
    return roleNames.join(', ')
  } else {
    return '普通用户'
  }
}

// 打开模态框
const openModal = (modalName) => {
  modals[modalName] = true
  
  // 特殊处理萝卜模态框
  if (modalName === 'carrot') {
    // 重置状态
    carrotModalState.activeTab = 'history'
    loadCarrotHistory()
  } else if (modalName === 'upload') {
    loadUploadRank()
  } else if (modalName === 'signRank') {
    loadSignRank()
  } else if (modalName === 'invite') {
    // 邀请名额模态框
    loadInviteMyInfo()
  } else if (modalName === 'redpacket') {
    // 红包工具模态框
    redpacketModalState.activeTab = 'send'
    redpacketModalState.sendForm.type = 'fixed'
    redpacketModalState.coverTab = 'upload'
  } else if (modalName === 'lottery') {
    // 抽奖工具模态框
    lotteryModalState.activeTab = 'create'
    lotteryModalState.createForm.amount = 1
    lotteryModalState.createForm.number = 0
    lotteryModalState.createForm.rule_carrot = 0
    lotteryModalState.createForm.rule_sign = 0
    lotteryModalState.prizes = []
  } else if (modalName === 'vote') {
    // 投票工具模态框
    voteModalState.question = ''
    voteModalState.seconds = 3600
    voteModalState.options = ['', '']
  } else if (modalName === 'viewing') {
    // 请求记录模态框
    viewingModalState.page = 1
    viewingModalState.total = 0
    viewingModalState.hasMore = true
    viewingModalState.list = []
    loadViewingRequests()
  }
}

// 关闭模态框
const closeModal = (modalName) => {
  modals[modalName] = false
}

// 切换萝卜模态框Tab
const switchCarrotTab = (tab) => {
  carrotModalState.activeTab = tab
  if (tab === 'rank' && carrotModalState.rankList.length === 0) {
    loadCarrotRank()
  } else if (tab === 'history') {
    // 从排行榜返回时重新加载历史记录
    loadCarrotHistory()
  }
}

// 提交签到
const submitSign = async () => {
  if (forms.sign.submitting) return
  forms.sign.submitting = true
  
  const content = forms.sign.content.trim()
  
  try {
    await signApi.submit(content)
    showToast('签到成功！', 'success')
    closeModal('sign')
    forms.sign.content = ''
    await loadUserInfo() // 先刷新用户信息（会更新 localStorage）
    checkSignStatus() // 再检查签到状态
  } catch (error) {
    showToast('签到失败: ' + error.message, 'error')
  } finally {
    forms.sign.submitting = false
  }
}

// 提交转赠
const submitTransfer = async () => {
  if (forms.transfer.submitting) return
  
  const { userId, amount } = forms.transfer
  
  if (!userId || !amount) {
    showToast('请填写完整信息', 'error')
    return
  }
  
  forms.transfer.submitting = true
  
  try {
    await userApi.transferCarrot(userId, parseInt(amount))
    showToast('转赠成功', 'success')
    closeModal('transfer')
    forms.transfer = { userId: '', amount: '', submitting: false }
    await loadUserInfo() // 刷新用户信息（会更新 localStorage）
  } catch (error) {
    showToast('转赠失败: ' + error.message, 'error')
  } finally {
    forms.transfer.submitting = false
  }
}

// 提交邀请
const submitInvite = async () => {
  if (forms.invite.submitting) return
  
  const userId = forms.invite.userId.trim()
  
  if (!userId) {
    showToast('请输入用户ID', 'error')
    return
  }
  
  forms.invite.submitting = true
  
  try {
    await userApi.invite(userId)
    showToast('邀请发送成功', 'success')
    closeModal('invite')
    forms.invite = { userId: '', submitting: false }
    await loadUserInfo() // 刷新用户信息（会更新 localStorage）
  } catch (error) {
    showToast('邀请失败: ' + error.message, 'error')
  } finally {
    forms.invite.submitting = false
  }
}

// 加载萝卜历史记录
const loadCarrotHistory = async () => {
  carrotModalState.historyPage = 1
  carrotModalState.historyTotal = 0
  carrotModalState.historyHasMore = true
  carrotModalState.historyList = []
  await fetchCarrotHistory(false)
}

// 加载更多萝卜历史记录
const loadMoreCarrotHistory = async () => {
  if (carrotModalState.historyLoading || !carrotModalState.historyHasMore) return
  carrotModalState.historyPage++
  await fetchCarrotHistory(true)
}

// 获取萝卜历史记录
const fetchCarrotHistory = async (isLoadMore = false) => {
  if (carrotModalState.historyLoading) return
  
  carrotModalState.historyLoading = true
  
  try {
    const result = await carrotApi.history({
      page: carrotModalState.historyPage,
      page_size: carrotModalState.historyPageSize
    })
    
    const items = result.items || []
    carrotModalState.historyTotal = result.total || 0
    
    if (isLoadMore) {
      carrotModalState.historyList.push(...items)
    } else {
      carrotModalState.historyList = items
    }
    
    // 检查是否还有更多数据
    if (carrotModalState.historyPage * carrotModalState.historyPageSize >= carrotModalState.historyTotal) {
      carrotModalState.historyHasMore = false
    } else {
      carrotModalState.historyHasMore = true
    }
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
  } finally {
    carrotModalState.historyLoading = false
  }
}

// 加载萝卜排行榜
const loadCarrotRank = async () => {
  carrotModalState.rankLoading = true
  try {
    const rankList = await carrotApi.rank()
    carrotModalState.rankList = rankList || []
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
    carrotModalState.rankList = []
  } finally {
    carrotModalState.rankLoading = false
  }
}

// 加载上传排行榜
const loadUploadRank = async () => {
  uploadRankState.loading = true
  try {
    const rankList = await uploadApi.rank()
    uploadRankState.rankList = rankList || []
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
    uploadRankState.rankList = []
  } finally {
    uploadRankState.loading = false
  }
}

// 加载请求记录数据
const loadViewingRequests = async (isLoadMore = false) => {
  if (viewingModalState.loading) return
  
  viewingModalState.loading = true
  
  try {
    const result = await viewingApi.requests({
      page: viewingModalState.page,
      page_size: viewingModalState.pageSize
    })
    
    const items = result.items || []
    viewingModalState.total = result.total || 0
    
    if (isLoadMore) {
      viewingModalState.list = [...viewingModalState.list, ...items]
    } else {
      viewingModalState.list = items
    }
    
    // 判断是否还有更多数据
    viewingModalState.hasMore = viewingModalState.list.length < viewingModalState.total
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
    viewingModalState.list = []
  } finally {
    viewingModalState.loading = false
  }
}

// 分析视频请求的异常程度
const analyzeVideoRequests = computed(() => {
  const videoStats = {}
  
  // 统计每个视频的请求信息
  viewingModalState.list.forEach(item => {
    if (!videoStats[item.video_title]) {
      videoStats[item.video_title] = {
        requests: [],
        ips: new Set(),
        uas: new Set()
      }
    }
    
    videoStats[item.video_title].requests.push({
      time: new Date(item.time).getTime(),
      ip: item.ip,
      ua: item.ua,
      range: item.range
    })
    videoStats[item.video_title].ips.add(item.ip)
    videoStats[item.video_title].uas.add(item.ua)
  })
  
  const warningMap = {}
  
  Object.entries(videoStats).forEach(([title, stats]) => {
    // 按时间排序
    const sortedRequests = stats.requests.sort((a, b) => a.time - b.time)
    
    // 检测1：5分钟内请求次数 > 10次（异常密集）
    const fiveMinutes = 5 * 60 * 1000
    let maxRequestsInWindow = 0
    
    for (let i = 0; i < sortedRequests.length; i++) {
      let count = 0
      for (let j = i; j < sortedRequests.length; j++) {
        if (sortedRequests[j].time - sortedRequests[i].time <= fiveMinutes) {
          count++
        } else {
          break
        }
      }
      maxRequestsInWindow = Math.max(maxRequestsInWindow, count)
    }
    
    if (maxRequestsInWindow > 10) {
      warningMap[title] = {
        level: 'high',
        reason: `5分钟内${maxRequestsInWindow}次请求`,
        icon: 'fa-exclamation-triangle'
      }
      return
    }
    
    // 检测2：多IP访问（>= 3个不同IP）
    if (stats.ips.size >= 3) {
      warningMap[title] = {
        level: 'medium',
        reason: `${stats.ips.size}个不同IP访问`,
        icon: 'fa-network-wired'
      }
      return
    }
    
    // 检测3：多UA混合（>= 2个不同UA）
    if (stats.uas.size >= 2) {
      warningMap[title] = {
        level: 'low',
        reason: `${stats.uas.size}种不同客户端`,
        icon: 'fa-desktop'
      }
    }
  })
  
  return warningMap
})

// 获取警告级别
const getWarningLevel = (title) => {
  return analyzeVideoRequests.value[title]?.level || null
}

// 获取警告原因
const getWarningReason = (title) => {
  return analyzeVideoRequests.value[title]?.reason || ''
}

// 获取警告图标
const getWarningIcon = (title) => {
  return analyzeVideoRequests.value[title]?.icon || ''
}

// 切换邀请模态框Tab
const switchInviteTab = (tab) => {
  inviteModalState.activeTab = tab
  if (tab === 'my-info' && !inviteModalState.myInfo) {
    loadInviteMyInfo()
  } else if (tab === 'history' && inviteModalState.historyList.length === 0) {
    loadInviteHistory()
  }
}

// 加载我的邀请信息
const loadInviteMyInfo = async () => {
  try {
    const info = await inviteApi.info()
    inviteModalState.myInfo = info
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
    inviteModalState.myInfo = null
  }
}

// 加载邀请历史
const loadInviteHistory = async () => {
  inviteModalState.historyPage = 1
  inviteModalState.historyTotal = 0
  inviteModalState.historyHasMore = true
  inviteModalState.historyList = []
  await fetchInviteHistory(false)
}

// 加载更多邀请历史
const loadMoreInviteHistory = async () => {
  if (inviteModalState.historyLoading || !inviteModalState.historyHasMore) return
  inviteModalState.historyPage++
  await fetchInviteHistory(true)
}

// 获取邀请历史
const fetchInviteHistory = async (isLoadMore = false) => {
  if (inviteModalState.historyLoading) return
  
  inviteModalState.historyLoading = true
  
  try {
    const result = await inviteApi.history({
      page: inviteModalState.historyPage,
      page_size: inviteModalState.historyPageSize
    })
    
    const items = result.items || []
    inviteModalState.historyTotal = result.total || 0
    
    if (isLoadMore) {
      inviteModalState.historyList.push(...items)
    } else {
      inviteModalState.historyList = items
    }
    
    // 检查是否还有更多数据
    if (inviteModalState.historyPage * inviteModalState.historyPageSize >= inviteModalState.historyTotal) {
      inviteModalState.historyHasMore = false
    } else {
      inviteModalState.historyHasMore = true
    }
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
  } finally {
    inviteModalState.historyLoading = false
  }
}

// 取消邀请
const revokeInvite = async (userId) => {
  if (!confirm('确定要取消该邀请吗？')) return
  
  try {
    await inviteApi.revoke(userId)
    showToast('已取消邀请', 'success')
    // 重新加载列表
    loadInviteHistory()
    // 刷新用户信息以更新邀请名额
    await loadUserInfo()
  } catch (error) {
    showToast(error.message || '操作失败', 'error')
  }
}

// 滚动加载处理
const handleInviteHistoryScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // 当滚动到距离底部 50px 时加载更多
  if (scrollHeight - scrollTop - clientHeight < 50) {
    loadMoreInviteHistory()
  }
}

// 加载签到排行榜
const loadSignRank = async () => {
  signRankState.loading = true
  try {
    const rankList = await signApi.rank()
    signRankState.rankList = rankList || []
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
    signRankState.rankList = []
  } finally {
    signRankState.loading = false
  }
}

// 切换红包模态框Tab
const switchRedpacketTab = (tab) => {
  redpacketModalState.activeTab = tab
  
  // 如果切换到领取记录Tab，且已有查询ID，则加载记录
  if (tab === 'record' && redpacketModalState.recordId) {
    loadRedpacketRecords()
  }
}

// 切换红包封面Tab
const switchCoverTab = (tab) => {
  redpacketModalState.coverTab = tab
}

// 处理文件选择
const handleCoverFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
    showToast('仅支持图片和音频文件', 'error')
    return
  }
  
  // 验证文件大小（80MB）
  const maxSize = 80 * 1024 * 1024
  if (file.size > maxSize) {
    showToast('文件大小不能超过 80MB', 'error')
    return
  }
  
  // 显示预览
  redpacketModalState.coverFile = file
  redpacketModalState.coverFileType = file.type.startsWith('image/') ? 'image' : 'audio'
  redpacketModalState.coverPreviewUrl = URL.createObjectURL(file)
  
  // 上传文件
  await uploadCoverFile(file)
}

// 上传封面文件
const uploadCoverFile = async (file) => {
  redpacketModalState.uploading = true
  
  try {
    showToast('正在上传文件...', 'info')
    
    // 获取用户ID
    const userId = userInfo.value?.id || userInfo.value?.user_id || ''
    
    // 使用临时服务器上传
    const formData = new FormData()
    formData.append('file', file)
    formData.append('emos_id', userId)
    
    const response = await fetch('/temporary/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`)
    }
    
    const result = await response.json()
    showToast('文件上传成功！', 'success')
    
    // 自动切换到外链Tab并填充URL
    redpacketModalState.coverTab = 'url'
    redpacketModalState.coverUrl = result.url
    
  } catch (error) {
    console.error('上传失败:', error)
    showToast(error.message || '文件上传失败', 'error')
  } finally {
    redpacketModalState.uploading = false
    // 清空文件输入
    const fileInput = document.getElementById('rpCoverFile')
    if (fileInput) fileInput.value = ''
  }
}

// 删除封面预览
const deleteCoverPreview = () => {
  if (redpacketModalState.coverPreviewUrl) {
    URL.revokeObjectURL(redpacketModalState.coverPreviewUrl)
  }
  redpacketModalState.coverFile = null
  redpacketModalState.coverPreviewUrl = null
  redpacketModalState.coverFileType = null
  redpacketModalState.coverUrl = ''
}

// 提交发红包
const submitRedpacket = async () => {
  if (redpacketModalState.uploading) return
  
  const { type, carrot, number, blessing, text } = redpacketModalState.sendForm
  const coverUrl = redpacketModalState.coverUrl.trim()
  
  // 验证必填字段
  const carrotNum = parseInt(carrot)
  const numberNum = parseInt(number)
  
  if (!carrotNum || carrotNum < 1 || carrotNum > 60000) {
    showToast('红包总金额必须为 1-60000', 'error')
    return
  }
  
  if (!numberNum || numberNum < 1 || numberNum > 10000) {
    showToast('红包个数必须为 1-10000', 'error')
    return
  }
  
  if (!blessing) {
    showToast('请输入祝福语', 'error')
    return
  }
  
  // 口令模式需要填写口令
  if (type === 'password' && !text) {
    showToast('口令红包必须填写口令内容', 'error')
    return
  }
  
  // 验证外链格式（如果填写了）
  if (coverUrl && !coverUrl.match(/^https?:\/\//)) {
    showToast('外链必须以 http:// 或 https:// 开头', 'error')
    return
  }
  
  redpacketModalState.uploading = true
  
  // 构建请求数据
  const requestData = {
    type,
    carrot: carrotNum,
    number: numberNum,
    blessing
  }
  
  // 如果是口令模式，添加 text 字段
  if (type === 'password') {
    requestData.text = text
  }
  
  // 如果有封面 URL，添加 file_url 和 file_type 字段
  if (coverUrl) {
    requestData.file_url = coverUrl
    // 根据 URL 后缀判断文件类型
    if (coverUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i)) {
      requestData.file_type = 'image'
    } else if (coverUrl.match(/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i)) {
      requestData.file_type = 'audio'
    }
  }
  
  try {
    await userApi.createRedPacket(requestData)
    showToast('红包已发出！', 'success')
    
    closeModal('redpacket')
    
    // 清空表单
    redpacketModalState.sendForm.carrot = ''
    redpacketModalState.sendForm.number = ''
    redpacketModalState.sendForm.blessing = ''
    redpacketModalState.sendForm.text = ''
    redpacketModalState.sendForm.type = 'fixed'
    
    // 重置红包封面
    deleteCoverPreview()
    
    // 刷新用户信息以更新萝卜余额
    await loadUserInfo()
  } catch (error) {
    showToast(error.message || '发红包失败', 'error')
  } finally {
    redpacketModalState.uploading = false
  }
}

// 查询红包领取记录
const queryRedpacketRecords = () => {
  const recordId = redpacketModalState.recordId.trim()
  
  if (!recordId) {
    showToast('请输入红包 ID', 'error')
    return
  }
  
  // 重置分页状态
  redpacketModalState.recordPage = 1
  redpacketModalState.recordList = []
  redpacketModalState.recordHasMore = true
  
  loadRedpacketRecords()
}

// 加载红包领取记录
const loadRedpacketRecords = async (isLoadMore = false) => {
  if (redpacketModalState.recordLoading || !redpacketModalState.recordHasMore) return
  
  redpacketModalState.recordLoading = true
  
  try {
    const result = await userApi.getRedPacketRecords(
      redpacketModalState.recordId,
      redpacketModalState.recordPage,
      redpacketModalState.recordPageSize
    )
    
    const records = result.data || []
    redpacketModalState.recordTotal = result.total || 0
    
    if (isLoadMore) {
      redpacketModalState.recordList.push(...records)
    } else {
      redpacketModalState.recordList = records
    }
    
    // 检查是否还有更多数据
    redpacketModalState.recordHasMore = redpacketModalState.recordList.length < redpacketModalState.recordTotal
    
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
    if (!isLoadMore) {
      redpacketModalState.recordList = []
    }
  } finally {
    redpacketModalState.recordLoading = false
  }
}

// 加载更多红包记录
const loadMoreRedpacketRecords = () => {
  if (redpacketModalState.recordHasMore && !redpacketModalState.recordLoading) {
    redpacketModalState.recordPage++
    loadRedpacketRecords(true)
  }
}

// 滚动加载处理
const handleRedpacketRecordScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // 当滚动到距离底部 50px 时加载更多
  if (scrollHeight - scrollTop - clientHeight < 50) {
    loadMoreRedpacketRecords()
  }
}

// 切换抽奖模态框Tab
const switchLotteryTab = (tab) => {
  lotteryModalState.activeTab = tab
  
  // 如果切换到中奖列表Tab，且已有查询ID，则加载记录
  if (tab === 'winners' && lotteryModalState.winnerQueryId) {
    loadLotteryWinners()
  }
}

// 添加奖品
const addPrize = () => {
  if (lotteryModalState.prizes.length >= 20) {
    showToast('最多只能添加 20 个奖品', 'error')
    return
  }
  
  lotteryModalState.prizes.push({
    name: '',
    count: 1,
    description: '',
    bodys: ''
  })
}

// 删除奖品
const removePrize = (index) => {
  lotteryModalState.prizes.splice(index, 1)
}

// 提交创建抽奖
const submitLottery = async () => {
  if (lotteryModalState.isSubmitting) return
  
  const { name, description, time_start, time_end, amount, number, rule_carrot, rule_sign } = lotteryModalState.createForm
  
  // 验证必填字段
  if (!name) {
    showToast('请输入抽奖名称', 'error')
    return
  }
  
  if (!time_start) {
    showToast('请选择开始时间', 'error')
    return
  }
  
  if (!time_end) {
    showToast('请选择结束时间', 'error')
    return
  }
  
  if (lotteryModalState.prizes.length === 0) {
    showToast('请至少添加一个奖品', 'error')
    return
  }
  
  // 验证奖品
  for (let i = 0; i < lotteryModalState.prizes.length; i++) {
    const prize = lotteryModalState.prizes[i]
    if (!prize.name) {
      showToast(`请填写第 ${i + 1} 个奖品名称`, 'error')
      return
    }
    if (!prize.count || prize.count < 1 || prize.count > 100) {
      showToast(`第 ${i + 1} 个奖品数量必须为 1-100`, 'error')
      return
    }
  }
  
  lotteryModalState.isSubmitting = true
  
  // 构建请求数据
  const requestData = {
    name,
    description: description || '',
    time_start,
    time_end,
    amount: parseInt(amount) || 1,
    number: parseInt(number) || 0,
    rule: {
      carrot: parseInt(rule_carrot) || 0,
      sign: parseInt(rule_sign) || 0
    },
    prizes: lotteryModalState.prizes.map(p => ({
      name: p.name,
      count: parseInt(p.count),
      description: p.description || '',
      bodys: p.bodys || ''
    }))
  }
  
  try {
    await lotteryApi.create(requestData)
    showToast('抽奖创建成功！', 'success')
    closeModal('lottery')
    
    // 清空表单
    lotteryModalState.createForm.name = ''
    lotteryModalState.createForm.description = ''
    lotteryModalState.createForm.time_start = ''
    lotteryModalState.createForm.time_end = ''
    lotteryModalState.createForm.amount = 1
    lotteryModalState.createForm.number = 0
    lotteryModalState.createForm.rule_carrot = 0
    lotteryModalState.createForm.rule_sign = 0
    lotteryModalState.prizes = []
    
    // 刷新用户信息以更新萝卜余额
    await loadUserInfo()
  } catch (error) {
    showToast(error.message || '创建抽奖失败', 'error')
  } finally {
    lotteryModalState.isSubmitting = false
  }
}

// 查询中奖列表
const queryLotteryWinners = () => {
  const winnerId = lotteryModalState.winnerQueryId.trim()
  
  if (!winnerId) {
    showToast('请输入抽奖 ID', 'error')
    return
  }
  
  // 重置分页状态
  lotteryModalState.winnerPage = 1
  lotteryModalState.winnerList = []
  lotteryModalState.winnerHasMore = true
  
  loadLotteryWinners()
}

// 加载中奖列表
const loadLotteryWinners = async (isLoadMore = false) => {
  if (lotteryModalState.winnerLoading || !lotteryModalState.winnerHasMore) return
  
  lotteryModalState.winnerLoading = true
  
  try {
    const result = await lotteryApi.winners(
      lotteryModalState.winnerQueryId,
      {
        page: lotteryModalState.winnerPage,
        page_size: lotteryModalState.winnerPageSize
      }
    )
    
    const winners = result.data || []
    lotteryModalState.winnerTotal = result.total || 0
    
    if (isLoadMore) {
      lotteryModalState.winnerList.push(...winners)
    } else {
      lotteryModalState.winnerList = winners
    }
    
    // 检查是否还有更多数据
    lotteryModalState.winnerHasMore = lotteryModalState.winnerList.length < lotteryModalState.winnerTotal
    
  } catch (error) {
    showToast(error.message || '加载失败', 'error')
    if (!isLoadMore) {
      lotteryModalState.winnerList = []
    }
  } finally {
    lotteryModalState.winnerLoading = false
  }
}

// 加载更多中奖记录
const loadMoreLotteryWinners = () => {
  if (lotteryModalState.winnerHasMore && !lotteryModalState.winnerLoading) {
    lotteryModalState.winnerPage++
    loadLotteryWinners(true)
  }
}

// 滚动加载处理
const handleLotteryWinnerScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // 当滚动到距离底部 50px 时加载更多
  if (scrollHeight - scrollTop - clientHeight < 50) {
    loadMoreLotteryWinners()
  }
}

// 取消抽奖
const cancelLottery = async () => {
  const winnerId = lotteryModalState.winnerQueryId.trim()
  
  if (!winnerId) {
    showToast('请输入抽奖 ID', 'error')
    return
  }
  
  if (!confirm('确定要取消这个抽奖吗？此操作不可恢复。')) {
    return
  }
  
  try {
    await lotteryApi.cancel(winnerId)
    showToast('抽奖已取消', 'success')
    
    // 重新加载中奖列表
    lotteryModalState.winnerPage = 1
    lotteryModalState.winnerList = []
    lotteryModalState.winnerHasMore = true
    await loadLotteryWinners()
  } catch (error) {
    showToast(error.message || '取消失败', 'error')
  }
}

// 添加投票选项
const addVoteOption = () => {
  if (voteModalState.options.length >= 12) {
    showToast('最多只能添加 12 个选项', 'error')
    return
  }
  
  voteModalState.options.push('')
}

// 删除投票选项
const removeVoteOption = (index) => {
  voteModalState.options.splice(index, 1)
}

// 提交创建投票
const submitVote = async () => {
  if (voteModalState.isSubmitting) return
  
  const question = voteModalState.question.trim()
  const seconds = parseInt(voteModalState.seconds)
  
  // 过滤空选项
  const options = voteModalState.options.filter(opt => opt.trim())
  
  // 验证
  if (!question) {
    showToast('请输入投票问题', 'error')
    return
  }
  
  if (options.length < 2) {
    showToast('至少需要 2 个选项', 'error')
    return
  }
  
  if (!seconds || seconds < 60) {
    showToast('过期时间最少 60 秒', 'error')
    return
  }
  
  voteModalState.isSubmitting = true
  
  try {
    await voteApi.create({
      question,
      options: options.map(opt => opt.trim()),
      seconds
    })
    
    showToast('投票创建成功！', 'success')
    closeModal('vote')
    
    // 清空表单
    voteModalState.question = ''
    voteModalState.seconds = 3600
    voteModalState.options = ['', '']
  } catch (error) {
    showToast(error.message || '创建失败', 'error')
  } finally {
    voteModalState.isSubmitting = false
  }
}

// 滚动加载处理
const handleCarrotHistoryScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // 当滚动到距离底部 50px 时加载更多
  if (scrollHeight - scrollTop - clientHeight < 50) {
    loadMoreCarrotHistory()
  }
}

onMounted(() => {
  loadUserInfo()
})
</script>

<template>
  <!-- MainLayout 已提供 main-wrapper，这里直接渲染内容 -->
  <header class="page-header">
    <h1 class="page-title">仪表盘</h1>
    <p class="page-subtitle">欢迎回来，<span>{{ userInfo?.pseudonym || userInfo?.username }}</span></p>
  </header>

  <div v-if="isLoading" class="loading-state">
    <i class="fas fa-circle-notch"></i>
    <p>加载中...</p>
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
          <div class="user-name">{{ userInfo?.pseudonym || userInfo?.username }}</div>
          <div class="profile-role">
            <span>{{ getUserRoleText() }}</span>
          </div>
        </div>
        <div class="quick-actions">
          <div class="action-icon" @click="copyToClipboard(userInfo?.user_id, '已复制用户ID')" title="复制用户ID">
            <i class="fas fa-id-card"></i>
          </div>
          <div class="action-icon" @click="copyToClipboard(activeToken || '', '已复制Token')" title="复制 Token">
            <i class="fas fa-key"></i>
          </div>
          <div class="action-icon" @click="copyPassword" title="复制密码">
            <i class="fas fa-lock"></i>
          </div>
        </div>
      </div>
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
          <div class="stat-value">{{ animatedStats.watch_slot_remaining }}</div>
          <div class="stat-label"><i class="fas fa-clapperboard"></i> 片单额度</div>
        </div>
      </div>
    </div>

    <!-- 服务器信息卡片 -->
    <div class="bento-card card-server">
      <div class="card-header">
        <i class="fas fa-server"></i>
        <span>服务器连接</span>
      </div>
      <div class="server-links">
        <!-- Emby 地址 - 仅当有值时显示 -->
        <div 
          v-if="userInfo?.emya_url" 
          class="copy-link-btn" 
          @click="copyToClipboard(userInfo.emya_url, '已复制Emby地址')"
        >
          <span>Emby 地址</span>
          <i class="far fa-copy"></i>
        </div>
        <!-- TV 端地址 - 仅当有值时显示 -->
        <div 
          v-if="userInfo?.emya_live_url" 
          class="copy-link-btn" 
          @click="copyToClipboard(userInfo.emya_live_url, '已复制TV端地址')"
        >
          <span>TV 端地址</span>
          <i class="far fa-copy"></i>
        </div>
        <!-- 登录用户名 -->
        <div class="copy-link-btn" @click="copyToClipboard(userInfo?.username || '', '已复制用户名')">
          <span>登录用户名</span>
          <i class="far fa-copy"></i>
        </div>
      </div>
    </div>

    <!-- 签到卡片 -->
    <div class="bento-card card-signin">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="fas fa-calendar-check"></i>
          <span>每日签到</span>
        </div>
        <i class="fas fa-trophy" style="color:var(--accent);font-size:1.1rem;cursor:pointer;transition:all 0.2s var(--ease);" @click="openModal('signRank')" @mouseenter="$event.target.style.transform='scale(1.2)'" @mouseleave="$event.target.style.transform='scale(1)'"></i>
      </div>
      <div class="signin-visual">
        <div class="signin-ring"></div>
      </div>
      <div class="signin-status">
        <div class="signin-msg">{{ signStatus.message || '今日还未签到' }}</div>
        <div class="signin-hint" v-html="signStatus.hint || '点击签到，写下今日寄语'"></div>
      </div>
      <button class="btn-primary" :class="{ signed: signStatus.signed }" @click="openModal('sign')" :disabled="signStatus.signed">
        <i class="fas fa-check-circle"></i> {{ signStatus.signed ? '已签到' : '立即签到' }}
      </button>
    </div>

    <!-- 快捷操作卡片 -->
    <div class="bento-card card-actions">
      <div class="card-header">
        <i class="fas fa-bolt"></i> 
        <span>快捷操作</span>
      </div>
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

  <!-- ================= 模态框区域 ================= -->
  
  <!-- 签到成功弹窗 -->
  <div
    v-show="modals.sign"
    :class="['modal-overlay', { show: modals.sign }]" 
    @click.self="closeModal('sign')"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h3>今日签到</h3>
        <button class="modal-close" @click="closeModal('sign')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <input 
            type="text" 
            class="modal-input" 
            v-model="forms.sign.content"
            placeholder="对自己说点什么...（最多 10 字）" 
            maxlength="10"
          >
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeModal('sign')">取消</button>
        <button class="modal-btn primary" @click="submitSign" :disabled="forms.sign.submitting">
          <span v-if="!forms.sign.submitting">提交签到</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 转赠萝卜弹窗 -->
  <div
    v-show="modals.transfer"
    :class="['modal-overlay', { show: modals.transfer }]" 
    @click.self="closeModal('transfer')"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h3>转赠萝卜</h3>
        <button class="modal-close" @click="closeModal('transfer')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
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
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeModal('transfer')">取消</button>
        <button class="modal-btn primary" @click="submitTransfer" :disabled="forms.transfer.submitting">
          <span v-if="!forms.transfer.submitting">确认转赠</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 邀请用户弹窗（简单版） -->
  <div
    v-show="modals.simpleInvite"
    :class="['modal-overlay', { show: modals.simpleInvite }]" 
    @click.self="closeModal('simpleInvite')"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h3>邀请用户</h3>
        <button class="modal-close" @click="closeModal('simpleInvite')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
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
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeModal('simpleInvite')">取消</button>
        <button class="modal-btn primary" @click="submitInvite" :disabled="forms.invite.submitting">
          <span v-if="!forms.invite.submitting">邀请</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 邀请名额弹窗（带Tab） -->
  <div
    v-show="modals.invite"
    :class="['modal-overlay', { show: modals.invite }]" 
    @click.self="closeModal('invite')"
  >
    <div class="modal-content xxl">
      <div class="modal-header">
        <h3>邀请名额</h3>
        <button class="modal-close" @click="closeModal('invite')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body invite-modal-body">
        <!-- Tab切换（苹果胶囊样式） -->
        <div class="invite-tab-container">
          <div class="invite-tab-group">
            <button 
              :class="['invite-main-tab', { active: inviteModalState.activeTab === 'my-info' }]"
              @click="switchInviteTab('my-info')"
            >我的邀请</button>
            <button 
              :class="['invite-main-tab', { active: inviteModalState.activeTab === 'history' }]"
              @click="switchInviteTab('history')"
            >邀请记录</button>
          </div>
        </div>
        
        <!-- 我的邀请Tab内容 -->
        <div v-show="inviteModalState.activeTab === 'my-info'" id="inviteMyInfoTab">
          <div id="inviteMyInfoContainer" class="invite-content-container">
            <!-- 加载中骨架屏 -->
            <div v-if="!inviteModalState.myInfo" class="invite-skeleton">
              <div class="invite-stats-card skeleton-card">
                <div class="invite-stats-row">
                  <div class="invite-stat-item">
                    <div class="skeleton-stat-value"></div>
                    <div class="skeleton-stat-label"></div>
                  </div>
                  <div class="invite-stat-item">
                    <div class="skeleton-stat-value"></div>
                    <div class="skeleton-stat-label"></div>
                  </div>
                  <div class="invite-stat-item">
                    <div class="skeleton-stat-value"></div>
                    <div class="skeleton-stat-label"></div>
                  </div>
                </div>
              </div>
              <div class="invite-link-card skeleton-card">
                <div class="invite-link-row">
                  <div class="skeleton-avatar-circle"></div>
                  <div class="invite-link-info">
                    <div class="skeleton-text-xs"></div>
                    <div class="skeleton-text-sm"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 我的邀请信息 -->
            <div v-else style="display:flex;flex-direction:column;gap:16px;">
              <!-- 邀请统计卡片 -->
              <div style="background:var(--bg-input);border-radius:16px;padding:24px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-around;text-align:center;">
                  <div style="flex:1;">
                    <div style="color:var(--accent);font-size:2rem;font-weight:700;margin-bottom:4px;">{{ inviteModalState.myInfo.invite_count || 0 }}</div>
                    <div style="color:var(--text-tertiary);font-size:0.85rem;">累计邀请</div>
                  </div>
                  <div style="flex:1;">
                    <div style="color:var(--accent);font-size:2rem;font-weight:700;margin-bottom:4px;">{{ userInfo?.roles?.includes('admin') ? '∞' : (inviteModalState.myInfo.invite_remaining || 0) }}</div>
                    <div style="color:var(--text-tertiary);font-size:0.85rem;">剩余名额</div>
                  </div>
                  <div style="flex:1;">
                    <div style="color:var(--accent);font-size:2rem;font-weight:700;margin-bottom:4px;">{{ inviteModalState.myInfo.invite_at || '-' }}</div>
                    <div style="color:var(--text-tertiary);font-size:0.85rem;">邀请时间</div>
                  </div>
                </div>
              </div>
              
              <!-- 邀请人信息 -->
              <div v-if="inviteModalState.myInfo.parent && inviteModalState.myInfo.parent.pseudonym" style="background:var(--bg-input);border-radius:16px;padding:16px 24px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <i class="fas fa-user-friends" style="color:var(--accent);font-size:1.2rem;"></i>
                  <div>
                    <div style="color:var(--text-tertiary);font-size:0.8rem;margin-bottom:2px;">我的邀请人</div>
                    <div style="color:var(--text-primary);font-size:0.95rem;font-weight:500;">{{ inviteModalState.myInfo.parent.pseudonym }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 邀请记录Tab内容 -->
        <div v-show="inviteModalState.activeTab === 'history'" id="inviteHistoryTab">
          <div 
            id="inviteHistoryScrollContainer" 
            style="max-height:450px;overflow-y:auto;padding:8px 0;"
            @scroll="handleInviteHistoryScroll"
          >
            <div id="inviteHistoryListContainer" style="display:flex;flex-direction:column;gap:8px;padding:0 4px;">
              <!-- 加载中骨架屏 -->
              <div v-if="inviteModalState.historyList.length === 0 && inviteModalState.historyLoading">
                <div v-for="i in 5" :key="i" style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;border-bottom:0.5px solid var(--border);">
                  <div style="width:40px;height:40px;background:var(--bg-input);border-radius:50%;margin-right:14px;"></div>
                  <div style="flex:1;">
                    <div style="height:16px;background:var(--bg-input);border-radius:4px;width:60%;margin-bottom:8px;"></div>
                    <div style="height:12px;background:var(--bg-input);border-radius:4px;width:40%;"></div>
                  </div>
                  <div style="width:60px;height:32px;background:var(--bg-input);border-radius:8px;margin-left:16px;"></div>
                </div>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="inviteModalState.historyList.length === 0 && !inviteModalState.historyLoading" style="padding:40px 20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
                暂无邀请记录
              </div>
              
              <!-- 邀请历史列表 -->
              <div 
                v-for="(item, index) in inviteModalState.historyList" 
                :key="item.id || index"
                style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;border-bottom:0.5px solid var(--border);"
              >
                <!-- 头像占位 -->
                <div style="width:40px;height:40px;border-radius:50%;background:rgba(120, 120, 128, 0.16);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-weight:600;font-size:1rem;flex-shrink:0;margin-right:14px;">
                  {{ (item.username || '?').charAt(0).toUpperCase() }}
                </div>
                
                <!-- 中间内容 -->
                <div style="flex:1;min-width:0;">
                  <!-- 用户名 -->
                  <div style="color:var(--text-primary);font-weight:400;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;">
                    {{ item.username || '未知用户' }}
                  </div>
                  
                  <!-- 副标题：时间 -->
                  <div style="color:var(--text-tertiary);font-size:0.8rem;">
                    {{ item.invite_at || '-' }}
                  </div>
                </div>
                
                <!-- 右侧：取消按钮 -->
                <button 
                  @click="revokeInvite(item.user_id)"
                  style="margin-left:16px;padding:6px 12px;border:none;border-radius:8px;background:var(--danger);color:#fff;font-size:0.8rem;font-weight:500;cursor:pointer;flex-shrink:0;transition:all 0.2s var(--ease);"
                >
                  取消邀请
                </button>
              </div>
              
              <!-- 加载更多提示 -->
              <div v-if="inviteModalState.historyLoading && inviteModalState.historyList.length > 0" class="loading-state" style="padding: 1.5rem;">
                <i class="fas fa-circle-notch"></i>
                <p>加载中...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 红包工具弹窗 -->
  <div
    v-show="modals.redpacket"
    :class="['modal-overlay', { show: modals.redpacket }]" 
    @click.self="closeModal('redpacket')"
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">红包工具</span>
        <button class="modal-close" @click="closeModal('redpacket')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:20px;">
        <!-- 主Tab切换（苹果胶囊样式） -->
        <div style="display:flex;margin-bottom:20px;">
          <div style="display:inline-flex;background:var(--bg-input);border-radius:12px;padding:3px;gap:2px;">
            <button 
              :class="['rp-main-tab', { active: redpacketModalState.activeTab === 'send' }]"
              @click="switchRedpacketTab('send')"
              style="padding:8px 20px;border:none;font-size:0.9rem;font-weight:500;cursor:pointer;border-radius:9px;transition:all 0.2s var(--ease);"
              :style="redpacketModalState.activeTab === 'send' ? 'background:var(--accent);color:#ffffff;box-shadow:var(--shadow-sm);' : 'background:transparent;color:var(--text-secondary);'"
            >
              发红包
            </button>
            <button 
              :class="['rp-main-tab', { active: redpacketModalState.activeTab === 'record' }]"
              @click="switchRedpacketTab('record')"
              style="padding:8px 20px;border:none;font-size:0.9rem;font-weight:500;cursor:pointer;border-radius:9px;transition:all 0.2s var(--ease);"
              :style="redpacketModalState.activeTab === 'record' ? 'background:var(--accent);color:#ffffff;box-shadow:var(--shadow-sm);' : 'background:transparent;color:var(--text-secondary);'"
            >
              领取记录
            </button>
          </div>
        </div>
        
        <!-- 发红包Tab内容 -->
        <div v-show="redpacketModalState.activeTab === 'send'">
          <!-- 红包类型 -->
          <div class="form-group">
            <label class="form-label">红包类型</label>
            <select 
              class="modal-input" 
              v-model="redpacketModalState.sendForm.type"
              style="cursor:pointer;appearance:none;-webkit-appearance:none;background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;"
            >
              <option value="fixed">普通红包</option>
              <option value="random">随机红包</option>
              <option value="password">口令红包</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">总金额（萝卜）</label>
            <input 
              type="number" 
              class="modal-input" 
              v-model="redpacketModalState.sendForm.carrot"
              placeholder="1 - 60000" 
              min="1" 
              max="60000"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">红包个数</label>
            <input 
              type="number" 
              class="modal-input" 
              v-model="redpacketModalState.sendForm.number"
              placeholder="1 - 10000" 
              min="1" 
              max="10000"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">祝福语</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="redpacketModalState.sendForm.blessing"
              placeholder="最多 50 字" 
              maxlength="50"
            >
          </div>
          
          <!-- 口令内容（仅口令红包显示） -->
          <div v-show="redpacketModalState.sendForm.type === 'password'" class="form-group">
            <label class="form-label">口令内容</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="redpacketModalState.sendForm.text"
              placeholder="1-50字符，区分大小写" 
              maxlength="50"
            >
          </div>
          
          <!-- 红包封面（可选） -->
          <div style="margin-top:16px;">
            <label class="form-label">红包封面（可选）</label>
            
            <!-- Tab切换 -->
            <div style="display:flex;gap:20px;margin-bottom:12px;border-bottom:1px solid var(--border);">
              <button 
                :class="['rp-cover-tab', { active: redpacketModalState.coverTab === 'upload' }]"
                @click="switchCoverTab('upload')"
                style="padding:8px 0;border:none;background:none;font-size:0.9rem;font-weight:500;cursor:pointer;transition:all 0.2s;"
                :style="redpacketModalState.coverTab === 'upload' ? 'color:var(--accent);border-bottom:2px solid var(--accent);' : 'color:var(--text-secondary);border-bottom:2px solid transparent;'"
              >
                <i class="fas fa-folder-open"></i> 上传文件
              </button>
              <button 
                :class="['rp-cover-tab', { active: redpacketModalState.coverTab === 'url' }]"
                @click="switchCoverTab('url')"
                style="padding:8px 0;border:none;background:none;font-size:0.9rem;font-weight:500;cursor:pointer;transition:all 0.2s;"
                :style="redpacketModalState.coverTab === 'url' ? 'color:var(--accent);border-bottom:2px solid var(--accent);' : 'color:var(--text-secondary);border-bottom:2px solid transparent;'"
              >
                <i class="fas fa-link"></i> 使用外链
              </button>
            </div>
            
            <!-- 上传文件区域 -->
            <div 
              v-show="redpacketModalState.coverTab === 'upload'"
              class="rp-cover-upload-area"
              style="border:2px dashed var(--border);border-radius:12px;padding:3rem 2rem;text-align:center;cursor:pointer;transition:all 0.2s;background:var(--bg-surface);position:relative;min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;"
              @click="$refs.rpCoverFileInput.click()"
            >
              <!-- 预览容器 -->
              <div v-if="redpacketModalState.coverPreviewUrl" style="margin-bottom:12px;text-align:center;">
                <!-- 图片预览 -->
                <div v-if="redpacketModalState.coverFileType === 'image'" style="position:relative;display:inline-block;">
                  <img :src="redpacketModalState.coverPreviewUrl" 
                    alt="预览" 
                    style="display:block;max-width:300px;max-height:200px;border-radius:8px;object-fit:contain;"
                    loading="lazy"
                    @error="$event.target.style.display='none'">
                  <button 
                    @click.stop="deleteCoverPreview"
                    style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:color-mix(in srgb, var(--danger) 95%, transparent);color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.75rem;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.3);"
                    title="删除"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <!-- 音频预览 -->
                <div v-else-if="redpacketModalState.coverFileType === 'audio'" style="position:relative;display:inline-block;width:300px;">
                  <audio 
                    :src="redpacketModalState.coverPreviewUrl" 
                    controls 
                    style="width:100%;display:block;"
                  ></audio>
                  <button 
                    @click.stop="deleteCoverPreview"
                    style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:color-mix(in srgb, var(--danger) 95%, transparent);color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.75rem;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.3);"
                    title="删除"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              
              <!-- 上传占位符 -->
              <div v-if="!redpacketModalState.coverPreviewUrl" style="color:var(--text-tertiary);">
                <i class="fas fa-cloud-upload-alt" style="font-size:3rem;margin-bottom:12px;display:block;"></i>
                <div style="font-size:0.9rem;margin-bottom:4px;">点击上传</div>
                <div class="form-hint" style="margin-top:8px;">支持图片/音频，≤80MB，上传后自动填充外链</div>
              </div>
              
              <input 
                ref="rpCoverFileInput"
                type="file" 
                accept="image/*,audio/*" 
                style="display:none;"
                @change="handleCoverFileChange"
              >
            </div>
            
            <!-- 外链输入区域 -->
            <div v-show="redpacketModalState.coverTab === 'url'">
              <input 
                type="text" 
                class="modal-input" 
                v-model="redpacketModalState.coverUrl"
                placeholder="https:// 或 http:// 开头的图片/音频链接"
              >
              <div class="form-hint">直接输入图片或音频的 URL 地址</div>
            </div>
          </div>
        </div>
        
        <!-- 领取记录Tab内容 -->
        <div v-show="redpacketModalState.activeTab === 'record'">
          <div class="form-group">
            <label class="form-label">红包 ID</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="redpacketModalState.recordId"
              placeholder="请输入红包 ID"
            >
          </div>
          <button 
            class="modal-btn primary" 
            @click="queryRedpacketRecords"
            style="width:100%;margin-bottom:20px;"
          >
            查询记录
          </button>
          
          <!-- 领取记录列表（默认隐藏，查询后显示） -->
          <div v-if="redpacketModalState.recordList.length > 0 || redpacketModalState.recordLoading">
            <div 
              style="max-height:400px;overflow-y:auto;padding:8px 0;"
              @scroll="handleRedpacketRecordScroll"
            >
              <div style="display:flex;flex-direction:column;gap:8px;padding:0 4px;">
                <!-- 加载中骨架屏 -->
                <div v-if="redpacketModalState.recordList.length === 0 && redpacketModalState.recordLoading">
                  <div v-for="i in 5" :key="i" style="display:flex;align-items:center;padding:14px 16px;background:var(--bg-surface);border-radius:12px;">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--bg-input);margin-right:12px;"></div>
                    <div style="flex:1;">
                      <div style="height:14px;background:var(--bg-input);border-radius:4px;margin-bottom:8px;width:60%;"></div>
                      <div style="height:12px;background:var(--bg-input);border-radius:4px;width:40%;"></div>
                    </div>
                    <div style="text-align:right;">
                      <div style="height:18px;background:var(--bg-input);border-radius:4px;margin-bottom:4px;width:60px;"></div>
                      <div style="height:12px;background:var(--bg-input);border-radius:4px;width:40px;"></div>
                    </div>
                  </div>
                </div>
                
                <!-- 记录列表 -->
                <div 
                  v-for="record in redpacketModalState.recordList" 
                  :key="record.user_id"
                  style="display:flex;align-items:center;padding:14px 16px;background:var(--bg-surface);border-radius:12px;transition:all 0.2s var(--ease);border:1px solid transparent;"
                  @mouseenter="$event.currentTarget.style.background='var(--bg-surface-hover)';$event.currentTarget.style.borderColor='var(--border)';$event.currentTarget.style.transform='scale(1.01)'"
                  @mouseleave="$event.currentTarget.style.background='var(--bg-surface)';$event.currentTarget.style.borderColor='transparent';$event.currentTarget.style.transform='scale(1)'"
                >
                  <div style="flex:1;min-width:0;display:flex;align-items:center;gap:12px;">
                    <!-- 头像 -->
                    <img v-if="record.avatar" 
                      :src="record.avatar" 
                      :alt="record.username || record.user_id"
                      style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border);flex-shrink:0;"
                      loading="lazy"
                    />
                    <div 
                      v-else
                      style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #aa8cff));display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:600;font-size:0.9rem;flex-shrink:0;"
                    >
                      {{ (record.username || record.user_id || '?').charAt(0).toUpperCase() }}
                    </div>
                    
                    <div style="flex:1;min-width:0;">
                      <div style="color:var(--text-primary);font-weight:500;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        {{ record.username || record.user_id || '未知用户' }}
                      </div>
                      <div style="color:var(--text-tertiary);font-size:0.75rem;margin-top:2px;">
                        ID: {{ record.user_id || '-' }}
                      </div>
                    </div>
                  </div>
                  
                  <div style="text-align:right;margin-left:12px;flex-shrink:0;">
                    <div style="color:var(--success);font-weight:600;font-size:1.1rem;margin-bottom:2px;">
                      +{{ record.carrot || 0 }}
                    </div>
                    <div style="color:var(--text-tertiary);font-size:0.75rem;">
                      {{ formatRelativeTime(record.receive_at) }}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 加载更多提示 -->
              <div v-if="redpacketModalState.recordLoading && redpacketModalState.recordList.length > 0" class="loading-state" style="padding: 1.5rem;">
                <i class="fas fa-circle-notch"></i>
                <p>加载中...</p>
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="redpacketModalState.recordId" style="padding:40px 20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
            暂无领取记录
          </div>
        </div>
      </div>
      
      <!-- 底部按钮（仅在发红包Tab显示） -->
      <div v-if="redpacketModalState.activeTab === 'send'" class="modal-footer">
        <button class="modal-btn secondary" @click="closeModal('redpacket')">取消</button>
        <button 
          class="modal-btn primary" 
          @click="submitRedpacket"
          :disabled="redpacketModalState.uploading"
          :style="redpacketModalState.uploading ? 'opacity:0.6;cursor:not-allowed;' : ''"
        >
          <span v-if="!redpacketModalState.uploading">发红包</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 抽奖工具弹窗 -->
  <div
    v-show="modals.lottery"
    :class="['modal-overlay', { show: modals.lottery }]" 
    @click.self="closeModal('lottery')"
  >
    <div class="modal-content xxl">
      <div class="modal-header">
        <span class="modal-title">抽奖工具</span>
        <button class="modal-close" @click="closeModal('lottery')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:20px;">
        <!-- 主Tab切换（苹果胶囊样式） -->
        <div style="display:flex;margin-bottom:20px;">
          <div style="display:inline-flex;background:var(--bg-input);border-radius:12px;padding:3px;gap:2px;">
            <button 
              :class="['lottery-main-tab', { active: lotteryModalState.activeTab === 'create' }]"
              @click="switchLotteryTab('create')"
              style="padding:8px 20px;border:none;font-size:0.9rem;font-weight:500;cursor:pointer;border-radius:9px;transition:all 0.2s var(--ease);"
              :style="lotteryModalState.activeTab === 'create' ? 'background:var(--accent);color:#ffffff;box-shadow:var(--shadow-sm);' : 'background:transparent;color:var(--text-secondary);'"
            >
              创建抽奖
            </button>
            <button 
              :class="['lottery-main-tab', { active: lotteryModalState.activeTab === 'winners' }]"
              @click="switchLotteryTab('winners')"
              style="padding:8px 20px;border:none;font-size:0.9rem;font-weight:500;cursor:pointer;border-radius:9px;transition:all 0.2s var(--ease);"
              :style="lotteryModalState.activeTab === 'winners' ? 'background:var(--accent);color:#ffffff;box-shadow:var(--shadow-sm);' : 'background:transparent;color:var(--text-secondary);'"
            >
              中奖列表
            </button>
          </div>
        </div>
        
        <!-- 创建抽奖Tab内容 -->
        <div v-show="lotteryModalState.activeTab === 'create'">
          <!-- 基本信息 -->
          <div class="form-group">
            <label class="form-label">抽奖名称</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="lotteryModalState.createForm.name"
              maxlength="50" 
              placeholder="请输入抽奖名称（50字以内）"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">抽奖简介（可选）</label>
            <textarea 
              class="modal-input modal-textarea" 
              v-model="lotteryModalState.createForm.description"
              maxlength="200" 
              rows="2" 
              placeholder="请输入抽奖简介（200字以内）"
            ></textarea>
          </div>
          
          <!-- 时间设置 - 两列布局 -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="form-group">
            <div>
              <label class="form-label">开始时间</label>
              <input 
                type="datetime-local" 
                class="modal-input" 
                v-model="lotteryModalState.createForm.time_start"
              >
            </div>
            <div>
              <label class="form-label">结束时间</label>
              <input 
                type="datetime-local" 
                class="modal-input" 
                v-model="lotteryModalState.createForm.time_end"
              >
            </div>
          </div>
          
          <!-- 参与条件 - 两列布局 -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="form-group">
            <div>
              <label class="form-label">参与消耗萝卜</label>
              <input 
                type="number" 
                class="modal-input" 
                v-model="lotteryModalState.createForm.amount"
                min="1" 
                max="50000" 
                placeholder="1-50000"
              >
              <div class="form-hint" style="margin-top:4px;">每次参与消耗的萝卜数</div>
            </div>
            <div>
              <label class="form-label">开奖人数</label>
              <input 
                type="number" 
                class="modal-input" 
                v-model="lotteryModalState.createForm.number"
                min="0" 
                max="5000" 
                placeholder="0=时间开奖"
              >
              <div class="form-hint" style="margin-top:4px;">0为时间开奖，其他为人数开奖</div>
            </div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="form-group">
            <div>
              <label class="form-label">最低萝卜数要求</label>
              <input 
                type="number" 
                class="modal-input" 
                v-model="lotteryModalState.createForm.rule_carrot"
                min="0" 
                max="50000" 
                placeholder="0=无限制"
              >
              <div class="form-hint" style="margin-top:4px;">参与者的最低萝卜数</div>
            </div>
            <div>
              <label class="form-label">最低签到天数</label>
              <input 
                type="number" 
                class="modal-input" 
                v-model="lotteryModalState.createForm.rule_sign"
                min="0" 
                max="5000" 
                placeholder="0=无限制"
              >
              <div class="form-hint" style="margin-top:4px;">参与者的最低签到天数</div>
            </div>
          </div>
          
          <!-- 奖品列表 -->
          <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <label style="font-size:1rem;font-weight:600;color:var(--text-primary);">奖品配置</label>
              <button 
                type="button" 
                @click="addPrize"
                style="padding:10px 18px;border-radius:14px;font-size:0.9rem;font-weight:600;cursor:pointer;transition:all 0.2s var(--spring);border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);"
              >
                + 新增奖品
              </button>
            </div>
            
            <!-- 奖品项列表 -->
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div 
                v-for="(prize, index) in lotteryModalState.prizes" 
                :key="index"
                style="padding:16px;background:var(--bg-surface);border-radius:12px;border:1px solid var(--border);position:relative;"
              >
                <!-- 删除按钮 -->
                <button 
                  @click="removePrize(index)"
                  style="position:absolute;top:12px;right:12px;width:28px;height:28px;border:none;border-radius:50%;background:var(--danger);color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s var(--ease);z-index:10;"
                  title="删除奖品"
                >
                  ×
                </button>
                
                <!-- 奖品标题 -->
                <div style="margin-bottom:16px;padding-right:36px;">
                  <span style="font-size:1rem;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">奖品 {{ index + 1 }}</span>
                </div>
                
                <!-- 名称和数量 - 两列布局 -->
                <div style="display:grid;grid-template-columns:1fr auto;gap:16px;margin-bottom:16px;">
                  <div>
                    <label style="font-size:0.85rem;font-weight:500;color:var(--text-secondary);margin-bottom:6px;display:block;">奖品名称</label>
                    <input 
                      type="text" 
                      class="modal-input" 
                      v-model="prize.name"
                      placeholder="例如 VIP 月卡" 
                      maxlength="50"
                      style="margin-bottom:0;font-size:0.9rem;"
                    >
                  </div>
                  <div style="min-width:120px;">
                    <label style="font-size:0.85rem;font-weight:500;color:var(--text-secondary);margin-bottom:6px;display:block;">奖品数量</label>
                    <input 
                      type="number" 
                      class="modal-input" 
                      v-model="prize.count"
                      min="1"
                      max="100"
                      style="margin-bottom:0;font-size:0.9rem;"
                    >
                  </div>
                </div>
                
                <!-- 奖品简介 -->
                <div style="margin-bottom:16px;">
                  <label style="font-size:0.85rem;font-weight:500;color:var(--text-secondary);margin-bottom:6px;display:block;">奖品简介</label>
                  <input 
                    type="text" 
                    class="modal-input" 
                    v-model="prize.description"
                    placeholder="可选，补充奖品说明" 
                    maxlength="200"
                    style="margin-bottom:0;font-size:0.9rem;"
                  >
                </div>
                
                <!-- 奖品内容 -->
                <div>
                  <label class="form-label">奖品内容</label>
                  <textarea 
                    class="modal-input modal-textarea" 
                    v-model="prize.bodys"
                    placeholder="每行一条自动发奖内容，例如兑换码、卡密或外链" 
                    rows="3"
                  ></textarea>
                  <div class="form-hint">自动发奖内容存在时，条目数需与奖品数量一致。</div>
                </div>
              </div>
              
              <!-- 空状态提示 -->
              <div v-if="lotteryModalState.prizes.length === 0" style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
                点击“+ 新增奖品”添加奖品
              </div>
            </div>
          </div>
        </div>
        
        <!-- 中奖列表Tab内容 -->
        <div v-show="lotteryModalState.activeTab === 'winners'">
          <div style="margin-bottom:16px;">
            <label class="form-label">抽奖 ID</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="lotteryModalState.winnerQueryId"
              placeholder="请输入抽奖 ID" 
              maxlength="20"
            >
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <button 
              class="modal-btn primary" 
              @click="queryLotteryWinners"
              style="width:100%;"
            >
              查询中奖列表
            </button>
            <button 
              type="button" 
              @click="cancelLottery"
              style="width:100%;padding:10px 18px;border-radius:14px;font-size:0.9rem;font-weight:600;cursor:pointer;transition:all 0.2s var(--spring);border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);"
            >
              取消抽奖
            </button>
          </div>
          
          <!-- 中奖列表 -->
          <div v-if="lotteryModalState.winnerList.length > 0 || lotteryModalState.winnerLoading">
            <div 
              style="max-height:400px;overflow-y:auto;padding:8px 0;"
              @scroll="handleLotteryWinnerScroll"
            >
              <div style="display:flex;flex-direction:column;gap:8px;padding:0 4px;">
                <!-- 加载中骨架屏 -->
                <div v-if="lotteryModalState.winnerList.length === 0 && lotteryModalState.winnerLoading">
                  <div v-for="i in 5" :key="i" style="display:flex;align-items:center;padding:14px 16px;background:var(--bg-surface);border-radius:12px;">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--bg-input);margin-right:12px;"></div>
                    <div style="flex:1;">
                      <div style="height:14px;background:var(--bg-input);border-radius:4px;margin-bottom:8px;width:60%;"></div>
                      <div style="height:12px;background:var(--bg-input);border-radius:4px;width:40%;"></div>
                    </div>
                    <div style="text-align:right;">
                      <div style="height:14px;background:var(--bg-input);border-radius:4px;margin-bottom:4px;width:80px;"></div>
                      <div style="height:12px;background:var(--bg-input);border-radius:4px;width:60px;"></div>
                    </div>
                  </div>
                </div>
                
                <!-- 中奖记录列表 -->
                <div 
                  v-for="winner in lotteryModalState.winnerList" 
                  :key="winner.user_id + '_' + winner.prize_name"
                  style="display:flex;align-items:center;padding:14px 16px;background:var(--bg-surface);border-radius:12px;transition:all 0.2s var(--ease);border:1px solid transparent;"
                  @mouseenter="$event.currentTarget.style.background='var(--bg-surface-hover)';$event.currentTarget.style.borderColor='var(--border)';$event.currentTarget.style.transform='scale(1.01)'"
                  @mouseleave="$event.currentTarget.style.background='var(--bg-surface)';$event.currentTarget.style.borderColor='transparent';$event.currentTarget.style.transform='scale(1)'"
                >
                  <div style="flex:1;min-width:0;display:flex;align-items:center;gap:12px;">
                    <!-- 头像 -->
                    <img v-if="winner.avatar" 
                      :src="winner.avatar" 
                      :alt="winner.username || winner.user_id"
                      style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border);flex-shrink:0;"
                      loading="lazy"
                    />
                    <div 
                      v-else
                      style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #aa8cff));display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:600;font-size:0.9rem;flex-shrink:0;"
                    >
                      {{ (winner.username || winner.user_id || '?').charAt(0).toUpperCase() }}
                    </div>
                    
                    <div style="flex:1;min-width:0;">
                      <div style="color:var(--text-primary);font-weight:500;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        {{ winner.username || winner.user_id || '未知用户' }}
                      </div>
                      <div style="color:var(--text-tertiary);font-size:0.75rem;margin-top:2px;">
                        ID: {{ winner.user_id || '-' }}
                      </div>
                    </div>
                  </div>
                  
                  <div style="text-align:right;margin-left:12px;flex-shrink:0;">
                    <div style="color:var(--warning);font-weight:600;font-size:0.95rem;margin-bottom:2px;">
                      {{ winner.prize_name || '-' }}
                    </div>
                    <div style="color:var(--text-tertiary);font-size:0.75rem;">
                      {{ formatRelativeTime(winner.win_at) }}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 加载更多提示 -->
              <div v-if="lotteryModalState.winnerLoading && lotteryModalState.winnerList.length > 0" class="loading-state" style="padding: 1.5rem;">
                <i class="fas fa-circle-notch"></i>
                <p>加载中...</p>
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="lotteryModalState.winnerQueryId" style="padding:40px 20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
            暂无中奖记录
          </div>
        </div>
      </div>
      
      <!-- 底部按钮（仅在创建抽奖Tab显示） -->
      <div v-if="lotteryModalState.activeTab === 'create'" class="modal-footer">
        <button class="modal-btn secondary" @click="closeModal('lottery')">取消</button>
        <button 
          class="modal-btn primary" 
          @click="submitLottery"
          :disabled="lotteryModalState.isSubmitting"
        >
          <span v-if="!lotteryModalState.isSubmitting">创建抽奖</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 投票工具弹窗 -->
  <div
    v-show="modals.vote"
    :class="['modal-overlay', { show: modals.vote }]" 
    @click.self="closeModal('vote')"
  >
    <div class="modal-content xl">
      <div class="modal-header">
        <span class="modal-title">创建投票</span>
        <button class="modal-close" @click="closeModal('vote')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:20px;">
        <!-- 投票问题 -->
        <div style="margin-bottom:16px;">
          <label class="form-label">投票问题</label>
          <input 
            type="text" 
            class="modal-input" 
            v-model="voteModalState.question"
            maxlength="100" 
            placeholder="请输入投票问题（100字以内）"
          >
        </div>
        
        <!-- 过期时间 -->
        <div style="margin-bottom:20px;">
          <label class="form-label">过期时间（秒）</label>
          <input 
            type="number" 
            class="modal-input" 
            v-model="voteModalState.seconds"
            min="60" 
            placeholder="最低 60 秒"
          >
          <div style="font-size:0.8rem;color:var(--text-tertiary);margin-top:6px;">最低 60 秒</div>
        </div>
        
        <!-- 选项列表 -->
        <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <label style="font-size:1rem;font-weight:600;color:var(--text-primary);">投票选项</label>
            <button 
              type="button" 
              @click="addVoteOption"
              style="padding:10px 18px;border-radius:14px;font-size:0.9rem;font-weight:600;cursor:pointer;transition:all 0.2s var(--spring);border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);"
            >
              + 新增选项
            </button>
          </div>
          
          <div style="display:flex;flex-direction:column;gap:12px;max-height:400px;overflow-y:auto;padding:4px;">
            <!-- 选项列表 -->
            <div 
              v-for="(option, index) in voteModalState.options" 
              :key="index"
              style="display:flex;gap:12px;align-items:center;"
            >
              <div style="flex:1;">
                <input 
                  type="text" 
                  class="modal-input" 
                  v-model="voteModalState.options[index]"
                  :placeholder="`选项 ${index + 1}`" 
                  maxlength="50"
                  style="margin-bottom:0;"
                >
              </div>
              <button 
                v-if="index >= 2"
                @click="removeVoteOption(index)"
                style="width:32px;height:32px;min-width:32px;border-radius:50%;background:var(--bg-input);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-secondary);transition:all 0.2s;font-size:1rem;padding:0;line-height:1;flex-shrink:0;"
              >
                ×
              </button>
            </div>
            
            <!-- 空状态提示 -->
            <div v-if="voteModalState.options.length === 0" style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
              点击“+ 新增选项”添加选项
            </div>
          </div>
          
          <div style="font-size:0.8rem;color:var(--text-tertiary);margin-top:12px;line-height:1.4;">至少需要 2 个选项，最多 12 个选项。</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn secondary" @click="closeModal('vote')">取消</button>
        <button 
          class="modal-btn primary" 
          @click="submitVote"
          :disabled="voteModalState.isSubmitting"
        >
          <span v-if="!voteModalState.isSubmitting">创建投票</span>
          <i v-else class="fas fa-circle-notch fa-spin"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- 萝卜记录弹窗 -->
  <div
    v-show="modals.carrot"
    :class="['modal-overlay', { show: modals.carrot }]" 
    @click.self="closeModal('carrot')"
  >
    <div class="modal-content xxl">
      <div class="modal-header">
        <h3>萝卜中心</h3>
        <button class="modal-close" @click="closeModal('carrot')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:20px;">
        <!-- Tab切换（苹果胶囊样式） -->
        <div style="display:flex;margin-bottom:20px;">
          <div style="display:inline-flex;background:var(--bg-input);border-radius:12px;padding:3px;gap:2px;">
            <button 
              :class="['carrot-main-tab', { active: carrotModalState.activeTab === 'history' }]"
              @click="switchCarrotTab('history')"
              style="padding:8px 20px;border:none;font-size:0.9rem;font-weight:500;cursor:pointer;border-radius:9px;transition:all 0.2s var(--ease);"
              :style="carrotModalState.activeTab === 'history' ? 'background:var(--accent);color:#ffffff;box-shadow:var(--shadow-sm);' : 'background:transparent;color:var(--text-secondary);'"
            >变化记录</button>
            <button 
              :class="['carrot-main-tab', { active: carrotModalState.activeTab === 'rank' }]"
              @click="switchCarrotTab('rank')"
              style="padding:8px 20px;border:none;font-size:0.9rem;font-weight:500;cursor:pointer;border-radius:9px;transition:all 0.2s var(--ease);"
              :style="carrotModalState.activeTab === 'rank' ? 'background:var(--accent);color:#ffffff;box-shadow:var(--shadow-sm);' : 'background:transparent;color:var(--text-secondary);'"
            >排行榜</button>
          </div>
        </div>
        
        <!-- 变化记录Tab内容 -->
        <div v-show="carrotModalState.activeTab === 'history'" id="carrotHistoryTab">
          <div 
            id="carrotHistoryScrollContainer" 
            style="max-height:450px;overflow-y:auto;padding:8px 0;"
            @scroll="handleCarrotHistoryScroll"
          >
            <div id="carrotHistoryListContainer" style="display:flex;flex-direction:column;gap:8px;padding:0 4px;">
              <!-- 加载中骨架屏 -->
              <div v-if="carrotModalState.historyList.length === 0 && carrotModalState.historyLoading">
                <div v-for="i in 5" :key="i" style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;border-bottom:0.5px solid var(--border);">
                  <div style="width:40px;height:40px;border-radius:10px;background:var(--bg-input);flex-shrink:0;margin-right:14px;"></div>
                  <div style="flex:1;min-width:0;">
                    <div style="height:16px;background:var(--bg-input);border-radius:4px;margin-bottom:8px;width:60%;"></div>
                    <div style="height:12px;background:var(--bg-input);border-radius:4px;width:40%;"></div>
                  </div>
                  <div style="width:60px;height:20px;background:var(--bg-input);border-radius:4px;margin-left:16px;flex-shrink:0;"></div>
                </div>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="carrotModalState.historyList.length === 0 && !carrotModalState.historyLoading" style="padding:40px 20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
                暂无变化记录
              </div>
              
              <!-- 历史记录列表 -->
              <div 
                v-for="(item, index) in carrotModalState.historyList" 
                :key="item.id || index"
                style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;"
                :style="index < carrotModalState.historyList.length - 1 ? 'border-bottom:0.5px solid var(--border);' : ''"
              >
                <!-- 左侧图标 -->
                <div style="width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:14px;"
                  :style="item.type === 'earn' ? 'background:rgba(48, 209, 88, 0.12);' : 'background:rgba(255, 69, 58, 0.12);'"
                >
                  <i 
                    :class="item.type === 'earn' ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"
                    :style="item.type === 'earn' ? 'color:var(--success);font-size:1rem;' : 'color:var(--danger);font-size:1rem;'"
                  ></i>
                </div>
                
                <!-- 中间内容 -->
                <div style="flex:1;min-width:0;">
                  <!-- 标题 -->
                  <div style="color:var(--text-primary);font-weight:400;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;">
                    {{ item.trigger_type_string || '未知类型' }}
                  </div>
                  
                  <!-- 副标题：时间 + 过期时间 -->
                  <div style="color:var(--text-tertiary);font-size:0.8rem;">
                    {{ formatDateTime(item.created_at) }}{{ item.expired_at ? ' · 到期:' + formatDate(item.expired_at) : '' }}
                  </div>
                </div>
                
                <!-- 右侧数值 -->
                <div style="margin-left:16px;font-weight:500;font-size:1rem;flex-shrink:0;text-align:right;min-width:60px;"
                  :style="item.type === 'earn' ? 'color:var(--success);' : 'color:var(--danger);'"
                >
                  {{ item.type === 'earn' ? '+' : '-' }}{{ item.point }}
                </div>
              </div>
              
              <!-- 加载更多提示 -->
              <div v-if="carrotModalState.historyLoading && carrotModalState.historyList.length > 0" class="loading-state" style="padding: 1.5rem;">
                <i class="fas fa-circle-notch"></i>
                <p>加载中...</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 排行榜Tab内容 -->
        <div v-show="carrotModalState.activeTab === 'rank'" id="carrotRankTab">
          <div id="carrotRankListContainer" style="display:flex;flex-direction:column;gap:8px;padding:8px 4px;max-height:450px;overflow-y:auto;">
            <!-- 加载中骨架屏 -->
            <div v-if="carrotModalState.rankLoading">
              <div v-for="i in 5" :key="i" style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;border-bottom:0.5px solid var(--border);">
                <div style="width:24px;height:20px;background:var(--bg-input);border-radius:4px;flex-shrink:0;margin-right:10px;"></div>
                <div style="width:40px;height:40px;border-radius:50%;background:var(--bg-input);flex-shrink:0;margin-right:12px;"></div>
                <div style="flex:1;min-width:0;">
                  <div style="height:16px;background:var(--bg-input);border-radius:4px;margin-bottom:8px;width:50%;"></div>
                  <div style="height:12px;background:var(--bg-input);border-radius:4px;width:30%;"></div>
                </div>
                <div style="width:60px;height:20px;background:var(--bg-input);border-radius:4px;margin-left:16px;flex-shrink:0;"></div>
              </div>
            </div>
            
            <!-- 空状态 -->
            <div v-else-if="carrotModalState.rankList.length === 0" style="padding:40px 20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
              暂无排行数据
            </div>
            
            <!-- 排行榜列表 -->
            <div 
              v-else
              v-for="(user, index) in carrotModalState.rankList" 
              :key="user.id || index"
              style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;"
              :style="index < carrotModalState.rankList.length - 1 ? 'border-bottom:0.5px solid var(--border);' : ''"
            >
              <!-- 左侧：排名 -->
              <div style="width:24px;color:var(--text-secondary);font-weight:500;font-size:0.95rem;text-align:left;flex-shrink:0;margin-right:10px;">
                {{ index + 1 }}
              </div>
              
              <!-- 头像 -->
              <img v-if="user.avatar" :src="user.avatar" :alt="user.username" 
                style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-right:12px;" 
                loading="lazy" />
              <div v-else style="width:40px;height:40px;border-radius:50%;background:rgba(120, 120, 128, 0.16);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-weight:600;font-size:1rem;flex-shrink:0;margin-right:12px;">
                {{ (user.username || '?').charAt(0).toUpperCase() }}
              </div>
              
              <!-- 中间：用户信息 -->
              <div style="flex:1;min-width:0;">
                <div style="color:var(--text-primary);font-weight:400;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;">
                  {{ user.username || '未知用户' }}
                </div>
                <div style="color:var(--text-tertiary);font-size:0.85rem;">
                  {{ user.level_name || '-' }}
                </div>
              </div>
              
              <!-- 右侧：萝卜数量 -->
              <div style="margin-left:16px;color:var(--text-secondary);font-weight:500;font-size:1rem;flex-shrink:0;text-align:right;min-width:60px;">
                {{ user.carrot?.toLocaleString() || '0' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 上传排行榜弹窗 -->
  <div
    v-show="modals.upload"
    :class="['modal-overlay', { show: modals.upload }]" 
    @click.self="closeModal('upload')"
  >
    <div class="modal-content xxl">
      <div class="modal-header">
        <h3>上传排行榜</h3>
        <button class="modal-close" @click="closeModal('upload')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:20px;">
        <div id="uploadRankListContainer" style="display:flex;flex-direction:column;gap:8px;padding:8px 4px;max-height:500px;overflow-y:auto;">
          <!-- 加载中骨架屏 -->
          <div v-if="uploadRankState.loading">
            <div v-for="i in 5" :key="i" style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;border-bottom:0.5px solid var(--border);">
              <div style="width:24px;height:20px;background:var(--bg-input);border-radius:4px;flex-shrink:0;margin-right:10px;"></div>
              <div style="width:40px;height:40px;border-radius:50%;background:var(--bg-input);flex-shrink:0;margin-right:12px;"></div>
              <div style="flex:1;min-width:0;">
                <div style="height:16px;background:var(--bg-input);border-radius:4px;width:50%;"></div>
              </div>
              <div style="width:80px;height:20px;background:var(--bg-input);border-radius:4px;margin-left:16px;flex-shrink:0;"></div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="uploadRankState.rankList.length === 0" style="padding:40px 20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
            暂无排行数据
          </div>
          
          <!-- 排行榜列表 -->
          <div 
            v-else
            v-for="(user, index) in uploadRankState.rankList" 
            :key="user.id || index"
            style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;"
            :style="index < uploadRankState.rankList.length - 1 ? 'border-bottom:0.5px solid var(--border);' : ''"
          >
            <!-- 左侧：排名 -->
            <div style="width:24px;font-weight:600;font-size:0.95rem;text-align:left;flex-shrink:0;margin-right:10px;"
              :style="index === 0 ? 'color:#ffd700;' : index === 1 ? 'color:#c0c0c0;' : index === 2 ? 'color:#cd7f32;' : 'color:var(--text-tertiary);'"
            >
              {{ index + 1 }}
            </div>
            
            <!-- 头像 -->
            <img v-if="user.avatar" :src="user.avatar" :alt="user.username" 
              style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-right:12px;"
              loading="lazy" />
            <div v-else style="width:40px;height:40px;border-radius:50%;background:rgba(120, 120, 128, 0.16);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-weight:600;font-size:1rem;flex-shrink:0;margin-right:12px;">
              {{ (user.username || '?').charAt(0).toUpperCase() }}
            </div>
            
            <!-- 中间：用户信息 -->
            <div style="flex:1;min-width:0;">
              <div style="color:var(--text-primary);font-weight:400;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                {{ user.username || '未知用户' }}
              </div>
            </div>
            
            <!-- 右侧：上传大小 -->
            <div style="margin-left:16px;color:var(--text-secondary);font-weight:500;font-size:1rem;flex-shrink:0;text-align:right;min-width:80px;">
              {{ formatFileSize(user.size || 0) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 签到排行榜弹窗 -->
  <div
    v-show="modals.signRank"
    :class="['modal-overlay', { show: modals.signRank }]" 
    @click.self="closeModal('signRank')"
  >
    <div class="modal-content xxl">
      <div class="modal-header">
        <h3>签到排行榜</h3>
        <button class="modal-close" @click="closeModal('signRank')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:20px;">
        <div id="signRankListContainer" style="display:flex;flex-direction:column;gap:8px;padding:8px 4px;max-height:500px;overflow-y:auto;">
          <!-- 加载中骨架屏 -->
          <div v-if="signRankState.loading">
            <div v-for="i in 5" :key="i" style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;border-bottom:0.5px solid var(--border);">
              <div style="width:24px;height:20px;background:var(--bg-input);border-radius:4px;margin-right:10px;"></div>
              <div style="width:40px;height:40px;background:var(--bg-input);border-radius:50%;margin-right:12px;"></div>
              <div style="flex:1;">
                <div style="height:16px;background:var(--bg-input);border-radius:4px;width:60%;margin-bottom:4px;"></div>
                <div style="height:12px;background:var(--bg-input);border-radius:4px;width:40%;"></div>
              </div>
              <div style="margin-left:16px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:80px;">
                <div style="height:16px;background:var(--bg-input);border-radius:4px;width:60px;"></div>
                <div style="height:14px;background:var(--bg-input);border-radius:4px;width:40px;"></div>
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="signRankState.rankList.length === 0" style="padding:40px 20px;text-align:center;color:var(--text-tertiary);font-size:0.9rem;">
            暂无排行数据
          </div>
          
          <!-- 排行榜列表 -->
          <div 
            v-else
            v-for="(user, index) in signRankState.rankList" 
            :key="user.id || index"
            style="display:flex;align-items:center;padding:14px 20px;background:transparent;min-height:64px;"
            :style="index < signRankState.rankList.length - 1 ? 'border-bottom:0.5px solid var(--border);' : ''"
          >
            <!-- 左侧：排名 -->
            <div style="width:24px;font-weight:600;font-size:0.95rem;text-align:left;flex-shrink:0;margin-right:10px;"
              :style="index === 0 ? 'color:#ffd700;' : index === 1 ? 'color:#c0c0c0;' : index === 2 ? 'color:#cd7f32;' : 'color:var(--text-tertiary);'"
            >
              {{ index + 1 }}
            </div>
            
            <!-- 头像 -->
            <img v-if="user.avatar" :src="user.avatar" :alt="user.username" 
              style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-right:12px;"
              loading="lazy" />
            <div v-else style="width:40px;height:40px;border-radius:50%;background:rgba(120, 120, 128, 0.16);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-weight:600;font-size:1rem;flex-shrink:0;margin-right:12px;">
              {{ (user.username || '?').charAt(0).toUpperCase() }}
            </div>
            
            <!-- 中间：用户信息 -->
            <div style="flex:1;min-width:0;">
              <div style="color:var(--text-primary);font-weight:400;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                {{ user.username || '未知用户' }}
              </div>
              <div v-if="user.sign_content" style="color:var(--text-tertiary);font-size:0.8rem;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                "{{ user.sign_content }}"
              </div>
            </div>
            
            <!-- 右侧：获得萝卜数和连续天数 -->
            <div style="margin-left:16px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;min-width:80px;">
              <div style="font-weight:600;font-size:0.95rem;"
                :style="user.earn_point >= 0 ? 'color:var(--accent);' : 'color:#ff3b30;'"
              >
                {{ user.earn_point >= 0 ? '+' : '' }}{{ user.earn_point || 0 }}🥕
              </div>
              <div style="color:var(--text-secondary);font-weight:500;font-size:0.85rem;">
                {{ user.continuous_days || 0 }}天
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 请求记录弹窗 -->
  <div
    v-show="modals.viewing"
    :class="['modal-overlay', { show: modals.viewing }]" 
    @click.self="closeModal('viewing')"
  >
    <div class="modal-content lg">
      <div class="modal-header">
        <h3>请求记录</h3>
        <button class="modal-close" @click="closeModal('viewing')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <!-- 加载状态 -->
        <div v-if="viewingModalState.loading" class="skeleton-list">
          <div 
            v-for="i in 5" 
            :key="i" 
            class="setting-item skeleton-list-item"
            :style="i < 5 ? '' : 'border-bottom: none;'"
          >
            <!-- 左侧信息占位 -->
            <div class="setting-info" style="flex: 1;">
              <!-- 标题行 -->
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 8px;">
                <div class="skeleton-text" style="width: 50%; height: 16px;"></div>
              </div>
              
              <!-- 元数据行 -->
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <div class="skeleton-text-sm" style="width: 110px; height: 12px;"></div>
                <div class="skeleton-text-sm" style="width: 100px; height: 12px;"></div>
                <div class="skeleton-text-sm" style="width: 90px; height: 12px;"></div>
                <div class="skeleton-text-sm" style="width: 50px; height: 12px;"></div>
              </div>
            </div>
            
            <!-- 右侧Range占位 -->
            <div class="setting-value">
              <div class="skeleton-text-sm" style="width: 130px; height: 12px;"></div>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-else-if="!viewingModalState.loading && viewingModalState.list.length === 0" style="text-align:center;color:var(--text-secondary);padding:40px 0;">
          <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.3;"></i>
          <p>暂无请求记录</p>
        </div>
        
        <!-- 列表 -->
        <div v-else>
          <div 
            v-for="(item, index) in viewingModalState.list" 
            :key="index"
            class="setting-item"
          >
            <div class="setting-info">
              <div class="setting-label" style="display: flex; align-items: center; gap: 0.5rem;">
                {{ item.video_title }}
                <span 
                  v-if="getWarningLevel(item.video_title)"
                  class="order-status"
                  :class="{
                    'warning': getWarningLevel(item.video_title) === 'high',
                    'caution': getWarningLevel(item.video_title) === 'medium',
                    'info': getWarningLevel(item.video_title) === 'low'
                  }"
                  :title="getWarningReason(item.video_title)"
                >
                  <i :class="`fas ${getWarningIcon(item.video_title)}`"></i>
                  {{ getWarningLevel(item.video_title) === 'high' ? '异常' : getWarningLevel(item.video_title) === 'medium' ? '注意' : '提示' }}
                </span>
              </div>
              <div class="setting-desc">
                <span class="meta-item">
                  <i class="fas fa-clock"></i> {{ item.time }}
                </span>
                <span class="meta-item">
                  <i class="fas fa-globe"></i> {{ item.ip }}
                </span>
                <span class="meta-item">
                  <i class="fas fa-desktop"></i> {{ item.ua }}
                </span>
                <span v-if="item.is_proxy" class="meta-item" style="color: var(--primary-color);">
                  <i class="fas fa-server"></i> 代理
                </span>
              </div>
            </div>
            <div class="setting-value">
              <span v-if="item.range" class="meta-item" style="font-family: monospace; font-size: 0.75rem; color: var(--text-tertiary);">
                Range: {{ item.range }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn primary" @click="closeModal('viewing')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式在全局CSS中定义 */
</style>
