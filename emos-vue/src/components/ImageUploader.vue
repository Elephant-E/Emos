<template>
  <div class="image-uploader">
    <!-- 上传区域 -->
    <div 
      class="upload-area"
      :class="{ 'has-image': previewUrl, 'uploading': uploading }"
      @click="handleAreaClick"
    >
      <!-- 预览模式 -->
      <div v-if="previewUrl" class="image-preview">
        <img :src="previewUrl" alt="图片预览" loading="lazy">
        
        <!-- 删除按钮 -->
        <button 
          v-if="!disabled && !uploading"
          class="delete-btn"
          @click.stop="handleDelete"
          title="删除图片"
        >
          <i class="fas fa-times"></i>
        </button>
        
        <!-- 上传中遮罩 -->
        <div v-if="uploading" class="uploading-overlay">
          <i class="fas fa-spinner fa-spin"></i>
          <span>{{ uploadText || '上传中...' }}</span>
        </div>
      </div>
      
      <!-- 占位符模式 -->
      <div v-else class="placeholder">
        <i class="fas fa-images"></i>
        <div class="placeholder-text">{{ placeholderText || '点击选择图片' }}</div>
        <div class="placeholder-hint">{{ hintText || '从已上传图片中选择或上传新图片' }}</div>
      </div>
    </div>
    
    <!-- 隐藏的文件输入 -->
    <input 
      ref="fileInput"
      type="file" 
      accept="image/*" 
      style="display:none;"
      @change="handleFileChange"
      :disabled="disabled || uploading"
    >
  </div>
  
  <!-- 图片选择模态框 - 使用 Teleport 挂载到 body -->
  <Teleport to="body">
    <div 
      :class="['modal-overlay', { show: showSelector }]"
      @click.self="closeSelector"
    >
      <div class="modal-content image-selector-content">
        <div class="modal-header">
          <span class="modal-title">选择图片</span>
          <button class="modal-close" @click="closeSelector">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body" @scroll="handleScroll">
          <!-- 搜索框 -->
          <div class="selector-search">
            <i class="fas fa-search search-icon"></i>
            <input 
              type="text" 
              v-model="searchQuery"
              @input="handleSearch"
              placeholder="搜索图片名称..."
              class="modal-input"
            />
          </div>
          
          <!-- 初始加载骨架屏 -->
          <div v-if="loading && imageList.length === 0" class="image-grid">
            <div 
              v-for="i in 12" 
              :key="'skeleton-' + i"
              class="image-item skeleton-item"
            >
              <div class="skeleton-image"></div>
              <div class="skeleton-info">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line shorter"></div>
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="!loading && imageList.length === 0" class="empty-state">
            <div class="empty-text">暂无图片</div>
          </div>
          
          <!-- 图片网格 -->
          <div v-else class="image-grid">
            <div 
              v-for="img in imageList" 
              :key="img.file_id"
              class="image-item"
              :class="{ selected: selectedImageId === img.file_id }"
              @click="selectImage(img)"
            >
              <img :src="img.url" :alt="img.file_name" loading="lazy">
              <div class="image-info">
                <div class="image-name">{{ img.file_name }}</div>
                <div class="image-meta">
                  <span>{{ formatFileSize(img.file_size) }}</span>
                  <span>{{ formatDate(img.created_at) }}</span>
                </div>
              </div>
              <div v-if="selectedImageId === img.file_id" class="selected-badge">
                <i class="fas fa-check"></i>
              </div>
              
              <!-- 删除按钮 - 仅在选择器中显示 -->
              <button 
                class="image-delete-btn"
                @click.stop="deleteImageFromServer(img.file_id)"
                title="删除图片"
              >
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
            
            <!-- 加载更多骨架屏 -->
            <template v-if="loadingMore">
              <div 
                v-for="i in getLoadingCount()" 
                :key="'loading-more-' + i"
                class="image-item skeleton-item"
              >
                <div class="skeleton-image"></div>
                <div class="skeleton-info">
                  <div class="skeleton-line short"></div>
                  <div class="skeleton-line shorter"></div>
                </div>
              </div>
            </template>
          </div>
        </div>
        
        <div class="modal-footer selector-footer">
          <button class="modal-btn secondary" @click="triggerUpload">
            <i class="fas fa-cloud-upload-alt"></i>
            <span>上传新图片</span>
          </button>
          <button 
            class="modal-btn primary" 
            :disabled="!selectedImageId"
            @click="confirmSelection"
          >
            <i class="fas fa-check"></i>
            <span>确认选择</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/api/index.js'
