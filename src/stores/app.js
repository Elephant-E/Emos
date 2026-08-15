import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '@/utils/storage.js'
import { userApi } from '@/api/userApi.js'

export const useAppStore = defineStore('app', () => {
  // ================= 状态 =================
  const token = ref(localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN) || null)
  const userInfo = ref(null)
  const theme = ref(localStorage.getItem(STORAGE_KEYS.THEME) || 'auto')
  const currentView = ref('/')
  const accounts = ref([])
  const isMaintenance = ref(false)

  // ================= 计算属性 =================
  const isAuthenticated = computed(() => !!token.value)
  
  const username = computed(() => {
    return userInfo.value?.username || userInfo.value?.pseudonym || 'Explorer'
  })
  
  const avatar = computed(() => {
    return userInfo.value?.avatar || ''
  })

  // ================= Actions =================
  
  // 设置Token
  function setToken(newToken) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, newToken)
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN)
    }
  }

  // 设置用户信息
  function setUserInfo(info) {
    userInfo.value = info
    if (info) {
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(info))
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_INFO)
    }
  }

  // 设置主题
  function setTheme(newTheme) {
    theme.value = newTheme
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme)
    
    // 应用主题到HTML元素
    const html = document.documentElement
    if (newTheme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      html.setAttribute('data-theme', newTheme)
    }
  }

  const sidebarOpen = ref(false)

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  function openSidebar() {
    sidebarOpen.value = true
  }

  // 设置当前视图
  function setCurrentView(view) {
    currentView.value = view
  }

  // 加载账号列表
  function loadAccounts() {
    try {
      const accountsData = localStorage.getItem(STORAGE_KEYS.ACCOUNTS)
      accounts.value = accountsData ? JSON.parse(accountsData) : []
    } catch (error) {
      console.error('加载账号列表失败:', error)
      accounts.value = []
    }
  }

  // 保存账号列表
  function saveAccounts(accs) {
    accounts.value = accs
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs))
  }

  // 添加账号
  function addAccount(account) {
    const exists = accounts.value.some(acc => acc.token === account.token)
    if (!exists) {
      accounts.value.push(account)
      saveAccounts(accounts.value)
    }
  }

  // 删除账号
  function removeAccount(tokenToRemove) {
    const index = accounts.value.findIndex(acc => acc.token === tokenToRemove)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      saveAccounts(accounts.value)
    }
  }

  // 设置维护状态
  function setMaintenance(status) {
    isMaintenance.value = status
  }

  // 检查服务器状态
  async function checkServerStatus() {
    try {
      await userApi.getInfo()
      setMaintenance(false)
      return true
    } catch (error) {
      // 检查是否为服务器维护错误
      if (error.message.includes('530') || error.message.includes('服务器正在维护中')) {
        setMaintenance(true)
        return false
      }
      throw error
    }
  }

  // 刷新用户信息（从 API 获取最新数据）
  async function refreshUserInfo() {
    try {
      const data = await userApi.getInfo()
      setUserInfo(data)
      setMaintenance(false)
      return data
    } catch (error) {
      console.error('刷新用户信息失败:', error)
      
      // 检查是否为服务器维护错误
      if (error.message.includes('530') || error.message.includes('服务器正在维护中')) {
        setMaintenance(true)
      }
      throw error
    }
  }

  // 初始化Store（从LocalStorage恢复状态）
  function init() {
    // 恢复Token
    const savedToken = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN)
    if (savedToken) {
      token.value = savedToken
    }

    // 恢复用户信息
    const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO)
    if (userInfoStr) {
      try {
        userInfo.value = JSON.parse(userInfoStr)
      } catch (error) {
        console.error('解析用户信息失败:', error)
      }
    }

    // 恢复主题
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
    if (savedTheme) {
      theme.value = savedTheme
      setTheme(savedTheme)
    }

    // 加载账号列表
    loadAccounts()
  }

  return {
    // State
    token,
    userInfo,
    theme,
    currentView,
    accounts,
    isMaintenance,
    sidebarOpen,
    
    // Getters
    isAuthenticated,
    username,
    avatar,
    
    // Actions
    setToken,
    setUserInfo,
    setTheme,
    setCurrentView,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    loadAccounts,
    saveAccounts,
    addAccount,
    removeAccount,
    refreshUserInfo,
    checkServerStatus,
    setMaintenance,
    init
  }
})
