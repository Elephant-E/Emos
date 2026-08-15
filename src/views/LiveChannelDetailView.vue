<script setup>
import { ref, reactive, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import liveApi from '@/api/liveApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import ImageUploader from '@/components/ImageUploader.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const router = useRouter()
const route = useRoute()

// 组件名称（用于keep-alive）
defineOptions({
  name: 'LiveChannelDetailView'
})

// ================= 状态管理 =================
const detailState = reactive({
  id: null,
  title: '',
  description: '',
  tagline: '',
  imagePosterUrl: '',
  code: '',
  mediaCount: 0,
  isCanEdit: false,
  medias: [],
  searchQuery: '',
  isLoading: false
})

// 加载状态
const isLoadingInfo = ref(false)
const isLoadingMore = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const hasMoreMedias = ref(true)

// 搜索防抖定时器
let searchTimeout = null

// 模态框状态
const modals = reactive({
  addMedia: false,
  editChannel: false
})

// 添加直播源表单（支持批量）
const mediaFormList = ref([
  { name: '', pathUrl: '', pathType: 'm3u8' }
])

const isSavingMedia = ref(false)

// 编辑频道表单
const editChannelForm = reactive({
  id: null,
  title: '',
  description: '',
  tagline: '',
  imagePosterUrl: ''  // 新 API：使用 URL
})

const isSubmittingChannel = ref(false)

const closeAddMediaModal = () => {
  modals.addMedia = false
  mediaFormList.value = [{ name: '', pathUrl: '', pathType: 'm3u8' }]
}

const closeEditChannelModal = () => {
  modals.editChannel = false
  editChannelForm.id = null
  editChannelForm.title = ''
  editChannelForm.description = ''
  editChannelForm.tagline = ''
  editChannelForm.imagePosterUrl = ''
}

// ================= 生命周期 =================
onMounted(() => {
  const channelId = route.params.id
  if (channelId) {
    detailState.id = channelId
    loadChannelInfo(channelId)
    loadChannelMedias()
    window.addEventListener('scroll', handleDetailScroll)
  } else {
    showToast('无效的频道ID', 'error')
    // 如果有历史记录，返回上一页；否则跳转到媒体页面
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/media')
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleDetailScroll)
})

// keep-alive 激活时刷新数据
onActivated(() => {
  window.addEventListener('scroll', handleDetailScroll)
  // 如果路由参数变化，重新加载
  const channelId = route.params.id
  if (channelId && channelId !== detailState.id) {
    detailState.id = channelId
    loadChannelInfo(channelId)
    loadChannelMedias()
  }
})

onDeactivated(() => {
  window.removeEventListener('scroll', handleDetailScroll)
})

// ================= 方法 =================

const applyChannelDetail = (channel = {}) => {
  detailState.title = channel.title || ''
  detailState.description = channel.description || ''
  detailState.tagline = channel.tagline || ''
  detailState.imagePosterUrl = channel.image_poster_url || ''
  detailState.code = channel.code || ''
  detailState.mediaCount = channel.media_count || 0
  detailState.isCanEdit = channel.is_can_edit === true
}

// 加载频道基本信息
const loadChannelInfo = async (channelId) => {
  isLoadingInfo.value = true
  try {
    const response = await liveApi.getChannelList({ id: channelId })
    
    // API 返回的可能是数组或直接对象
    let channel
    if (Array.isArray(response)) {
      channel = response[0]
    } else if (response && response.items && Array.isArray(response.items)) {
      // 如果返回的是分页格式 { items: [...] }
      channel = response.items[0]
    } else {
      channel = response
    }
    
    if (!channel) {
      throw new Error('频道不存在或无权访问')
    }

    applyChannelDetail(channel)
  } catch (error) {
    console.error('加载频道信息失败:', error)
    showToast(error.message || '加载失败', 'error')
    // 如果有历史记录，返回上一页；否则跳转到媒体页面
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/media')
    }
  } finally {
    isLoadingInfo.value = false
  }
}

const handleDetailScroll = () => {
  if (detailState.isLoading || isLoadingMore.value || !hasMoreMedias.value) return

  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  if (scrollTop + windowHeight >= documentHeight - 240) {
    loadChannelMedias(false)
  }
}