import uploadApi from '@/api/uploadApi.js'
import { formatDate, formatFileSize } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'

const props = defineProps({
  // 初始图片URL或file_id
  modelValue: {
    type: String,
    default: ''
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 最大文件大小（字节），默认5MB
  maxSize: {
    type: Number,
    default: 5 * 1024 * 1024
  },
  // 存储位置
  fileStorage: {
    type: String,
    default: 'default'
  },
  // 自定义提示文本
  placeholderText: {
    type: String,
    default: ''
  },
  hintText: {
    type: String,
    default: ''
  },
  uploadText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'upload-start', 'upload-success', 'upload-error'])

// 状态
const fileInput = ref(null)
const previewUrl = ref('')
const uploading = ref(false)
const fileId = ref('')

// 图片选择器状态
const showSelector = ref(false)
const imageList = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const searchQuery = ref('')
const selectedImageId = ref('')
const currentPage = ref(1)
const pageSize = ref(15)
const hasMore = ref(true)
let searchTimeout = null

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal && !previewUrl.value) {
    // 如果是URL，直接显示
    if (newVal.startsWith('http')) {
      previewUrl.value = newVal
    }
    // 现在直接使用 URL，不再处理 file_id
  } else if (!newVal) {
    previewUrl.value = ''
    fileId.value = ''
  }
}, { immediate: true })

// 点击上传区域
const handleAreaClick = () => {
  if (props.disabled || uploading.value) return
  // 打开图片选择器
  openSelector()
}

// 打开图片选择器
const openSelector = async () => {
  showSelector.value = true
  selectedImageId.value = fileId.value || ''
  
  // 每次打开都重新加载图片列表，确保显示最新图片
  await loadImages()
}

// 关闭选择器
const closeSelector = () => {
  showSelector.value = false
  // 重置所有状态
  setTimeout(() => {
    searchQuery.value = ''
    currentPage.value = 1
    imageList.value = []
    hasMore.value = true
    selectedImageId.value = ''
  }, 300) // 等待动画结束后再重置
}

// 加载图片列表
const loadImages = async (isLoadMore = false) => {
  if (isLoadMore) {
    loadingMore.value = true
  } else {
    loading.value = true
    currentPage.value = 1
    imageList.value = []
  }
  
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize.value
    }
    
    // 添加搜索参数
    if (searchQuery.value.trim()) {
      params.name = searchQuery.value.trim()
    }
    
    const response = await api.get('/api/upload/image/list', params)
    const items = response.items || []
    
    if (isLoadMore) {
      imageList.value = [...imageList.value, ...items]
    } else {
      imageList.value = items
    }
    
    // 判断是否还有更多
    hasMore.value = items.length >= pageSize.value
    
  } catch (error) {
    console.error('加载图片列表失败:', error)
    showToast('加载图片列表失败', 'error')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 搜索处理（防抖）
const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadImages()
  }, 300)
}

// 滚动加载更多
const handleScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // 距离底部 100px 时触发加载
  if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore.value && !loadingMore.value) {
    currentPage.value++
    loadImages(true)
  }
}

// 选择图片 - 仅设置选中状态，等待用户点击确认按钮
const selectImage = (img) => {
  selectedImageId.value = img.file_id
}

