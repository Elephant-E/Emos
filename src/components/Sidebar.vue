<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import api from '@/api/index.js'
import { STORAGE_KEYS } from '@/utils/storage.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import BaseModal from '@/components/common/BaseModal.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const sidebarOpen = computed(() => appStore.sidebarOpen)

const isMobile = ref(window.innerWidth < 484)
const isTablet = ref(window.innerWidth >= 484 && window.innerWidth < 768)

const updateLayout = () => {
  isMobile.value = window.innerWidth < 484
  isTablet.value = window.innerWidth >= 484 && window.innerWidth < 768
}

const menuItems = [
  { path: '/', icon: 'fa-house', label: '主页' },
  { path: '/media', icon: 'fa-film', label: '媒体' },
  { path: '/watchlist', icon: 'fa-list', label: '片单' },
  { path: '/upload', icon: 'fa-cloud-arrow-up', label: '上传' },
  { path: '/seek', icon: 'fa-heart', label: '求片' },
  { path: '/shop', icon: 'fa-bag-shopping', label: '商城' },
  { path: '/order', icon: 'fa-receipt', label: '订单' },
  { path: '/shop/manage', icon: 'fa-store', label: '商户' },
  { path: '/line', icon: 'fa-network-wired', label: '线路' }
]

const isActive = (path) => {
  if (path === '/') return route.path === '/'
  return route.path === path || (route.path.startsWith(path + '/') && !menuItems.some(item => item.path === route.path))
}

const navigateTo = (path) => {
  router.push(path)
  if (window.innerWidth <= 768) closeSidebar()
}

const closeSidebar = () => {
  appStore.closeSidebar()
  document.removeEventListener('click', handleOutsideClick)
  document.body.style.overflow = ''
}

const handleOutsideClick = (e) => {
  const sidebar = document.querySelector('.sidebar')
  const hamburgerBtn = document.querySelector('.sidebar-hamburger')
  if (sidebar && !sidebar.contains(e.target) && (!hamburgerBtn || !hamburgerBtn.contains(e.target))) {
    closeSidebar()
  }
}

const handleResize = () => {
  if (window.innerWidth > 768) {
    appStore.closeSidebar()
    document.body.style.overflow = ''
  }
}

const theme = computed(() => appStore.theme)

const toggleTheme = () => {
  const themes = ['auto', 'light', 'dark']
  const currentIndex = themes.indexOf(theme.value)
  appStore.setTheme(themes[(currentIndex + 1) % themes.length])
}

const userInfo = computed(() => appStore.userInfo)
const hasAvatar = computed(() => userInfo.value?.avatar)
const displayName = computed(() => userInfo.value?.pseudonym || userInfo.value?.username || '')

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

