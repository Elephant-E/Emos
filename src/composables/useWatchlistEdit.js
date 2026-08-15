import { reactive, ref } from 'vue'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'

/**
 * 片单编辑域：编辑信息/标签、维护者管理、排序、动态片单、可见性、清空/删除片单。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - detailState：共享片单详情状态
 *   - modals：共享模态框状态（editWatch/maintainer/sort/dynamic）
 *   - loadWatchlistInfo(watchId)：刷新片单信息
 *   - loadWatchVideos(reset)：刷新视频列表（清空后调用）
 */
export function useWatchlistEdit({ detailState, modals, loadWatchlistInfo, loadWatchVideos }) {
  // ================= 状态 =================
  // 编辑片单表单
  const editForm = reactive({
    id: null,
    name: '',
    description: '',
    carrot: 0,
    tags: [],
    isPublic: false,
    isShowEmpty: false,
    imagePosterUrl: ''  // 新 API：只使用 URL
  })

  const tagInput = ref('')

  // 维护者管理
  const maintainerState = reactive({
    currentMaintainers: [],
    newUserId: '',
    isLoading: false
  })

  // 片单排序
  const sortState = reactive({
    currentSort: 80
  })

  // ================= 编辑片单 =================

  const closeEditWatchModal = () => {
    modals.editWatch = false
    editForm.id = null
    editForm.name = ''
    editForm.description = ''
    editForm.carrot = 0
    editForm.tags = []
    editForm.isPublic = false
    editForm.isShowEmpty = false
    editForm.imagePosterUrl = ''
    tagInput.value = ''
  }

  // 打开编辑片单模态框
  const openEditModal = () => {
    editForm.id = detailState.id
    editForm.name = detailState.name
    editForm.description = detailState.description
    editForm.carrot = detailState.carrot
    editForm.tags = [...detailState.tags]
    editForm.isPublic = detailState.isPublic
    editForm.isShowEmpty = detailState.isShowEmpty
    editForm.imagePosterUrl = detailState.imagePosterUrl || ''  // 新 API：只使用 URL
    modals.editWatch = true
  }

  // 保存片单编辑
  const saveWatchlist = async () => {
    if (!editForm.name.trim()) {
      showToast('请输入片单名称', 'warning')
      return
    }

    try {
      const payload = {
        id: editForm.id,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        point: editForm.carrot ?? 0,
        tags: editForm.tags,
        is_public: editForm.isPublic,
        is_show_empty: editForm.isShowEmpty
      }

      if (editForm.imagePosterUrl) {
        payload.image_poster_url = editForm.imagePosterUrl  // 新 API：使用 URL
      }

      await watchlistApi.create(payload)

      showToast('片单已更新', 'success')
      modals.editWatch = false
      await loadWatchlistInfo(detailState.id)
    } catch (error) {
      console.error('更新片单失败:', error)
      showToast(error.message || '更新失败', 'error')
    }
  }

  // ================= 标签管理 =================

  const addTag = (event) => {
    if (event.key === 'Enter' && tagInput.value.trim()) {
      const tag = tagInput.value.trim()
      if (!editForm.tags.includes(tag)) {
        editForm.tags.push(tag)
      }
      tagInput.value = ''
    }
  }

  const removeTag = (tag) => {
    editForm.tags = editForm.tags.filter(t => t !== tag)
  }

  // ================= 维护者管理 =================

  const closeMaintainerModal = () => {
    modals.maintainer = false
    maintainerState.currentMaintainers = []
    maintainerState.newUserId = ''
  }

  // 打开维护者管理模态框
  const openMaintainerModal = () => {
    maintainerState.currentMaintainers = detailState.maintainers.map((maintainer) => ({ ...maintainer }))
    maintainerState.newUserId = ''
    maintainerState.isLoading = false
    modals.maintainer = true
  }

  // 添加维护者
  const addMaintainer = () => {
    const userId = maintainerState.newUserId.trim()
    if (!userId) {
      showToast('请输入用户ID', 'warning')
      return
    }

    const exists = maintainerState.currentMaintainers.some(m => m.user_id === userId)
    if (exists) {
      showToast('该用户已是维护者', 'warning')
      return
    }

    maintainerState.currentMaintainers.push({
      user_id: userId,
      username: userId,
      avatar: null
    })

    maintainerState.newUserId = ''
    showToast('已添加维护者', 'success')
  }

  // 移除维护者
  const removeMaintainer = (userId) => {
    maintainerState.currentMaintainers = maintainerState.currentMaintainers.filter(
      m => m.user_id !== userId
    )
    showToast('已移除维护者', 'success')
  }

  // 保存维护者
  const saveMaintainers = async () => {
    try {
      const maintainerIds = maintainerState.currentMaintainers.map(m => m.user_id)
      await watchlistApi.updateMaintainer(detailState.id, maintainerIds)

      showToast('维护者更新成功', 'success')
      modals.maintainer = false
      await loadWatchlistInfo(detailState.id)
    } catch (error) {
      console.error('更新维护者失败:', error)
      showToast(error.message || '更新失败', 'error')
    }
  }

  // ================= 排序 =================

  const closeSortModal = () => {
    modals.sort = false
    sortState.currentSort = 80
  }

  // 打开片单排序模态框
  const openSortModal = () => {
    sortState.currentSort = detailState.userSort ?? 80
    modals.sort = true
  }

  // 保存片单排序
  const saveSort = async () => {
    if (sortState.currentSort < 1 || sortState.currentSort > 100) {
      showToast('排序值必须在1-100之间', 'warning')
      return
    }

    try {
      await watchlistApi.updateSort(detailState.id, sortState.currentSort)

      showToast('片单排序更新成功', 'success')
      modals.sort = false
      await loadWatchlistInfo(detailState.id)
    } catch (error) {
      console.error('更新片单排序失败:', error)
      showToast(error.message || '更新失败', 'error')
    }
  }

  // ================= 动态片单 =================

  const closeDynamicModal = () => {
    modals.dynamic = false
  }

  // 打开动态片单设置模态框
  const openDynamicModal = () => {
    modals.dynamic = true
  }

  // 保存动态片单设置
  const saveDynamic = async () => {
    try {
      await watchlistApi.updateDynamic(detailState.id, detailState.dynamicUrl.trim())

      showToast(detailState.dynamicUrl ? '动态片单已启用' : '动态片单已关闭', 'success')
      modals.dynamic = false
      await loadWatchlistInfo(detailState.id)
    } catch (error) {
      console.error('设置动态片单失败:', error)
      showToast(error.message || '设置失败', 'error')
    }
  }

  // ================= 可见性/清空/删除 =================

  // 切换片单可见性
  const toggleSubscriptionVisibility = async () => {
    if (!detailState.id) return

    try {
      const response = await watchlistApi.toggleShow(detailState.id)
      detailState.userIsShow = response?.is_show ?? !detailState.userIsShow
      showToast(detailState.userIsShow ? '已显示订阅片单' : '已隐藏订阅片单', 'success')
      await loadWatchlistInfo(detailState.id)
    } catch (error) {
      console.error('切换片单可见性失败:', error)
      showToast(error.message || '操作失败', 'error')
    }
  }

  // 清空所有视频
  const clearAllVideos = async () => {
    if (!detailState.id) return
    if (!(await confirmDialog('确定要清空所有视频吗？', '确认', true))) return

    try {
      await watchlistApi.emptyVideos(detailState.id)
      showToast('已清空所有视频', 'success')
      await loadWatchVideos()
    } catch (error) {
      console.error('清空视频失败:', error)
      showToast(error.message || '清空失败', 'error')
    }
  }

  // 删除片单
  const deleteWatchlist = async () => {
    if (!detailState.id) return
    if (!(await confirmDialog('确定要删除该片单吗？此操作不可恢复！', '确认', true))) return

    try {
      await watchlistApi.delete(detailState.id)
      showToast('片单已删除', 'success')
      routerPushWatchlist()
    } catch (error) {
      console.error('删除片单失败:', error)
      showToast(error.message || '删除失败', 'error')
    }
  }

  // 删除片单后跳转（注入路由跳转，避免在 composable 里引 router）
  let routerPushWatchlist = () => {}

  const setRouterPushWatchlist = (fn) => {
    routerPushWatchlist = fn
  }

  return {
    editForm,
    tagInput,
    maintainerState,
    sortState,
    closeEditWatchModal,
    openEditModal,
    saveWatchlist,
    addTag,
    removeTag,
    closeMaintainerModal,
    openMaintainerModal,
    addMaintainer,
    removeMaintainer,
    saveMaintainers,
    closeSortModal,
    openSortModal,
    saveSort,
    closeDynamicModal,
    openDynamicModal,
    saveDynamic,
    toggleSubscriptionVisibility,
    clearAllVideos,
    deleteWatchlist,
    setRouterPushWatchlist,
  }
}