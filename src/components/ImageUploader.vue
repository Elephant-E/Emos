<template>
  <div class="image-uploader-wrapper">
    <div 
      class="image-uploader-preview"
      :class="{ disabled }"
      @click="!disabled && openSelector()"
    >
      <div v-if="selectedUrl" class="preview-container">
        <img :src="selectedUrl" alt="预览" class="preview-image" loading="lazy">
        <button v-if="!disabled" class="preview-delete-btn" @click.stop="clearImage">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div v-else class="preview-placeholder">
        <i class="fas fa-image"></i>
        <div class="placeholder-text">{{ placeholderText || '点击选择图片' }}</div>
        <div v-if="hintText" class="placeholder-hint">{{ hintText }}</div>
      </div>
    </div>
    
    <BaseModal :visible="showModal" title="选择图片" size="lg" @close="closeSelector">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input 
          v-model="searchName"
          type="text" 
          class="search-input"
          placeholder="搜索文件名"
          @input="debounceSearch"
        >
      </div>
      
      <div v-if="loading" class="image-grid">
        <div v-for="i in 12" :key="i" class="image-card skeleton">
          <div class="image-preview">
            <div class="skeleton-img"></div>
          </div>
          <div class="image-info">
            <div class="skeleton-name"></div>
            <div class="skeleton-meta">
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="imageList.length === 0" class="list-empty">
        <i class="fas fa-images"></i>
        <p>暂无图片</p>
      </div>
      
      <div v-else class="image-grid">
        <div 
          v-for="image in imageList" 
          :key="image.file_id"
          class="image-card"
          :class="{ selected: tempSelectedUrl === image.url }"
          @click="selectImage(image)"
        >
          <div class="image-preview">
            <img :src="image.url" :alt="image.file_name" loading="lazy">
            <div v-if="tempSelectedUrl === image.url" class="selected-badge">
              <i class="fas fa-check"></i>
            </div>
            <button class="delete-btn" @click.stop="deleteImage(image)">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
          <div class="image-info">
            <div class="image-name">{{ image.file_name }}</div>
            <div class="image-meta">
              <span>{{ formatSize(image.file_size) }}</span>
              <span>{{ formatDate(image.updated_at || image.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="modal-btn secondary" :disabled="uploading" @click="triggerUpload">
          <i v-if="uploading" class="fas fa-circle-notch fa-spin"></i>
          <span>{{ uploading ? '上传中' : '上传图片' }}</span>
        </button>
        <button class="modal-btn primary" @click="confirmSelection" :disabled="!tempSelectedUrl || uploading">
          <span>确认</span>
        </button>
      </template>
    </BaseModal>

    <input 
      ref="fileInput"
      type="file" 
      accept="image/*"
      @change="handleUpload"
      hidden
    />
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { formatFileSize as formatSize, formatDate } from '@/utils/format.js'
import api from '@/api/index.js'
import uploader from '@/utils/uploader.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  maxSize: { type: Number, default: 5 * 1024 * 1024 },
  storage: { type: String, default: 'default' },
  placeholderText: { type: String, default: '' },
  hintText: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'change'])

const showModal = ref(false)
const selectedUrl = ref('')
const tempSelectedUrl = ref('')
const imageList = ref([])
const loading = ref(false)
const uploading = ref(false)
const fileInput = ref(null)
const searchName = ref('')
let searchTimer = null

onUnmounted(() => {
  clearTimeout(searchTimer)
})

watch(() => props.modelValue, (v) => {
  selectedUrl.value = v || ''
}, { immediate: true })

const openSelector = async () => {
  tempSelectedUrl.value = selectedUrl.value
  showModal.value = true
  searchName.value = ''
  await loadImageList()
}

const closeSelector = () => {
  showModal.value = false
  tempSelectedUrl.value = ''
  searchName.value = ''
}

const debounceSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    await loadImageList()
  }, 300)
}

const loadImageList = async () => {
  loading.value = true
  try {
    const params = { page: 1, page_size: 100 }
    if (searchName.value) {
      params.name = searchName.value
    }
    const response = await api.get('/api/upload/image/list', params)
    imageList.value = response.items || []
  } catch (error) {
    showToast('加载图片列表失败', 'error')
    imageList.value = []
  } finally {
    loading.value = false
  }
}

const selectImage = (image) => {
  tempSelectedUrl.value = image.url
}

const confirmSelection = () => {
  selectedUrl.value = tempSelectedUrl.value
  emit('update:modelValue', selectedUrl.value)
  emit('change', { url: selectedUrl.value })
  closeSelector()
}

const deleteImage = async (image) => {
  if (!(await confirmDialog('确定删除该图片？', '确认', true))) return
  
  try {
    await api.delete(`/api/upload/image/delete?file_id=${image.file_id}`)
    showToast('删除成功', 'success')
    await loadImageList()
    if (tempSelectedUrl.value === image.url) {
      tempSelectedUrl.value = ''
    }
  } catch (error) {
    showToast(error.message || '删除失败', 'error')
  }
}

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }
  
  if (file.size > props.maxSize) {
    showToast(`文件大小不能超过 ${Math.round(props.maxSize / 1024 / 1024)}MB`, 'error')
    return
  }
  
  uploading.value = true
  showToast('正在上传...', 'info')
  
  try {
    await uploader.uploadImage(file, { storage: props.storage })
    showToast('上传成功', 'success')
    loading.value = true
    await loadImageList()
  } catch (error) {
    showToast(error.message || '上传失败', 'error')
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

const clearImage = () => {
  selectedUrl.value = ''
  emit('update:modelValue', '')
  emit('change', { url: '' })
}
</script>

<style scoped>

.image-uploader-wrapper {
  width: 100%;
}

.preview-container {
  position: relative;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  display: block;
  border-radius: 20px;
}

.preview-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.preview-delete-btn:active {
  background: var(--danger);
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.preview-placeholder i {
  font-size: 2rem;
  color: var(--system-tertiary);
  margin-bottom: 0.5rem;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.image-card {
  background: var(--opaque-shelf-bg);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
}

.image-card:active:not(.skeleton) {
  opacity: 0.9;
}

.image-card.selected {
  outline: 2px solid var(--key-color);
  outline-offset: -2px;
}

.image-preview {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--system-quaternary);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--key-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.delete-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;

}

.delete-btn:active {
  background: var(--danger);
}

.image-info {
  padding: 10px;
}

.image-name {
  font: var(--callout-emphasized);
  color: var(--system-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.image-meta {
  display: flex;
  justify-content: space-between;
  font: var(--footnote);
  color: var(--system-tertiary);
}

.image-card.skeleton {
  pointer-events: none;
}

.skeleton-img {
  width: 100%;
  height: 100%;
  background: var(--system-quaternary);
}

.skeleton-name {
  height: 12px;
  width: 70%;
  background: var(--system-quaternary);
  border-radius: 4px;
  margin-bottom: 4px;
}

.skeleton-meta {
  display: flex;
  justify-content: space-between;
}

.skeleton-meta span {
  height: 10px;
  width: 25%;
  background: var(--system-quaternary);
  border-radius: 4px;
}

@media (max-width: 768px) {
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 0.75rem;
  }

}
</style>
