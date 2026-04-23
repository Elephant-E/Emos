<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import api from '@/api/index.js'
import { STORAGE_KEYS } from '@/utils/storage.js'
import { showToast } from '@/utils/toast.js'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

// ================= 主题管理 =================
const theme = ref(localStorage.getItem(STORAGE_KEYS.THEME) || 'auto')

const themeIcon = computed(() => {
  if (theme.value === 'auto') return 'fa-adjust'
  if (theme.value === 'dark') return 'fa-moon'
  return 'fa-sun'
})

const applyTheme = (t) => {
  const html = document.documentElement
  
  if (t === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    html.setAttribute('data-theme', t)
  }
  
  updateThemeIcon(t)
}

const updateThemeIcon = (t) => {
  theme.value = t
  localStorage.setItem(STORAGE_KEYS.THEME, t)
}

const toggleTheme = () => {
  const themes = ['auto', 'light', 'dark']
  const currentIndex = themes.indexOf(theme.value)
  const newTheme = themes[(currentIndex + 1) % themes.length]
  applyTheme(newTheme)
  
  if (navigator.vibrate) navigator.vibrate(10)
}

// ================= 汉堡菜单 =================
const handleMenuClick = () => {
  // 调用全局的toggleSidebar方法
  if (window.toggleSidebar) {
    window.toggleSidebar()
  } else {
    console.warn('toggleSidebar method not found')
  }
}

// ================= 用户头像管理 =================
// 从 appStore 获取用户信息（响应式）
const userInfo = computed(() => appStore.userInfo)
const hasAvatar = computed(() => {
  return userInfo.value && userInfo.value.avatar
})

// 获取显示名称：优先笔名，其次用户名
const displayName = computed(() => {
  if (!userInfo.value) return ''
  return userInfo.value.pseudonym || userInfo.value.username || ''
})

// ================= 下拉菜单管理 =================
const dropdownVisible = ref(false)
const dropdownStyle = ref({})

