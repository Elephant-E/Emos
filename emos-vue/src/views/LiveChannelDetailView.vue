<script setup>
import { ref, reactive, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import liveApi from '@/api/liveApi.js'
import { showToast } from '@/utils/toast.js'
import ImageUploader from '@/components/ImageUploader.vue'

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
  imagePoster: ''
})

const isSubmittingChannel = ref(false)

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
    router.back()
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
  detailState.isCanEdit = Boolean(channel.is_can_edit)
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
    router.back()
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
  if (!confirm('确定要删除该直播源吗？')) return

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
  if (!confirm('确定要删除该频道吗？此操作不可恢复！')) return

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
  editChannelForm.imagePoster = detailState.imagePosterUrl || ''
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
    if (editChannelForm.imagePoster) {
      requestData.image_poster = editChannelForm.imagePoster
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
      <button class="operation-btn back-btn" @click="backToList" title="返回">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div v-if="detailState.isCanEdit" class="detail-actions-group">
        <!-- 编辑频道 -->
        <button 
          class="operation-btn" 
          @click="openEditChannelModal" 
          title="编辑频道"
        >
          <i class="fas fa-edit"></i>
        </button>
        
        <!-- 添加直播源 -->
        <button 
          class="operation-btn" 
          @click="openAddMediaModal" 
          title="添加直播源"
        >
          <i class="fas fa-plus-circle"></i>
        </button>
        
        <!-- 删除频道 -->
        <button 
          class="operation-btn danger" 
          @click="deleteChannel" 
          title="删除频道"
        >
          <i class="fas fa-trash-alt"></i>
        </button>
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
    <div class="search-container">
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
        <div v-if="detailState.isCanEdit" class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="detailState.medias.length === 0" class="empty-state">
      <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.8rem; opacity: 0.4;"></i>
      <div style="font-size: 1rem; font-weight: 500;">暂无直播源</div>
      <div v-if="detailState.isCanEdit" style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 0.3rem;">点击右上角「+」按钮添加直播源</div>
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
          <button 
            class="operation-btn delete" 
            @click="deleteMedia(media.media_id || media.id)"
            title="删除直播源"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
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
        <div v-if="detailState.isCanEdit" class="video-actions">
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
          <div class="skeleton-circle" style="width: 38px; height: 38px;"></div>
        </div>
      </div>
    </div>

    <!-- 添加直播源模态框 -->
    <div 
      :class="['modal-overlay', { show: modals.addMedia }]"
      @click.self="modals.addMedia = false"
    >
      <div class="modal-content lg">
        <div class="modal-header">
          <span class="modal-title">批量添加直播源</span>
          <button class="modal-close" @click="modals.addMedia = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- 动态表单行列表 -->
          <div 
            v-for="(row, index) in mediaFormList" 
            :key="index"
            class="media-form-row"
          >
            <div class="form-row-header">
              <span class="form-row-title">直播源 {{ index + 1 }}</span>
              <button 
                v-if="mediaFormList.length > 1"
                class="remove-row-btn"
                @click="removeMediaRow(index)"
                title="删除此行"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <div class="form-group">
              <label class="form-label">名称</label>
              <input 
                type="text" 
                class="modal-input" 
                v-model="row.name"
                placeholder="例如：1080p、720p"
              >
            </div>

            <div class="form-group">
              <label class="form-label">地址</label>
              <input 
                type="text" 
                class="modal-input" 
                v-model="row.pathUrl"
                placeholder="http://example.com/stream.m3u8"
              >
            </div>

            <div class="form-group">
              <label class="form-label">类型</label>
              <select 
                class="modal-input" 
                v-model="row.pathType"
              >
                <option value="m3u8">M3U8</option>
                <option value="mp4">MP4</option>
                <option value="rtmp">RTMP</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>

          <!-- 添加更多按钮 -->
          <button 
            class="add-row-btn"
            @click="addMediaRow"
          >
            <i class="fas fa-plus-circle"></i>
            <span>添加更多直播源</span>
          </button>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="modals.addMedia = false">取消</button>
          <button class="modal-btn primary" @click="saveMedia" :disabled="isSavingMedia">
            <span v-if="!isSavingMedia">批量添加 ({{ mediaFormList.filter(r => r.name && r.pathUrl).length }})</span>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑频道模态框 -->
    <div 
      :class="['modal-overlay', { show: modals.editChannel }]"
      @click.self="modals.editChannel = false"
    >
      <div class="modal-content lg">
        <div class="modal-header">
          <span class="modal-title">编辑频道</span>
          <button class="modal-close" @click="modals.editChannel = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- 频道标题 -->
          <div class="form-group">
            <label class="form-label">频道标题</label>
            <input 
              v-model="editChannelForm.title" 
              class="modal-input" 
              type="text" 
              placeholder="请输入频道标题" 
            />
          </div>

          <!-- 宣传词 -->
          <div class="form-group">
            <label class="form-label">宣传词</label>
            <input 
              v-model="editChannelForm.tagline" 
              class="modal-input" 
              type="text" 
              placeholder="请输入宣传词（可选）" 
            />
          </div>

          <!-- 简介 -->
          <div class="form-group">
            <label class="form-label">简介</label>
            <textarea 
              v-model="editChannelForm.description" 
              class="modal-textarea" 
              placeholder="请输入频道简介（可选）" 
              rows="3"
            ></textarea>
          </div>

          <!-- 封面图片上传 -->
          <div class="form-group">
            <label class="form-label">封面图片</label>
            <ImageUploader
              :model-value="editChannelForm.imagePoster"
              @update:model-value="(val) => editChannelForm.imagePoster = val"
              :max-size="5 * 1024 * 1024"
              placeholder-text="点击上传封面"
              hint-text="支持 JPG、PNG，≤5MB"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="modals.editChannel = false">
            取消
          </button>
          <button 
            class="modal-btn primary" 
            @click="saveEditChannel"
            :disabled="isSubmittingChannel"
          >
            <span v-if="!isSubmittingChannel">保存</span>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 继承全局样式 */

.detail-description {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  padding: 0 20px;
}

/* 列表项描述 - 显示多个标签 */
.list-item-desc {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 状态徽章 */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.normal {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}

.status-badge.error {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

/* 批量表单行容器 */
.media-form-row {
  padding: 16px;
  margin-bottom: 16px;
  background: var(--bg-input);
  border-radius: 12px;
  border: 1px solid var(--border);
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
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.remove-row-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-row-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: var(--danger);
}

/* 添加更多按钮 */
.add-row-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed var(--border);
  background: transparent;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.add-row-btn:hover {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.05);
}

.add-row-btn i {
  font-size: 1.1rem;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .detail-tagline,
  .detail-description {
    padding: 0 12px;
  }
}
</style>
