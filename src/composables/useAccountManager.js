import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import api from '@/api/index.js'
import { STORAGE_KEYS } from '@/utils/storage.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'

/**
 * 用户菜单与账号管理域：主题切换、用户下拉、退出登录、账号切换/添加/删除。
 * 与原实现行为保持一致。
 */
export function useAccountManager() {
  const router = useRouter()
  const appStore = useAppStore()

  // ================= 主题 =================

  const theme = computed(() => appStore.theme)

  const toggleTheme = () => {
    const themes = ['auto', 'light', 'dark']
    const currentIndex = themes.indexOf(theme.value)
    appStore.setTheme(themes[(currentIndex + 1) % themes.length])
  }

  // ================= 用户信息 =================

  const userInfo = computed(() => appStore.userInfo)
  const hasAvatar = computed(() => userInfo.value?.avatar)
  const displayName = computed(() => userInfo.value?.pseudonym || userInfo.value?.username || '')

  // ================= 用户下拉 =================

  const dropdownVisible = ref(false)
  const dropdownStyle = ref({})

  const updateDropdownPosition = () => {
    const isMobileView = window.innerWidth < 484
    const userBtn = isMobileView
      ? document.querySelector('.sidebar__avatar-mobile')
      : document.querySelector('.sidebar__user-menu')

    if (!userBtn) return
    const rect = userBtn.getBoundingClientRect()

    if (isMobileView) {
      dropdownStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        right: `${window.innerWidth - rect.right}px`,
        minWidth: '185px'
      }
    } else {
      dropdownStyle.value = {
        position: 'fixed',
        bottom: `${window.innerHeight - rect.top + 8}px`,
        left: `${rect.left}px`,
        minWidth: '185px'
      }
    }
  }

  const toggleDropdown = (e) => {
    e.stopPropagation()
    dropdownVisible.value = !dropdownVisible.value
    if (dropdownVisible.value) {
      setTimeout(updateDropdownPosition, 0)
    }
  }

  const closeDropdown = () => { dropdownVisible.value = false }

  const handleDocumentClick = (e) => {
    const userBtn = document.querySelector('.sidebar__user')
    const dropdown = document.querySelector('.sidebar__dropdown')
    if (userBtn && dropdown && !userBtn.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown()
    }
  }

  // ================= 登出/账户管理入口 =================

  const handleLogout = async () => {
    closeDropdown()
    if (await confirmDialog('确定要退出登录吗？')) {
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  const handleAccountManage = () => {
    closeDropdown()
    router.push('/account')
  }

  // ================= 切换账号模态框 =================

  const switchAccountModalVisible = ref(false)
  const newAccountToken = ref('')
  const isAddingAccount = ref(false)

  const openSwitchAccountModal = () => {
    closeDropdown()
    appStore.loadAccounts()
    ensureCurrentAccountSaved()
    switchAccountModalVisible.value = true
  }

  const closeSwitchAccountModal = () => {
    switchAccountModalVisible.value = false
    newAccountToken.value = ''
  }

  const ensureCurrentAccountSaved = () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN)
    if (!token) return
    try {
      const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO)
      if (!userInfoStr) return
      const currentUser = JSON.parse(userInfoStr)
      const exists = appStore.accounts.some(acc => acc.token === token)
      if (!exists && currentUser) {
        appStore.addAccount({ token, user: { username: currentUser.username, avatar: currentUser.avatar }, addedAt: new Date().toISOString() })
      }
    } catch (error) { console.error('保存当前账号失败', error) }
  }

  // ================= 账号列表 =================

  const currentToken = computed(() => appStore.token)

  const displayAccounts = computed(() => {
    const result = []
    if (currentToken.value && userInfo.value) {
      result.push({ token: currentToken.value, user: userInfo.value, isCurrent: true })
    }
    appStore.accounts.forEach(account => {
      if (account.token !== currentToken.value) {
        result.push({ ...account, isCurrent: false })
      }
    })
    return result
  })

  const switchToAccount = async (token) => {
    const account = appStore.accounts.find(acc => acc.token === token)
    if (!account) return
    try {
      const oldToken = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN)
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, account.token)
      const data = await api.get('/api/user')
      if (oldToken) localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, oldToken)
      else localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN)
      if (data?.username) {
        account.user = { username: data.username, avatar: data.avatar }
        appStore.saveAccounts([...appStore.accounts])
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, account.token)
        appStore.setToken(account.token)
        try {
          await appStore.refreshUserInfo()
          showToast('切换账号成功', 'success')
        } catch (error) { showToast('切换失败: ' + error.message, 'error'); return }
        closeSwitchAccountModal()
        window.dispatchEvent(new CustomEvent('accountSwitched', { detail: { userInfo: data } }))
      } else {
        showToast('Token 已过期', 'warning')
        deleteAccount(token)
      }
    } catch (error) { showToast('切换失败，Token 可能已过期', 'error'); deleteAccount(token) }
  }

  const deleteAccount = (token) => { appStore.removeAccount(token); showToast('已删除账号', 'success') }

  // ================= 添加账号 =================

  const addNewAccount = async () => {
    const token = newAccountToken.value.trim()
    if (!token) { showToast('请输入 Token', 'error'); return }
    try {
      isAddingAccount.value = true
      const oldToken = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN)
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, token)
      const data = await api.get('/api/user')
      if (oldToken) localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, oldToken)
      else localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN)
      if (data?.username) {
        const exists = appStore.accounts.some(acc => acc.token === token)
        if (exists) { showToast('该账号已存在', 'warning') }
        else { appStore.addAccount({ token, user: { username: data.username, avatar: data.avatar }, addedAt: new Date().toISOString() }); showToast('添加账号成功', 'success'); newAccountToken.value = '' }
      } else { throw new Error(data.message || 'Token 无效') }
    } catch (error) { showToast(error.message || '添加账号失败', 'error') }
    finally { isAddingAccount.value = false }
  }

  // ================= 生命周期 =================

  onMounted(() => {
    appStore.setTheme(theme.value)
    ensureCurrentAccountSaved()
    document.addEventListener('click', handleDocumentClick)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleDocumentClick)
  })

  return {
    theme,
    toggleTheme,
    userInfo,
    hasAvatar,
    displayName,
    dropdownVisible,
    dropdownStyle,
    updateDropdownPosition,
    toggleDropdown,
    closeDropdown,
    handleDocumentClick,
    handleLogout,
    handleAccountManage,
    switchAccountModalVisible,
    newAccountToken,
    isAddingAccount,
    openSwitchAccountModal,
    closeSwitchAccountModal,
    ensureCurrentAccountSaved,
    currentToken,
    displayAccounts,
    switchToAccount,
    deleteAccount,
    addNewAccount,
  }
}