// 加载频道资源列表
const loadChannelMedias = async (reset = true) => {
  if (!detailState.id) return
  
  if (reset) {
    detailState.isLoading = true
    currentPage.value = 1
    hasMoreMedias.value = true
  } else {
    if (!hasMoreMedias.value) return
    isLoadingMore.value = true
  }

  try {
    const response = await liveApi.getMediaList({
      live_list_id: detailState.id,
      page: currentPage.value,
      page_size: pageSize.value,
      name: detailState.searchQuery.trim() || undefined
    })
    
    const items = response.items || []
    const total = response.total ?? items.length

    if (reset) {
      detailState.medias = items
    } else {
      detailState.medias = [...detailState.medias, ...items]
    }

    detailState.mediaCount = total
    hasMoreMedias.value = detailState.medias.length < total && items.length > 0

    if (hasMoreMedias.value) {
      currentPage.value += 1
    }
  } catch (error) {
    console.error('加载频道资源失败:', error)
    showToast(error.message || '加载失败', 'error')
  } finally {
    if (reset) {
      detailState.isLoading = false
    } else {
      isLoadingMore.value = false
    }
  }
}

// 返回频道列表
const backToList = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push('/media')
}

// 处理搜索输入（防抖）
const handleSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadChannelMedias(true)
  }, 300)
}

// 打开添加直播源模态框
const openAddMediaModal = () => {
  // 重置为一个空表单行
  mediaFormList.value = [
    { name: '', pathUrl: '', pathType: 'm3u8' }
  ]
  modals.addMedia = true
}

// 添加新的表单行
const addMediaRow = () => {
  mediaFormList.value.push({ name: '', pathUrl: '', pathType: 'm3u8' })
}

// 删除表单行
const removeMediaRow = (index) => {
  if (mediaFormList.value.length > 1) {
    mediaFormList.value.splice(index, 1)
  } else {
    showToast('至少保留一个表单行', 'warning')
  }
}

// 保存直播源（使用批量更新 API）
const saveMedia = async () => {
  if (isSavingMedia.value) return
  
  // 验证所有表单行
  for (let i = 0; i < mediaFormList.value.length; i++) {
    const row = mediaFormList.value[i]
    if (!row.name.trim()) {
      showToast(`第 ${i + 1} 行的直播源名称不能为空`, 'warning')
      return
    }
    if (!row.pathUrl.trim()) {
      showToast(`第 ${i + 1} 行的直播源地址不能为空`, 'warning')
      return
    }
  }
  
  isSavingMedia.value = true
  
  try {
    // 构建批量提交数据
    const medias = mediaFormList.value
      .filter(row => row.name.trim() && row.pathUrl.trim())
      .map(row => ({
        name: row.name.trim(),
        path_type: row.pathType,
        path_url: row.pathUrl.trim()
      }))
    
    if (medias.length === 0) {
      showToast('请至少填写一个有效的直播源', 'warning')
      return
    }
    
    // 使用批量更新 API 添加直播源
    await liveApi.updateMediaBatch({
      live_list_id: detailState.id,
      medias: medias
    })
    
    showToast(`成功添加 ${medias.length} 个直播源`, 'success')
    modals.addMedia = false
    await loadChannelMedias(true)
  } catch (error) {
    console.error('添加直播源失败:', error)
    showToast(error.message || '添加失败', 'error')
  } finally {
    isSavingMedia.value = false
  }
}

// 删除直播源
const deleteMedia = async (mediaId) => {
  if (!(await confirmDialog('确定要删除该直播源吗？', '确认', true))) return

  try {
    await liveApi.deleteMedia(mediaId)
    showToast('直播源已删除', 'success')
    await loadChannelMedias(true)
  } catch (error) {
    console.error('删除直播源失败:', error)
    showToast(error.message || '删除失败', 'error')
  }
}

// 删除频道
const deleteChannel = async () => {
  if (!detailState.id) return
  if (!(await confirmDialog('确定要删除该频道吗？此操作不可恢复！', '确认', true))) return

  try {
    await liveApi.deleteChannel(detailState.id)
    showToast('频道已删除', 'success')
    router.push('/media')
  } catch (error) {
    console.error('删除频道失败:', error)
    showToast(error.message || '删除失败', 'error')
  }
}

// 打开编辑频道模态框
const openEditChannelModal = () => {
  editChannelForm.id = detailState.id
  editChannelForm.title = detailState.title
  editChannelForm.description = detailState.description || ''
  editChannelForm.tagline = detailState.tagline || ''
  // 默认显示当前频道的封面图片
  editChannelForm.imagePosterUrl = detailState.imagePosterUrl || ''  // 新 API：使用 URL
  isSubmittingChannel.value = false
  modals.editChannel = true
}