const updateDropdownPosition = () => {
  const avatarContainer = document.querySelector('.user-avatar-container')
  if (!avatarContainer) return
  
  const rect = avatarContainer.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`
  }
}

const toggleDropdown = (e) => {
  e.stopPropagation()
  dropdownVisible.value = !dropdownVisible.value
  if (dropdownVisible.value) {
    // 下次 DOM 更新后计算位置
    setTimeout(updateDropdownPosition, 0)
  }
}

const closeDropdown = () => {
  dropdownVisible.value = false
}

const handleLogout = () => {
  closeDropdown()
  if (confirm('确定要退出登录吗？')) {
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
const accounts = ref([])
const currentToken = ref(localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN))
const newAccountToken = ref('')
const isAddingAccount = ref(false)

const getAccounts = () => {
  try {
    const accountsData = localStorage.getItem(STORAGE_KEYS.ACCOUNTS)
    return accountsData ? JSON.parse(accountsData) : []
  } catch (error) {
    return []
  }
}

const saveAccounts = (accs) => {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs))
}

const loadAccounts = () => {
  accounts.value = getAccounts()
}

const openSwitchAccountModal = () => {
  closeDropdown()
  loadAccounts()
  ensureCurrentAccountSaved()
  switchAccountModalVisible.value = true
}

const closeSwitchAccountModal = () => {
  switchAccountModalVisible.value = false
  newAccountToken.value = ''
}

// 确保当前账号已保存到列表
const ensureCurrentAccountSaved = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN)
  if (!token) return
  
  try {
    const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO)
    if (!userInfoStr) return
    
    const currentUser = JSON.parse(userInfoStr)
    const accs = getAccounts()
    
    const exists = accs.some(acc => acc.token === token)
    
    if (!exists && currentUser) {
      accs.push({
        token: token,
        user: {
          username: currentUser.username,
          avatar: currentUser.avatar
        },
        addedAt: new Date().toISOString()
      })
      saveAccounts(accs)
      // 当前账号已自动保存到列表
    }
  } catch (error) {
    console.error('保存当前账号失败', error)
  }
}

// 构建显示列表：当前账号始终在第一位
const displayAccounts = computed(() => {
  const result = []
  
  // 1. 先添加当前账号（即使不在accounts中）
  if (currentToken.value && userInfo.value) {
    result.push({
      token: currentToken.value,
      user: userInfo.value,
      isCurrent: true
    })
  }
  
  // 2. 再添加其他已保存的账号（排除当前账号）
  accounts.value.forEach(account => {
    if (account.token !== currentToken.value) {
      result.push({
        ...account,
        isCurrent: false
      })
    }
  })
  
  return result
})

// 切换到指定账号
const switchToAccount = async (token) => {
  const account = accounts.value.find(acc => acc.token === token)
  if (!account) return
  
  try {
    // 临时设置token进行验证
    const oldToken = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN)
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, account.token)
    
    const data = await api.get('/api/user')
    
    // 恢复原来的token
    if (oldToken) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, oldToken)
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN)
    }
    
    // API直接返回用户信息对象，检查是否有username字段
    if (data && data.username) {
      // Token 有效，更新用户信息
      account.user = {
        username: data.username,
        avatar: data.avatar
      }
      saveAccounts(accounts.value)
      
      // 正式切换token
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, account.token)
      
      // 更新 Token
      appStore.setToken(account.token)
      currentToken.value = account.token
      
      // 刷新用户信息（从 API 获取最新数据）
      try {
        await appStore.refreshUserInfo()
        showToast('切换账号成功', 'success')
      } catch (error) {
        showToast('切换失败: ' + error.message, 'error')
        return
      }
      
      closeSwitchAccountModal()
      
      // 触发自定义事件，通知其他组件账号已切换
      window.dispatchEvent(new CustomEvent('accountSwitched', { 
        detail: { userInfo: data }
      }))
    } else {
      showToast('Token 已过期，已自动移除', 'warning')
      deleteAccount(token)
    }
  } catch (error) {
    showToast('切换失败，Token 可能已过期', 'error')
    deleteAccount(token)
  }
}

// 删除账号
const deleteAccount = (token) => {
  const index = accounts.value.findIndex(acc => acc.token === token)
  
  if (index !== -1) {
    accounts.value.splice(index, 1)
    saveAccounts(accounts.value)
    showToast('已删除账号', 'success')
  }
}

// 添加新账号
const addNewAccount = async () => {
  const token = newAccountToken.value.trim()
  
  if (!token) {
    showToast('请输入 Token', 'error')
    return
  }
  
  try {
    isAddingAccount.value = true
    
    // 临时设置token进行验证
    const oldToken = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN)
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, token)
    
    const data = await api.get('/api/user')
    
    // 恢复原来的token
    if (oldToken) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN, oldToken)
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN)
    }
    
    // API直接返回用户信息对象，检查是否有username字段
    if (data && data.username) {
      const accs = getAccounts()
      const newAccount = {
        token: token,
        user: {
          username: data.username,
          avatar: data.avatar
        },
        addedAt: new Date().toISOString()
      }
      
      const exists = accs.some(acc => acc.token === token)
      if (exists) {
        showToast('该账号已存在', 'warning')
      } else {
        accs.push(newAccount)
        saveAccounts(accs)
        showToast('添加账号成功', 'success')
        newAccountToken.value = ''
        loadAccounts()
      }
    } else {
      throw new Error(data.message || 'Token 无效')
    }
  } catch (error) {
    showToast(error.message || '添加账号失败', 'error')
  } finally {
    isAddingAccount.value = false
  }
}

// ================= 生命周期 =================
onMounted(() => {
  // 初始化主题
  applyTheme(theme.value)
  
  // 监听系统主题变化
  if (theme.value === 'auto') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      applyTheme('auto')
    })
  }
  
  // 确保当前账号已保存
  ensureCurrentAccountSaved()
  
  // 点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    const avatarContainer = document.querySelector('.user-avatar-container')
    const dropdown = document.querySelector('.user-dropdown')
    if (avatarContainer && dropdown && !avatarContainer.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown()
    }
  })
  
  // 监听窗口大小变化，更新下拉框位置
  window.addEventListener('resize', updateDropdownPosition)
  window.addEventListener('scroll', updateDropdownPosition)
})

onUnmounted(() => {
  // 清理工作
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition)
})
</script>

<template>
  <nav class="top-bar-apple">
    <div class="top-left">
      <!-- 汉堡菜单图标 - 简洁无容器 -->
      <i class="fas fa-bars menu-icon" @click="handleMenuClick" title="打开菜单"></i>
      
      <!-- Logo - 点击返回首页 -->
      <span class="brand-text" @click="$router.push('/')">EMOS</span>
    </div>
    
    <div class="top-right">
      <!-- 用户头像区域 -->
      <div 
        class="user-avatar-container"
        :class="{ 'dropdown-open': dropdownVisible }"
        @click="toggleDropdown"
      >
        <!-- 头像 -->
        <div class="user-avatar">
          <i class="fas fa-user" v-if="!hasAvatar"></i>
          <img 
            v-if="hasAvatar" 
            :src="userInfo.avatar" 
            alt="Avatar" 
            id="headerAvatarImg"
          >
        </div>
        
        <!-- 用户名显示（可选） -->
        <span class="user-display-name" v-if="displayName">{{ displayName }}</span>
      </div>
      
      <!-- 下拉菜单 - 使用 Teleport 传送到 body -->
      <Teleport to="body">
        <div 
          class="user-dropdown" 
          :class="{ show: dropdownVisible }"
          :style="dropdownStyle"
        >
          <!-- 主题切换 -->
          <div class="dropdown-item" @click.stop="toggleTheme">
            <i class="fas fa-moon" v-if="theme === 'dark'"></i>
            <i class="fas fa-sun" v-else-if="theme === 'light'"></i>
            <i class="fas fa-adjust" v-else></i>
            <span>{{ theme === 'dark' ? '深色模式' : (theme === 'light' ? '浅色模式' : '跟随系统') }}</span>
          </div>
          
          <!-- 账号管理 -->
          <div class="dropdown-item" @click="handleAccountManage">
            <i class="fas fa-user-cog"></i> 账号管理
          </div>
          
          <!-- 切换账号 -->
          <div class="dropdown-item" @click="openSwitchAccountModal">
            <i class="fas fa-exchange-alt"></i> 切换账号
          </div>
          
          <!-- 退出登录 -->
          <div class="dropdown-item danger" @click="handleLogout">
            <i class="fas fa-sign-out-alt"></i> 退出登录
          </div>
        </div>
      </Teleport>
    </div>
  </nav>
  
  <!-- 切换账号模态框 -->
  <div 
    class="modal-overlay" 
    :class="{ show: switchAccountModalVisible }"
    @click.self="closeSwitchAccountModal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">切换账号</span>
        <button class="modal-close" @click="closeSwitchAccountModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- 账号列表 -->
        <div v-if="displayAccounts.length === 0" style="text-align:center;padding:2rem;color:var(--text-secondary);">
          <i class="fas fa-inbox" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i>
          暂无账号
        </div>
        
        <div v-else>
          <div style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">账号列表</div>
          <div class="account-list">
            <div 
              v-for="(account, index) in displayAccounts" 
              :key="index"
              class="account-item"
              :class="{ active: account.isCurrent }"
              :style="account.isCurrent ? 'cursor:default;opacity:0.7;' : ''"
              @click="!account.isCurrent && switchToAccount(account.token)"
            >
              <!-- 头像 -->
              <div v-if="account.user?.avatar" class="account-avatar">
                <img 
                  :src="account.user.avatar" 
                  :alt="account.user.username"
                  :style="account.isCurrent ? 'filter:grayscale(100%);' : ''"
                >
              </div>
              <div 
                v-else
                class="account-avatar"
                :style="account.isCurrent ? 'filter:grayscale(100%);' : ''"
              >
                <i class="fas fa-user"></i>
              </div>
              
              <!-- 用户名和描述 -->
              <div class="account-info">
                <div class="account-name">
                  {{ account.user?.username || '未知用户' }}
                </div>
                <div v-if="account.isCurrent" style="font-size:0.75rem;color:var(--accent);margin-top:2px;">
                  ● 当前账号
                </div>
              </div>
              
              <!-- 删除按钮（仅非当前账号显示） -->
              <button 
                v-if="!account.isCurrent"
                style="width:32px;height:32px;border-radius:50%;border:none;background:transparent;color:var(--text-secondary);cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;"
                @click.stop="deleteAccount(account.token)"
                @mouseenter="$event.target.style.background='var(--bg-surface-hover)';$event.target.style.color='var(--danger)'"
                @mouseleave="$event.target.style.background='transparent';$event.target.style.color='var(--text-secondary)'"
              >
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        </div>
        
        <!-- 添加新账号 -->
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
          <div class="form-group">
            <label class="form-label">添加新账号</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="newAccountToken"
              placeholder="请输入 Token"
              @keyup.enter="addNewAccount"
            >
          </div>
          <button 
            class="btn-primary"
            style="width:100%;"
            @click="addNewAccount"
            :disabled="isAddingAccount"
          >
            <i v-if="isAddingAccount" class="fas fa-circle-notch fa-spin"></i>
            <span v-else>添加账号</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式在全局CSS中定义 */
</style>
