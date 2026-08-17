import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.js'
import seekApi from '@/api/seekApi.js'
import { formatDate } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll.js'

/**
 * 求片列表域：列表加载/分页、搜索、排序、认领、滚动加载、生命周期监听。
 * 与原实现行为保持一致。
 */
export function useSeekList() {
  const router = useRouter()
  const appStore = useAppStore()

  // ================= 状态 =================
  const loading = ref(false)
  const loadingMore = ref(false)
  const currentPage = ref(1)
  const hasMore = ref(true)
  const seekList = ref([])
  const claiming = reactive({}) // 认领状态

  const selectedStatus = ref('default')
  const currentSort = ref('updated_at')
  const currentOrder = ref('desc')
  const isUploadSelf = ref(false)
  const searchQuery = ref('')

  const statusTabs = computed(() => [
    { value: 'default', label: '待认领' },
    { value: 'upload', label: '已认领' },
    { value: 'complete', label: '已完结' }
  ])

  // ================= 排序菜单 =================
  const showSortMenu = ref(false)
  const sortBtnRef = ref(null)
  const sortMenuStyle = ref({})

  const toggleSortMenu = () => {
    showSortMenu.value = !showSortMenu.value
    if (showSortMenu.value && sortBtnRef.value) {
      const rect = sortBtnRef.value.getBoundingClientRect()
      sortMenuStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 6}px`,
        right: `${window.innerWidth - rect.right}px`
      }
    }
  }

  const sortList = [
    { field: 'updated_at', label: '最近更新', icon: 'fa-clock' },
    { field: 'created_at', label: '发布时间', icon: 'fa-calendar' },
    { field: 'carrot', label: '胡萝卜数', icon: 'fa-carrot' }
  ]

  let debounceTimer = null

  // ================= 工具函数 =================

  const getTmdbUrl = (item) => {
    if (!item?.tmdb_id) return null
    return `https://www.themoviedb.org/${item.media_type || 'movie'}/${item.tmdb_id}`
  }

  const getStatusText = (status) => {
    const map = {
      default: '待认领',
      upload: '已认领',
      complete: '已完结'
    }
    return map[status] || status || '未知'
  }

  const getRemainingTime = (expiredAt) => {
    if (!expiredAt) return ''
    const now = Date.now()
    const target = new Date(expiredAt).getTime()
    const diff = target - now
    if (diff <= 0) return '已过期'
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}天${hours % 24}小时`
    return `${hours}小时${Math.floor((diff % 3600000) / 60000)}分`
  }

  const copyId = async (id) => {
    try {
      await navigator.clipboard.writeText(String(id))
      showToast('已复制ID', 'success')
    } catch (error) {
      showToast('复制失败', 'error')
    }
  }

  const goToDetail = (item) => {
    // 求片接口的 item 没有视频表 id（video_id），视频可能尚未入库；
    // 锚点是 video_list_id（vl- 域 id，即 todb_id），
    // 剧集求片的 video_list_id 始终为整剧 id，统一跳整剧详情页。
    // 详情页 getNumericId 原生支持 vl- 前缀解析，无需转换。
    if (!item.video_list_id) {
      showToast('该求片暂无视频信息', 'info')
      return
    }
    router.push(`/media/vl-${item.video_list_id}`)
  }

  const getEmptyMessage = () => {
    const base = {
      default: '暂时没有待认领的求片',
      upload: '还没有认领的求片',
      complete: '还没有已完结的求片'
    }
    return base[selectedStatus.value] || '暂无求片'
  }

  // ================= 数据加载 =================

  const loadSeeks = async (reset = false) => {
    if (loading.value || loadingMore.value) return
    if (!hasMore.value && !reset) return

    if (reset) {
      currentPage.value = 1
      hasMore.value = true
      seekList.value = []
      loading.value = true
    } else {
      loadingMore.value = true
    }

    try {
      const response = await seekApi.create({
        page: currentPage.value,
        page_size: 20,
        video_type: null,
        sort_by: currentSort.value,
        sort_order: currentOrder.value,
        status: [selectedStatus.value],
        upload_self: isUploadSelf.value,
        video_title: searchQuery.value || null,
        with_user: true
      })

      // axios 拦截器已解包，response 直接就是 { page, page_size, total, items }
      const data = response.items || []

      if (reset) {
        seekList.value = data
      } else {
        seekList.value = [...seekList.value, ...data]
      }

      // 判断是否还有更多数据
      const total = response.total || 0
      const currentPageNum = response.page || currentPage.value
      const pageSize = response.page_size || 20
      hasMore.value = (currentPageNum * pageSize) < total

      if (hasMore.value) {
        currentPage.value++
      }
    } catch (error) {
      console.error('加载求片列表失败:', error)
      showToast('加载失败，请重试', 'error')
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  // 重置并重新加载
  const resetAndLoad = () => {
    loadSeeks(true)
  }

  // 搜索输入（防抖）
  const handleSearchInput = () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      resetAndLoad()
    }, 400)
  }

  // 排序切换
  const handleSortChange = (field) => {
    if (currentSort.value === field) {
      currentOrder.value = currentOrder.value === 'desc' ? 'asc' : 'desc'
    } else {
      currentSort.value = field
      currentOrder.value = 'desc'
    }
    resetAndLoad()
  }

  // ================= 认领 =================

  // 认领/取消认领
  const handleClaim = async (seekId, currentStatus) => {
    claiming[seekId] = true

    try {
      // 根据当前状态决定操作类型
      const type = currentStatus === 'upload' ? 'cancel' : 'confirm'
      const actionText = type === 'confirm' ? '认领' : '取消认领'

      const response = await seekApi.claim(seekId, type)

      showToast(`${actionText}成功！`, 'success')

      // 更新本地数据
      const item = seekList.value.find(s => s.id === seekId)
      if (item) {
        item.status = response.status || (type === 'confirm' ? 'upload' : 'default')
        item.upload_username = type === 'confirm' ? '我' : null
      }

      setTimeout(() => resetAndLoad(), 500)
    } catch (error) {
      console.error('操作失败:', error)
      const type = currentStatus === 'upload' ? 'cancel' : 'confirm'
      const actionText = type === 'confirm' ? '认领' : '取消认领'
      showToast(error.message || `${actionText}失败`, 'error')
    } finally {
      delete claiming[seekId]
    }
  }

  // ================= 滚动加载 =================

  useInfiniteScroll({
    loadMore: () => loadSeeks(false),
    shouldLoad: () => !loading.value && !loadingMore.value && hasMore.value,
    threshold: 300,
  })

  // ================= 生命周期 =================

  onMounted(() => {
    // 首次挂载时加载数据
    loadSeeks(true)
  })

  // 监听账号切换，重新加载求片列表
  watch(() => appStore.userInfo, (newUserInfo) => {
    if (newUserInfo) {
      loadSeeks(true)
    }
  }, { immediate: false })

  // 监听"我认领的"切换，重新加载数据
  watch(isUploadSelf, () => {
    loadSeeks(true)
  })

  watch(selectedStatus, () => {
    loadSeeks(true)
  })

  // 组件卸载时清理防抖定时器
  onUnmounted(() => {
    clearTimeout(debounceTimer)
  })

  return {
    loading,
    loadingMore,
    currentPage,
    hasMore,
    seekList,
    claiming,
    selectedStatus,
    currentSort,
    currentOrder,
    isUploadSelf,
    searchQuery,
    statusTabs,
    showSortMenu,
    sortBtnRef,
    sortMenuStyle,
    toggleSortMenu,
    sortList,
    getTmdbUrl,
    getStatusText,
    getRemainingTime,
    copyId,
    goToDetail,
    getEmptyMessage,
    loadSeeks,
    resetAndLoad,
    handleSearchInput,
    handleSortChange,
    handleClaim,
  }
}