// 保存编辑频道
const saveEditChannel = async () => {
  if (!editChannelForm.title.trim()) {
    showToast('请输入频道标题', 'warning')
    return
  }
  
  isSubmittingChannel.value = true
  
  try {
    const requestData = {
      id: editChannelForm.id,
      title: editChannelForm.title.trim(),
      description: editChannelForm.description.trim() || null,
      tagline: editChannelForm.tagline.trim() || null
    }
    
    // 如果有上传图片，添加到请求中
    if (editChannelForm.imagePosterUrl) {
      requestData.image_poster_url = editChannelForm.imagePosterUrl  // 新 API：使用 URL
    }
    
    await liveApi.createOrUpdateChannel(requestData)
    
    showToast('频道信息已更新', 'success')
    modals.editChannel = false
    
    // 重新加载频道信息
    await loadChannelInfo(detailState.id)
  } catch (error) {
    console.error('更新频道失败:', error)
    showToast(error.message || '更新失败', 'error')
  } finally {
    isSubmittingChannel.value = false
  }
}
</script>

<template>
  <div class="watchlist-detail-view">
    <!-- 第一行：左侧返回 + 右侧操作按钮组 -->
    <div class="detail-header-row">
      <div class="cloud-buttons">
        <button class="cloud-btn" @click="backToList" title="返回">
          <i class="fas fa-arrow-left"></i>
        </button>
      </div>
      <div class="detail-actions-group">
        <div v-if="detailState.isCanEdit" class="cloud-buttons">
          <button class="cloud-btn" @click="openEditChannelModal" title="编辑频道">
            <i class="fas fa-edit"></i>
          </button>
          <button class="cloud-btn cloud-btn--danger" @click="deleteChannel" title="删除频道">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <div class="cloud-buttons">
          <button class="cloud-btn" @click="openAddMediaModal" title="添加直播源">
            <i class="fas fa-plus-circle"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 第二行：左侧标题 + 右侧资源数 -->
    <div class="detail-title-row">
      <h1 class="detail-title">{{ detailState.title }}</h1>
      <span class="video-count-badge">
        <i class="fas fa-tv"></i> {{ detailState.mediaCount }}
      </span>
    </div>

    <!-- 简介 -->
    <div v-if="detailState.description" class="detail-description">
      {{ detailState.description }}
    </div>

    <!-- 搜索框 -->
    <div class="search-container" style="max-width: none; margin-left: 0; margin-bottom: 1.5rem;">
      <i class="fas fa-search search-icon"></i>
      <input 
        type="text" 
        class="search-input" 
        v-model="detailState.searchQuery"
        @input="handleSearchInput"
        placeholder="搜索直播源..."
      >
    </div>

    <!-- 初次加载骨架 -->
    <div v-if="detailState.isLoading" class="video-list">
      <div
        v-for="i in 6"
        :key="`skeleton-${i}`"
        class="video-item"
      >
        <div class="video-info">
          <div class="skeleton-text" style="width: 60%; height: 18px; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 80%;"></div>
        </div>
        <div class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="detailState.medias.length === 0" class="list-empty">
      <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.8rem;"></i>
      <p>暂无直播源</p>
    </div>

    <!-- 直播源列表 -->
    <div v-else class="video-list">
      <div 
        v-for="media in detailState.medias" 
        :key="media.media_id || media.id"
        class="video-item"
      >
        <div class="video-info">
          <div class="video-title">{{ media.name }}</div>
          <div class="list-item-desc">
            <span v-if="media.path_type">{{ media.path_type }}</span>
            <span v-if="media.status" :class="['status-badge', media.status]">
              {{ media.status === 'normal' ? '正常' : '错误' }}
            </span>
            <span v-if="media.pseudonym">{{ media.pseudonym }}</span>
          </div>
        </div>
        <div v-if="media.is_can_edit" class="video-actions" @click.stop>
          <div class="cloud-buttons">
            <button class="cloud-btn cloud-btn--sm cloud-btn--danger" @click="deleteMedia(media.media_id || media.id)" title="删除直播源">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 加载更多骨架屏 -->
      <div
        v-if="isLoadingMore"
        v-for="i in Math.min(pageSize, Math.max(detailState.mediaCount - detailState.medias.length, 1))"
        :key="`loading-more-${i}`"
        class="video-item"
      >
        <div class="video-info">
          <div class="skeleton-text" style="width: 60%; height: 18px; margin-bottom: 10px;"></div>
          <div class="skeleton-text-sm" style="width: 80%;"></div>
        </div>
        <div class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 添加直播源模态框 -->
    <BaseModal :visible="modals.addMedia" title="批量添加直播源" @close="closeAddMediaModal">
      <div 
        v-for="(row, index) in mediaFormList" 
        :key="index"
        class="media-form-row"
      >
        <div class="form-row-header">
          <span class="form-row-title">直播源 {{ index + 1 }}</span>
          <button 
            v-if="mediaFormList.length > 1"
            class="modal-close modal-close--sm"
            @click="removeMediaRow(index)"
            title="删除此行"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        
        <div class="form-group">
          <label class="form-label">名称</label>
          <input type="text" class="modal-input" v-model="row.name" placeholder="例如：1080p、720p">
        </div>

        <div class="form-group">
          <label class="form-label">地址</label>
          <input type="text" class="modal-input" v-model="row.pathUrl" placeholder="http://example.com/stream.m3u8">
        </div>

        <div class="form-group">
          <label class="form-label">类型</label>
          <select class="modal-input" v-model="row.pathType">
            <option value="m3u8">M3U8</option>
            <option value="mp4">MP4</option>
            <option value="rtmp">RTMP</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      <button class="btn-subtle" @click="addMediaRow" style="width: 100%; border-radius: 12px; height: auto; padding: 10px;">
        <i class="fas fa-plus"></i>
        <span>添加更多直播源</span>
      </button>
      <template #footer>
        <button class="modal-btn secondary" @click="closeAddMediaModal">取消</button>
        <button class="modal-btn primary" @click="saveMedia" :disabled="isSavingMedia">
          <i v-if="isSavingMedia" class="fas fa-circle-notch fa-spin"></i>
          <span v-else>批量添加 ({{ mediaFormList.filter(r => r.name && r.pathUrl).length }})</span>
        </button>
      </template>
    </BaseModal>

    <!-- 编辑频道模态框 -->
    <BaseModal :visible="modals.editChannel" title="编辑频道" @close="closeEditChannelModal">
      <div class="form-group">
        <label class="form-label">频道标题</label>
        <input 
          v-model="editChannelForm.title" 
          class="modal-input" 
          type="text" 
          placeholder="请输入频道标题" 
        />
      </div>

      <div class="form-group">
        <label class="form-label">宣传词</label>
        <input 
          v-model="editChannelForm.tagline" 
          class="modal-input" 
          type="text" 
          placeholder="请输入宣传词（可选）" 
        />
      </div>

      <div class="form-group">
        <label class="form-label">简介</label>
        <textarea 
          v-model="editChannelForm.description" 
          class="modal-input modal-textarea" 
          placeholder="请输入频道简介（可选）" 
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">封面图片</label>
        <ImageUploader
          :model-value="editChannelForm.imagePosterUrl"
          @change="(data) => { editChannelForm.imagePosterUrl = data.url || '' }"
          :max-size="5 * 1024 * 1024"
          placeholder-text="点击上传封面"
          hint-text="支持 JPG、PNG，≤5MB"
        />
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="closeEditChannelModal">
          取消
        </button>
        <button 
          class="modal-btn primary" 
          @click="saveEditChannel"
          :disabled="isSubmittingChannel"
        >
          <i v-if="isSubmittingChannel" class="fas fa-circle-notch fa-spin"></i>
          <span v-else>保存</span>
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.detail-description {
  font: var(--callout);
  color: var(--system-tertiary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  padding: 0 20px;
}

.list-item-desc {
  display: flex;
  align-items: center;
  gap: 8px;
  font: var(--footnote);
  color: var(--system-secondary);
  margin-top: 4px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font: var(--footnote);
}

.status-badge.normal {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}

.status-badge.error {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.media-form-row {
  padding: 16px;
  margin-bottom: 16px;
  background: var(--system-quaternary);
  border-radius: 12px;
}

.media-form-row:last-child {
  margin-bottom: 12px;
}

.form-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.form-row-title {
  font: var(--callout-emphasized);
  color: var(--system-primary);
}

@media (max-width: 768px) {
  .detail-tagline,
  .detail-description {
    padding: 0 12px;
  }
}
</style>