// 确认选择
const confirmSelection = () => {
  if (!selectedImageId.value) return
  
  const selectedImg = imageList.value.find(img => img.file_id === selectedImageId.value)
  if (selectedImg) {
    fileId.value = selectedImg.file_id
    previewUrl.value = selectedImg.url
    
    emit('update:modelValue', selectedImg.url)
    emit('change', {
      fileId: selectedImg.file_id,
      url: selectedImg.url
    })
    emit('upload-success', selectedImg.file_id)
    
    showToast('图片选择成功！', 'success')
  }
  
  closeSelector()
}

// 从服务器删除图片
const deleteImageFromServer = async (fileIdToDelete) => {
  if (!confirm('确定要删除这张图片吗？此操作不可恢复！')) {
    return
  }
  
  try {
    await api.delete('/api/upload/image/delete', { file_id: fileIdToDelete })
    
    showToast('图片已删除', 'success')
    
    // 如果删除的是当前选中的图片，清空选中状态
    if (selectedImageId.value === fileIdToDelete) {
      selectedImageId.value = ''
    }
    
    // 如果删除的是当前预览的图片，清空预览
    if (fileId.value === fileIdToDelete) {
      handleDelete()
    }
    
    // 重新加载图片列表
    await loadImages()
  } catch (error) {
    console.error('删除图片失败:', error)
    showToast(error.message || '删除图片失败', 'error')
  }
}

// 触发上传
const triggerUpload = () => {
  closeSelector()
  // 延迟一下，等模态框关闭后再触发文件选择
  setTimeout(() => {
    fileInput.value?.click()
  }, 100)
}

// 计算加载更多时显示的骨架屏数量
const getLoadingCount = () => {
  // 默认显示 pageSize 个，但不超过可能的剩余数量
  // 这里简化处理，直接返回 pageSize
  return pageSize.value
}

// 处理文件选择
const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showToast('仅支持图片文件', 'error')
    return
  }
  
  // 验证文件大小
  if (file.size > props.maxSize) {
    const maxSizeMB = Math.round(props.maxSize / 1024 / 1024)
    showToast(`图片大小不能超过 ${maxSizeMB}MB`, 'error')
    return
  }
  
  // 显示预览
  previewUrl.value = URL.createObjectURL(file)
  
  // 上传文件
  await uploadImage(file)
}