const handleDocumentClick = (e) => {
  const userBtn = document.querySelector('.sidebar__user')
  const dropdown = document.querySelector('.sidebar__dropdown')
  if (userBtn && dropdown && !userBtn.contains(e.target) && !dropdown.contains(e.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  appStore.setTheme(theme.value)
  ensureCurrentAccountSaved()
  updateLayout()
  window.addEventListener('resize', handleResize)
  window.addEventListener('resize', updateLayout)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('resize', updateLayout)
  document.removeEventListener('click', handleDocumentClick)
  document.body.style.overflow = ''
})
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen && isMobile }">
    <div class="sidebar__header">
      <button v-if="isMobile" class="sidebar-hamburger" @click="appStore.toggleSidebar()">
        <span class="hamburger-line hamburger-line--top"></span>
        <span class="hamburger-line hamburger-line--bottom"></span>
      </button>
      <a class="sidebar__logo" @click.prevent="router.push('/')">EMOS</a>
      <div v-if="isMobile" class="sidebar__avatar-mobile" @click="toggleDropdown">
        <i class="fas fa-user" v-if="!hasAvatar"></i>
        <img v-if="hasAvatar" :src="userInfo.avatar" alt="" loading="lazy">
      </div>
    </div>

    <div class="sidebar__content">
      <div class="sidebar__scrollable">
        <ul class="sidebar__nav-list">
          <li
            v-for="item in menuItems"
            :key="item.path"
            class="sidebar__nav-item"
            :class="{ 'sidebar__nav-item--active': isActive(item.path) }"
          >
            <a class="sidebar__nav-link" @click.prevent="navigateTo(item.path)">
              <div class="sidebar__nav-content">
                <span class="sidebar__nav-icon"><i :class="`fas ${item.icon}`"></i></span>
                <span class="sidebar__nav-label" dir="auto">{{ item.label }}</span>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="sidebar__footer">
      <div class="sidebar__user">
        <div class="sidebar__avatar">
          <i class="fas fa-user" v-if="!hasAvatar"></i>
          <img v-if="hasAvatar" :src="userInfo.avatar" alt="" loading="lazy">
        </div>
        <span class="sidebar__username">{{ displayName }}</span>
        <i class="fas fa-ellipsis sidebar__user-menu" @click="toggleDropdown"></i>
      </div>

      <Teleport to="body">
        <div class="sidebar__dropdown" :class="{ 'sidebar__dropdown--visible': dropdownVisible }" :style="dropdownStyle" v-show="dropdownVisible">
          <div class="sidebar__dropdown-item" @click.stop="toggleTheme">
            <i class="fas fa-moon" v-if="theme === 'dark'"></i>
            <i class="fas fa-sun" v-else-if="theme === 'light'"></i>
            <i class="fas fa-circle-half-stroke" v-else></i>
            <span>{{ theme === 'dark' ? '深色模式' : (theme === 'light' ? '浅色模式' : '跟随系统') }}</span>
          </div>
          <div class="sidebar__dropdown-item" @click="handleAccountManage">
            <i class="fas fa-user-gear"></i> <span>账号管理</span>
          </div>
          <div class="sidebar__dropdown-item" @click="openSwitchAccountModal">
            <i class="fas fa-right-left"></i> <span>切换账号</span>
          </div>
          <div class="sidebar__dropdown-item sidebar__dropdown-item--danger" @click="handleLogout">
            <i class="fas fa-arrow-right-from-bracket"></i> <span>退出登录</span>
          </div>
        </div>
      </Teleport>
    </div>
  </aside>

  <BaseModal :visible="switchAccountModalVisible" title="切换账号" @close="closeSwitchAccountModal">
    <div v-if="displayAccounts.length === 0" class="list-empty">
      <i class="fas fa-inbox"></i>
      <p>暂无账号</p>
    </div>
    <template v-else>
      <div v-for="account in displayAccounts" :key="account.token" class="list-row"
        :class="{ 'account-item--current': account.isCurrent }"
        @click="!account.isCurrent && switchToAccount(account.token)">
        <div v-if="account.user?.avatar" class="list-row__avatar" :class="{ 'account-avatar--muted': account.isCurrent }">
          <img :src="account.user.avatar" :alt="account.user.username">
        </div>
        <div v-else class="list-row__avatar-placeholder" :class="{ 'account-avatar--muted': account.isCurrent }">
          <i class="fas fa-user"></i>
        </div>
        <div class="list-row__content">
          <div class="list-row__title">{{ account.user?.username || '未知用户' }}</div>
          <div v-if="account.isCurrent" class="list-row__subtitle" style="color:var(--key-color);">● 当前账号</div>
        </div>
        <button v-if="!account.isCurrent" class="account-delete-btn list-row__action"
          @click.stop="deleteAccount(account.token)">
          <i class="fas fa-trash-can"></i>
        </button>
      </div>
    </template>
    <div style="margin-top:16px;padding-top:16px;border-top:0.5px solid var(--system-quaternary);">
      <div class="form-group">
        <label class="form-label">添加新账号</label>
        <input type="text" class="modal-input" v-model="newAccountToken" placeholder="请输入 Token" @keyup.enter="addNewAccount">
      </div>
      <button class="btn-primary" style="width:100%;" @click="addNewAccount" :disabled="isAddingAccount">
        <i v-if="isAddingAccount" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>添加账号</span>
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
/* ===== Sidebar — Apple Music 精确复刻 ===== */

.sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
  z-index: var(--z-web-chrome);
  overflow: hidden;
}

/* ===== Header ===== */
.sidebar__header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.sidebar__logo {
  cursor: pointer;
  fill: var(--system-primary);
  text-decoration: none;
  display: flex;
  align-items: center;
}

.sidebar__logo:hover {
  fill: var(--key-color);
}

/* ===== Content ===== */
.sidebar__content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar__scrollable {
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  flex: 1;
}

.sidebar__scrollable::-webkit-scrollbar { width: 0; }

/* ===== Nav List ===== */
.sidebar__nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* ===== Nav Item ===== */
.sidebar__nav-item {
  border-radius: 6px;
  margin-bottom: 2px;
  padding: 4px;
  position: relative;
  --linkHoverTextDecoration: none;
}

.sidebar__nav-item:last-child {
  margin-bottom: 1px;
}

/* ===== Nav Item Link ===== */
.sidebar__nav-link {
  display: block;
  height: 100%;
  border-radius: inherit;
  box-sizing: content-box;
  margin: -3px;
  padding: 3px;
  cursor: pointer;
  text-decoration: none;
}

/* ===== Nav Item Content ===== */
.sidebar__nav-content {
  display: flex;
  align-items: center;
  border-radius: inherit;
  color: var(--system-primary);
  height: 100%;
  width: 100%;
}

