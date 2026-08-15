import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { userApi } from '@/api/userApi.js'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import { STORAGE_KEYS } from '@/utils/storage.js'

/**
 * 账号设置核心域：用户信息加载、通用设置开关、Token/Telegram/片单兑换。
 * 与原实现行为保持一致。
 */
export function useAccountSettings() {
  const appStore = useAppStore()

  // 从 Store 获取用户信息（响应式）
  const userInfo = computed(() => appStore.userInfo)
  const isLoading = ref(true)

  // 判断是否为管理员
  const isAdmin = computed(() => {
    return userInfo.value?.roles?.includes('admin') || false
  })

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

  return {
    userInfo,
    isLoading,
    isAdmin,
    loadUserInfo,
    resetToken,
    handleTelegramAction,
    toggleShowEmpty,
    toggleHdPoster,
    exchangeWatch,
  }
}