// 上传图片
const uploadImage = async (file) => {
  uploading.value = true
  emit('upload-start')
  
  try {
    // 1. 获取上传 Token
    const tokenData = await uploadApi.getUploadToken({
      type: 'image',
      file_type: file.type,
      file_name: file.name,
      file_size: file.size,
      file_storage: props.fileStorage
    })
    
    // 2. 使用 uploadApi 上传文件
    // 从 localStorage 获取用户 ID（getUploadToken API 不返回 user_id）
    let userId = ''
    try {
      // 尝试多个可能的 key
      const userInfoStr = localStorage.getItem('emos_user_info') || localStorage.getItem('activeUser') || '{}'
      const userInfo = JSON.parse(userInfoStr)
      console.log('[ImageUploader] userInfo:', userInfo)
      userId = userInfo.id || userInfo.user_id || ''
      console.log('[ImageUploader] userId:', userId)
    } catch (e) {
      console.warn('无法从 localStorage 获取用户信息:', e)
    }
    
    if (!userId) {
      throw new Error('用户未登录，无法上传图片')
    }
    
    await uploadApi.uploadFile(tokenData.type, tokenData.data, file, {
      userId: userId,
      fileId: tokenData.file_id
    })
    
    // 3. 保存 file_id
    fileId.value = tokenData.file_id
    
    // 4. 如果选择器处于打开状态，重新加载图片列表
    if (showSelector.value) {
      await loadImages()
      // 自动选中新上传的图片
      selectedImageId.value = tokenData.file_id
    }
    
    // 5. 触发事件 - 使用 URL 而不是 file_id
    emit('update:modelValue', tokenData.url || previewUrl.value)
    emit('change', {
      fileId: tokenData.file_id,
      url: tokenData.url || previewUrl.value,
      file: file
    })
    emit('upload-success', tokenData.file_id)
    
    showToast('图片上传成功！', 'success')
    
  } catch (error) {
    console.error('上传失败:', error)
    showToast(error.message || '图片上传失败', 'error')
    emit('upload-error', error)
    
    // 上传失败，清空预览
    previewUrl.value = ''
    fileId.value = ''
  } finally {
    uploading.value = false
    // 清空文件输入
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// 删除图片
const handleDelete = () => {
  if (previewUrl.value && !previewUrl.value.startsWith('http')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  
  previewUrl.value = ''
  fileId.value = ''
  
  emit('update:modelValue', '')
  emit('change', {
    fileId: '',
    file: null
  })
}

// 暴露方法
defineExpose({
  clear: handleDelete
})
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

.upload-area {
  width: 100%;
  height: 200px;
  border-radius: 16px;
  background: var(--bg-input);
  border: 1.5px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
}

.upload-area:hover:not(.uploading):not(.has-image) {
  border-color: var(--accent);
  background: var(--bg-surface-hover);
}

.upload-area.has-image {
  border-style: solid;
  cursor: default;
}

/* 占位符样式 */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
}

.placeholder i {
  font-size: 2.5rem;
  margin-bottom: 4px;
}

.placeholder-text {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.placeholder-hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

/* 图片预览样式 */
.image-preview {
  width: 100%;
  height: 100%;
  position: relative;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 删除按钮 - 苹果26风格 */
.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-surface);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 
    0 0 0 0.5px var(--border) inset,
    var(--shadow-sm);
  z-index: 2;
}

.delete-btn i {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.delete-btn:hover {
  background: var(--danger);
  border-color: var(--danger);
  transform: scale(1.05);
}

.delete-btn:hover i {
  color: #fff;
}

/* 上传中遮罩 */
.uploading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 3;
}

.uploading-overlay i {
  font-size: 2rem;
  color: #fff;
}

.uploading-overlay span {
  font-size: 0.85rem;
  color: #fff;
  font-weight: 500;
}

/* 图片选择器 - 完全遵循全局模态框样式 */
.image-selector-content {
  max-width: 900px;
  max-height: 80vh;
}

.selector-search {
  position: relative;
  margin-bottom: 16px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  font-size: 0.9rem;
  pointer-events: none;
  z-index: 1;
}

.selector-search .modal-input {
  padding-left: 40px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
  gap: 12px;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.image-item {
  position: relative;
  background: var(--bg-surface);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s var(--ease);
}

.image-item:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.image-item.selected {
  border-color: var(--accent);
  border-width: 2px;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}

.image-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}

.image-info {
  padding: 8px 10px;
}

.image-name {
  font-size: 0.75rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.image-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: var(--text-tertiary);
}

.selected-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  animation: badgePop 0.2s var(--spring);
}

@keyframes badgePop {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

.selected-badge i {
  color: #fff;
  font-size: 0.75rem;
}

/* 图片删除按钮 - 选择器中 */
.image-delete-btn {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
  z-index: 2;
}

.image-item:hover .image-delete-btn {
  opacity: 1;
}

.image-delete-btn i {
  color: #fff;
  font-size: 0.8rem;
}

.image-delete-btn:hover {
  background: var(--danger);
  transform: scale(1.1);
}

/* 骨架屏样式 */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 4px 0;
}

.skeleton-item {
  pointer-events: none;
  cursor: default;
}

.skeleton-image {
  width: 100%;
  height: 120px;
  background: var(--bg-input);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-info {
  padding: 8px 10px;
}

.skeleton-line {
  height: 12px;
  background: var(--bg-input);
  border-radius: 6px;
  margin-bottom: 6px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-line.short {
  width: 70%;
}

.skeleton-line.shorter {
  width: 50%;
  margin-bottom: 0;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