/* ===== Nav Item Icon ===== */
.sidebar__nav-icon {
  flex: 0 0 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar__nav-icon i {
  font-size: 17px;
  color: var(--system-primary);
  line-height: 1;
}

/* ===== Nav Item Label ===== */
.sidebar__nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  line-height: 1.2308;
}

/* ===== Active State ===== */
.sidebar__nav-item--active {
  background-color: var(--nav-sidebar-selected-state);
}

.sidebar__nav-item--active .sidebar__nav-content {
  color: var(--key-color);
}

.sidebar__nav-item--active .sidebar__nav-icon i {
  color: var(--key-color);
}

/* ===== Footer ===== */
.sidebar__footer {
  flex-shrink: 0;
}

.sidebar__user {
  display: flex;
  align-items: center;

  transition: background-color 0.15s ease;
}

.sidebar__user-menu {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}


.sidebar__avatar {
  border-radius: 50%;
  background: var(--system-quaternary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--system-tertiary);
}

.sidebar__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar__username {
  flex: 1;
  color: var(--system-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__user .fa-ellipsis {
  color: var(--system-tertiary);
}

/* ===== Dropdown ===== */
.sidebar__dropdown {
  background: var(--opaque-shelf-bg);
  border: none;
  border-radius: 10px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.25);
  z-index: 9951;
  padding: 4px;
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
  transition: opacity 0.1s ease-in, transform 0.1s ease-in;
  pointer-events: none;
}

.sidebar__dropdown--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.sidebar__dropdown-item {
  display: flex;
  align-items: center;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sidebar__dropdown-item:hover {
  background: var(--nav-sidebar-selected-state);
  color: var(--system-primary);
}

.sidebar__dropdown-item--danger {
  color: var(--system-red);
}

/* ===== Hamburger (mobile) ===== */
.sidebar-hamburger {
  position: fixed;
  top: 0;
  left: 0;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: var(--system-primary);
  font-size: 17px;
  cursor: pointer;
  z-index: calc(var(--z-web-chrome) + 1);
  display: none;
  align-items: center;
  justify-content: center;
}

/* ========================================
   Responsive — Apple Music 精确断点
   ======================================== */

/* ===== Mobile (<484px): 顶部固定导航条 ===== */
@media (max-width: 483px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    background: var(--opaque-shelf-bg);
    z-index: var(--z-web-chrome);
    border-bottom: 0.5px solid var(--system-quaternary);
    transition: height 0.56s cubic-bezier(0.52, 0.16, 0.24, 1);
    overflow: hidden;
  }

  .sidebar--open {
    height: 100vh;
  }

  .sidebar-hamburger {
    display: grid;
    place-items: center;
    position: relative;
    width: 44px;
    height: 44px;
    border: none;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    padding: 0;
  }

  .hamburger-line {
    display: block;
    width: 20px;
    height: 2px;
    background: var(--system-primary);
    position: absolute;
    left: 12px;
    border-radius: 1px;
    transition: transform 0.1806s cubic-bezier(0.04, 0.04, 0.12, 0.96),
                top 0.1806s cubic-bezier(0.04, 0.04, 0.12, 0.96);
  }

  .hamburger-line--top {
    top: 17px;
  }

  .hamburger-line--bottom {
    top: 23px;
  }

  .sidebar--open .hamburger-line--top {
    top: 20px;
    transform: rotate(-45deg);
    transition: top 0.1806s cubic-bezier(0.04, 0.04, 0.12, 0.96),
                transform 0.3192s cubic-bezier(0.04, 0.04, 0.12, 0.96) 0.1008s;
  }

  .sidebar--open .hamburger-line--bottom {
    top: 20px;
    transform: rotate(45deg);
    transition: top 0.1806s cubic-bezier(0.04, 0.04, 0.12, 0.96),
                transform 0.3192s cubic-bezier(0.04, 0.04, 0.12, 0.96) 0.1008s;
  }

  .sidebar__header {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    height: 52px;
    margin-inline: 14px 16px;
    padding-block: 4px;
  }

  .sidebar__header > :first-child { justify-self: start; }
  .sidebar__header > :nth-child(2) { justify-self: center; }
  .sidebar__header > :nth-child(3) { justify-self: end; }

  .sidebar__logo {
    font-size: 15px;
    font-weight: 600;
    color: var(--system-primary);
    line-height: 1;
    cursor: pointer;
    text-decoration: none;
  }

  .sidebar__avatar-mobile {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--system-quaternary);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: pointer;
    color: var(--system-tertiary);
    font-size: 12px;
  }

  .sidebar__avatar-mobile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sidebar__content {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  .sidebar__scrollable {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .sidebar__nav-list {
    font: var(--title-navigation);
    padding: 0;
  }

  .sidebar__nav-item {
    border-radius: 8px;
    margin-bottom: 4px;
    padding: 4px;
  }

  .sidebar__nav-item:last-child {
    margin-bottom: 1px;
  }

  .sidebar__nav-link {
    display: block;
    height: 100%;
    border-radius: inherit;
  }

  .sidebar__nav-content {
    height: 44px;
    padding: 0 8px;
    gap: 6px;
    display: flex;
    align-items: center;
    border-radius: inherit;
    color: var(--system-primary);
  }

  .sidebar__nav-icon {
    flex: 0 0 28px;
    margin-inline: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar__nav-icon i {
    font-size: 22px;
    color: var(--system-primary);
  }

  .sidebar__nav-label {
    flex: 1;
    font: var(--title-navigation);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar__nav-item--active {
    background-color: var(--nav-sidebar-selected-state);
  }

  .sidebar__nav-item--active .sidebar__nav-content {
    color: var(--key-color);
  }

  .sidebar__nav-item--active .sidebar__nav-icon i {
    color: var(--key-color);
  }

  .sidebar__nav-item--active .sidebar__nav-label {
    font-weight: 400;
  }

  .sidebar__footer {
    display: none !important;
  }

  .sidebar__dropdown-item {
    gap: 8px;
    height: 44px;
    padding: 0 12px;
    font: var(--body);
    color: var(--system-primary);
  }

  .sidebar__dropdown-item i {
    flex: 0 0 24px;
    line-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    color: var(--system-primary);
  }
}

/* ===== Desktop (≥484px): 左侧圆角卡片侧边栏 ===== */
@media (min-width: 484px) {
  .sidebar {
    position: fixed;
    top: 8px;
    left: 8px;
    bottom: 8px;
    width: calc(var(--web-navigation-width) - 16px);
    height: calc(100% - 16px);
    background: var(--opaque-shelf-bg);
    border: none;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    transition: transform 0.56s cubic-bezier(0.52, 0.16, 0.24, 1);
  }

  .sidebar__header {
    height: 72px;
    padding-inline: 20px;
    align-items: center;
  }

  .sidebar__logo {
    font-size: 21px;
    font-weight: 700;
    color: var(--system-primary);
    letter-spacing: -0.02em;
    line-height: 1;
    height: 20px;
    display: flex;
    align-items: center;
  }

  .sidebar__content {
    flex: 1;
    width: var(--web-navigation-width);

    width: unset;
  }

  .sidebar__scrollable {
    padding: 0;
    padding-inline: 16px;
    scrollbar-width: thin;
  }

  .sidebar__nav-list {
    font: var(--title-navigation);
    padding-top: 0;
  }

  .sidebar__nav-item {
    border-radius: 8px;
    margin-bottom: 2px;
    padding: 4px;
    height: auto;
  }

  .sidebar__nav-content {
    gap: 6px;
    height: 36px;
    padding: 0;
  }

  .sidebar__nav-icon {
    flex-basis: 24px;
    margin-inline: 0;
  }

  .sidebar__nav-icon i {
    font-size: 17px;
    line-height: 1;
  }

  .sidebar__nav-label {
    font: var(--body);
  }

  .sidebar__nav-item--active .sidebar__nav-content {
    font: var(--body-emphasized);
  }

  .sidebar__nav-item--active .sidebar__nav-label {
    font: var(--body-emphasized);
  }

  .sidebar__footer {
    padding: 8px 16px 12px;
  }

  .sidebar__user {
    gap: 8px;
    height: 44px;
    padding-inline-start: 4px;
    border-radius: 8px;
  }

  .sidebar__avatar {
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .sidebar__username {
    font: var(--body);
  }

  .sidebar__user .fa-ellipsis { font-size: 14px; }

  .sidebar__dropdown-item {
    gap: 8px;
    height: 44px;
    padding: 0 12px;
    font: var(--body);
    color: var(--system-primary);
  }

  .sidebar__dropdown-item i {
    flex: 0 0 24px;
    line-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    color: var(--system-primary);
  }
}

.account-item--current { cursor: default; opacity: 0.7; }
.account-avatar--muted { filter: grayscale(100%); }
.account-delete-btn {
  width: 28px; height: 28px; border-radius: 50%; border: none;
  background: transparent; color: var(--system-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.account-delete-btn:hover { background: var(--system-quinary); color: var(--danger); }
.list-empty { text-align: center; padding: 2rem; color: var(--system-secondary); }
.list-empty i { font-size: 2rem; margin-bottom: 0.5rem; display: block; }

/* ===== Tablet (484-767px): 侧边栏始终可见 ===== */
@media (min-width: 484px) and (max-width: 767px) {
  .sidebar-hamburger { display: none; }
}

/* ===== Desktop (≥768px): 侧边栏常驻 ===== */
@media (min-width: 768px) {
  .sidebar-hamburger { display: none; }
}
</style>
