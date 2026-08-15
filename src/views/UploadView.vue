<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUploadStore } from '@/stores/upload.js'
import { showToast } from '@/utils/toast.js'
import { formatFileSize } from '@/utils/format.js'
import { confirmDialog } from '@/utils/confirm.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import videoApi from '@/api/videoApi.js'
import musicApi from '@/api/musicApi.js'

defineOptions({ name: 'UploadView' })

const uploadStore = useUploadStore()


const isDragging = ref(false)
const fileInput = ref(null)
const resumeFileInput = ref(null)
const resumeItem = ref(null)
const statusFilter = ref('all')

const musicSelectVisible = ref(false)
const musicSelectCandidates = ref([])
const musicSelectItemId = ref(null)
const musicSelectTitle = ref('')

const closeMusicSelectModal = () => {
  musicSelectVisible.value = false
  musicSelectItemId.value = null
  musicSelectCandidates.value = []
  musicSelectTitle.value = ''
}

const handleMusicSelect = (song) => {
  uploadStore.selectMusicCandidate(musicSelectItemId.value, song.song_id)
  musicSelectVisible.value = false
}

const openMusicSelect = (item) => {
  musicSelectItemId.value = item.id
  musicSelectCandidates.value = item.musicCandidates
  musicSelectTitle.value = item.videoInfo?.title || item.name
  musicSelectVisible.value = true
}

const editModalVisible = ref(false)
const editItemId = ref(null)
const editItemType = ref(null)
const editSearchKeyword = ref('')
const editSearchResults = ref([])
const editSearching = ref(false)
const editSearched = ref(false)
const editSubmitting = ref(false)
const editSelectedVideo = ref(null)
const editTreeData = ref([])
const editTreeLoading = ref(false)
const editExpandedSeasons = ref({})
const editSelectedTarget = ref(null)

const closeEditModal = () => {
  editModalVisible.value = false
  editItemId.value = null
  editItemType.value = null
  editSearchKeyword.value = ''
  editSearchResults.value = []
  editSearching.value = false
  editSearched.value = false
  editSubmitting.value = false
  editSelectedVideo.value = null
  editTreeData.value = []
  editTreeLoading.value = false
  editExpandedSeasons.value = {}
  editSelectedTarget.value = null
}

let editDebounceTimer = null

const handleEditSearchInput = () => {
  clearTimeout(editDebounceTimer)
  editDebounceTimer = setTimeout(() => {
    performEditSearch()
  }, 500)
}

const performEditSearch = async () => {
  const keyword = editSearchKeyword.value.trim()
  if (!keyword) return
  
  editSearching.value = true
  editSearched.value = false
  editSearchResults.value = []
  editSelectedVideo.value = null
  editTreeData.value = []
  editSelectedTarget.value = null
  
  try {
    if (editItemType.value === 'video' || editItemType.value === 'subtitle') {
      const data = await videoApi.search({ title: keyword, page: 1, page_size: 20 })
      editSearchResults.value = data.items || []
    } else if (editItemType.value === 'music') {
      const data = await musicApi.songSearch({ name: keyword, page: 1, page_size: 20 })
      editSearchResults.value = data.items || []
    }
  } catch (error) {
    showToast('搜索失败: ' + (error.message || '未知错误'), 'error')
  } finally {
    editSearching.value = false
    editSearched.value = true
  }
}

const openEditModal = (item) => {
  editItemId.value = item.id
  editItemType.value = item.type
  editSearchKeyword.value = ''
  editModalVisible.value = true
}

const selectEditVideo = async (video) => {
  editSelectedVideo.value = video
  editTreeData.value = []
  editSelectedTarget.value = null
  editExpandedSeasons.value = {}
  
  if (video.video_type === 'movie') {
    editSelectedTarget.value = { 
      item_type: 'vl', 
      item_id: video.video_id, 
      label: video.video_title,
      video_type: 'movie'
    }
  } else {
    editTreeLoading.value = true
    try {
      const tree = await videoApi.tree({ video_id: video.video_id })
      const videoList = Array.isArray(tree) ? tree : (tree?.items || [])
      const videoData = videoList[0]
      editTreeData.value = videoData?.seasons || []
    } catch (error) {
      showToast('加载季集信息失败', 'error')
    } finally {
      editTreeLoading.value = false
    }
  }
}

const toggleEditSeason = (sIdx) => {
  editExpandedSeasons.value[sIdx] = !editExpandedSeasons.value[sIdx]
}

const selectEditEpisode = (episode) => {
  editSelectedTarget.value = { 
    item_type: episode.item_type, 
    item_id: episode.item_id, 
    label: episode.episode_title,
    video_type: 'tv'
  }
}

const handleEditSelect = async () => {
  if (!editSelectedTarget.value) return
  
  editSubmitting.value = true
  try {
    const idx = uploadStore.queue.findIndex(i => i.id === editItemId.value)
    if (idx === -1) return
    
    if (editItemType.value === 'video' || editItemType.value === 'subtitle') {
      uploadStore.queue[idx].videoInfo = {
        title: editSelectedVideo.value.video_title,
        item_type: editSelectedTarget.value.item_type,
        item_id: editSelectedTarget.value.item_id,
        video_type: editSelectedTarget.value.video_type
      }
    } else if (editItemType.value === 'music') {
      const result = editSelectedTarget.value
      uploadStore.queue[idx].videoInfo = {
        title: result.name,
        item_type: 'music',
        item_id: result.song_id,
        song_id: result.song_id,
        person_artists: result.person_artists || []
      }
    }
    
    if (uploadStore.queue[idx].status === 'failed') {
      uploadStore.queue[idx].status = 'ready'
      uploadStore.queue[idx].error = null
    }
    
    uploadStore.queue[idx].updatedAt = Date.now()
    showToast('已更新关联资源', 'success')
    closeEditModal()
  } catch (error) {
    showToast('更新失败: ' + (error.message || '未知错误'), 'error')
  } finally {
    editSubmitting.value = false
  }
}

const handleEditSelectMusic = (song) => {
  editSelectedVideo.value = song
  editSelectedTarget.value = {
    name: song.name,
    song_id: song.song_id,
    person_artists: song.person_artists || []
  }
}

const canEditItem = (item) => {
  return item.status === 'completed' || item.status === 'failed' || item.status === 'ready'
}

watch(() => uploadStore.queue.some(i => i.status === 'selecting'), (hasSelecting) => {
  if (hasSelecting && !musicSelectVisible.value) {
    const item = uploadStore.queue.find(i => i.status === 'selecting')
    if (item) openMusicSelect(item)
  }
})

const statusOptions = [
  { value: 'all', label: '全部', icon: 'fa-layer-group' },
  { value: 'ready', label: '待上传', icon: 'fa-clock' },
  { value: 'waiting', label: '等待中', icon: 'fa-hourglass-half' },
  { value: 'uploading', label: '上传中', icon: 'fa-upload' },
  { value: 'paused', label: '已暂停', icon: 'fa-pause' },
  { value: 'completed', label: '已完成', icon: 'fa-check' },
  { value: 'failed', label: '失败', icon: 'fa-times' }
]

const filteredQueue = computed(() => {
  if (statusFilter.value === 'all') return uploadStore.queue
  return uploadStore.queue.filter(item => item.status === statusFilter.value)
})

const statusCounts = computed(() => {
  const counts = { all: uploadStore.queue.length }
  for (const item of uploadStore.queue) {
    counts[item.status] = (counts[item.status] || 0) + 1
  }
  return counts
})

const canStartAll = computed(() => {
  return uploadStore.queue.some(
    item => item.status === 'ready' || item.status === 'waiting' || item.status === 'paused'
  )
})

const formatSpeed = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s'
  return formatFileSize(bytesPerSec) + '/s'
}

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files || [])
  handleFiles(files)
  e.target.value = ''
}

const handleDrop = (e) => {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files || [])
  handleFiles(files)
}

const handleFiles = (files) => {
  const validFiles = []
  
  for (const file of files) {
    const name = file.name.toLowerCase()
    const type = file.type
    
    const isVideo = type.startsWith('video/') || /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v)$/i.test(name)
    const isSubtitle = type === 'application/x-subrip' || type === 'text/srt' || /\.(srt|ass|ssa|vtt|sub)$/i.test(name)
    const isMusic = type.startsWith('audio/') || /\.(mp3|flac|wav|aac|ogg|m4a|wma|ape|alac|dsd|dff|dsf)$/i.test(name)
    
    if (!isVideo && !isSubtitle && !isMusic) {
      showToast(`不支持的文件类型: ${file.name}`, 'error')
      continue
    }
    
    if (uploadStore.checkDuplicate(file.name)) {
      showToast(`文件已存在: ${file.name}`, 'error')
      continue
    }
    
    validFiles.push(file)
  }
  
  if (validFiles.length > 0) {
    uploadStore.addFiles(validFiles)
  }
}

const handleResumeFileSelect = (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  
  if (!file) return
  if (!resumeItem.value) {
    handleFiles([file])
    return
  }
  
  if (file.name.toLowerCase() !== resumeItem.value.name.toLowerCase() || file.size !== resumeItem.value.size) {
    showToast('文件不匹配，请选择相同的文件', 'error')
    return
  }
  
  uploadStore.resumeItem(resumeItem.value, file)
  resumeItem.value = null
}

const startItem = (item) => {
  if (item.canResume) {
    resumeItem.value = item
    resumeFileInput.value?.click()
    return
  }
  uploadStore.startItem(item)
}

const pauseItem = (item) => {
  uploadStore.pauseItem(item)
}

const pauseWaitingItem = (item) => {
  uploadStore.pauseWaitingItem(item)
}

const deleteItem = async (item) => {
  if (item.status === 'completed') {
    uploadStore.removeItem(item)
    return
  }
  
  if (await confirmDialog(`确定删除 "${item.name}"？`, '确认', true)) {
    uploadStore.removeItem(item)
  }
}


const startAll = () => {
  uploadStore.startAll()
}

const pauseAll = () => {
  uploadStore.pauseAll()
}

const clearAll = async () => {
  const hasCompleted = uploadStore.queue.some(item => item.status === 'completed')
  
  if (hasCompleted) {
    uploadStore.clearCompleted()
  } else {
    if (await confirmDialog('确定清空所有任务？', '确认', true)) {
      uploadStore.clearAll()
    }
  }
}

const adjustConcurrency = (delta) => {
  uploadStore.setConcurrency(uploadStore.concurrency + delta)
}

onMounted(() => {
  uploadStore.restoreFromStorage()
  
  if (typeof window.tus === 'undefined') {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tus-js-client@3.1.1/dist/tus.min.js'
    script.async = true
    document.head.appendChild(script)
  }
})
</script>

<template>
  <div class="upload-page">
    <div class="page-header">
      <h1 class="page-title">上传管理</h1>

    </div>
    
    <div 
      class="image-uploader-preview"
      :class="{ dragover: isDragging }"
      @click="fileInput?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <i class="fas fa-cloud-upload-alt preview-placeholder" style="font-size: 2rem; margin-bottom: 0.8rem; display: block; opacity: 0.5; color: var(--system-tertiary);"></i>
      <div class="placeholder-text">点击或拖拽文件到此区域</div>
      <div class="placeholder-hint">支持视频 (MP4, MKV 等)、字幕 (SRT, ASS 等) 和音乐 (MP3, FLAC 等)</div>
      <input 
        ref="fileInput"
        type="file"
        multiple
        accept="video/*,.mp4,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.srt,.ass,.ssa,.vtt,.sub,audio/*,.mp3,.flac,.wav,.aac,.ogg,.m4a,.wma,.ape,.alac,.dsd,.dff,.dsf"
        @change="handleFileSelect"
        hidden
      />
    </div>
    
    <input 
      ref="resumeFileInput"
      type="file"
      accept="video/*,.mp4,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.srt,.ass,.ssa,.vtt,.sub,audio/*,.mp3,.flac,.wav,.aac,.ogg,.m4a,.wma,.ape,.alac,.dsd,.dff,.dsf"
      @change="handleResumeFileSelect"
      hidden
    />
    
    <div v-if="uploadStore.queue.length > 0" class="upload-queue">
      <div class="queue-header">
        <SegmentedControl :tabs="statusOptions.map(o => ({ value: o.value, label: o.label }))" v-model="statusFilter" />
        
        <div class="queue-actions">
          <div class="concurrency-control">
            <button class="action-icon" @click="adjustConcurrency(-1)" :disabled="uploadStore.concurrency <= 1">
              <i class="fas fa-minus"></i>
            </button>
            <span class="concurrency-value">{{ uploadStore.concurrency }}</span>
            <button class="action-icon" @click="adjustConcurrency(1)" :disabled="uploadStore.concurrency >= 10">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          
          <button 
            v-if="canStartAll"
            class="queue-btn"
            @click="startAll"
          >
            <i class="fas fa-play"></i>
            <span>全部开始</span>
          </button>
          <button 
            v-else-if="uploadStore.hasActiveUploads"
            class="queue-btn"
            @click="pauseAll"
          >
            <i class="fas fa-pause"></i>
            <span>全部暂停</span>
          </button>
          
          <button class="queue-btn" @click="clearAll">
            <i class="fas fa-trash-alt"></i>
            <span>{{ statusCounts.completed ? '清空完成' : '清空全部' }}</span>
          </button>
        </div>
      </div>
      
      <div v-if="filteredQueue.length === 0" class="list-empty">
        <i class="fas fa-inbox"></i>
        <p>暂无{{ statusOptions.find(o => o.value === statusFilter)?.label || '' }}任务</p>
      </div>
      
      <div v-else class="upload-list list-group">
        <div 
          v-for="(item, index) in filteredQueue" 
          :key="item.id"
          class="list-row upload-item"
        >
          <div class="list-row__icon upload-item-icon" :class="{ 
            identifying: item.status === 'identifying', 
            failed: item.status === 'failed',
            paused: item.status === 'paused'
          }">
            <i v-if="item.status === 'identifying'" class="fas fa-spinner fa-spin"></i>
            <i v-else-if="item.status === 'failed'" class="fas fa-exclamation-triangle"></i>
            <i v-else :class="item.type === 'video' ? 'fas fa-film' : item.type === 'music' ? 'fas fa-music' : 'fas fa-closed-captioning'"></i>
          </div>
          
          <div class="list-row__content upload-item-content">
            <div class="upload-item-header">
              <div class="upload-item-info">
                <div class="list-row__title">{{ item.name }}</div>
                <div class="list-row__subtitle upload-item-meta">
                  <template v-if="item.status === 'identifying'">
                    <span>识别中...</span>
                  </template>
                  <template v-else-if="item.status === 'failed'">
                    <span class="error-text">{{ item.error || '识别失败' }}</span>
                  </template>
                  <template v-else-if="item.videoInfo">
                    <span v-if="item.type === 'music'">{{ formatFileSize(item.size) }}<template v-if="item.videoInfo.person_artists?.length"> · {{ item.videoInfo.person_artists.map(a => a.name).join(' / ') }}</template> · {{ item.videoInfo.title }}</span>
                    <span v-else>{{ formatFileSize(item.size) }}<template v-if="item.videoInfo.title"> · {{ item.videoInfo.title }}</template></span>
                  </template>
                  <template v-else>
                    <span>{{ formatFileSize(item.size) }}</span>
                  </template>
                  <span v-if="item.canResume" class="resume-hint">· 可断点续传</span>
                </div>
              </div>
              
              <div class="cloud-buttons upload-item-actions">
                <button 
                  v-if="item.status === 'ready' && canEditItem(item)"
                  class="cloud-btn"
                  @click="openEditModal(item)"
                  title="编辑关联"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button 
                  v-if="item.status === 'ready'"
                  class="cloud-btn"
                  @click="startItem(item)"
                  title="开始上传"
                >
                  <i class="fas fa-play"></i>
                </button>
                <button 
                  v-if="item.status === 'waiting'"
                  class="cloud-btn"
                  @click="pauseWaitingItem(item)"
                  title="取消等待"
                >
                  <i class="fas fa-pause"></i>
                </button>
                <button 
                  v-if="item.status === 'uploading'"
                  class="cloud-btn"
                  @click="pauseItem(item)"
                  title="暂停"
                >
                  <i class="fas fa-pause"></i>
                </button>
                <button 
                  v-if="item.status === 'paused'"
                  class="cloud-btn"
                  @click="startItem(item)"
                  :title="item.canResume ? '选择文件继续' : '继续'"
                >
                  <i class="fas fa-play"></i>
                </button>
                <button 
                  v-if="item.status === 'failed' && canEditItem(item)"
                  class="cloud-btn"
                  @click="openEditModal(item)"
                  title="编辑关联"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button 
                  v-if="item.status === 'completed' && canEditItem(item)"
                  class="cloud-btn"
                  @click="openEditModal(item)"
                  title="编辑关联"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button 
                  class="cloud-btn"
                  @click="deleteItem(item)"
                  title="删除"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            <div v-if="item.status === 'uploading' || item.status === 'saving' || item.status === 'paused'" class="upload-item-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: item.status === 'saving' ? 100 : item.progress + '%' }"></div>
              </div>
              <span class="progress-text">{{ item.status === 'saving' ? '保存中' : item.progress + '%' }}</span>
              <span v-if="item.speed > 0 && item.status !== 'saving'" class="progress-speed">{{ formatSpeed(item.speed) }}</span>
            </div>
            
            <div v-else-if="item.status === 'waiting'" class="upload-item-progress">
              <span class="waiting-hint">等待上传...</span>
            </div>

          </div>
        </div>
      </div>
    </div>

    
    <BaseModal :visible="musicSelectVisible" title="选择匹配歌曲" @close="closeMusicSelectModal">
      <p class="form-hint music-select-hint">文件名解析为「{{ musicSelectTitle }}」，搜索到多个匹配结果，请选择正确的歌曲：</p>
      <div v-for="song in musicSelectCandidates" :key="song.song_id" class="list-row list-row--clickable" @click="handleMusicSelect(song)">
        <div class="list-row__content">
          <div class="list-row__title">{{ song.name }}</div>
          <div class="list-row__subtitle">{{ song.person_artists?.map(a => a.name).join(' / ') || '未知歌手' }}</div>
        </div>
        <svg class="list-row__chevron" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </BaseModal>
    
    <BaseModal :visible="editModalVisible" :title="editItemType === 'video' ? '编辑视频关联' : editItemType === 'music' ? '编辑音乐关联' : '编辑字幕关联'" @close="closeEditModal">
      <div class="form-group">
        <label class="form-label">搜索关键词</label>
        <input v-model="editSearchKeyword" class="modal-input" type="text" placeholder="输入标题搜索" @input="handleEditSearchInput" />
      </div>
      
      <div v-if="!editSelectedVideo && editSearchResults.length > 0" class="edit-results">
        <button v-for="item in editSearchResults" :key="item.video_id || item.song_id" class="edit-item" @click="editItemType === 'music' ? handleEditSelectMusic(item) : selectEditVideo(item)">

          <div class="edit-info">
            <div class="edit-title">{{ item.video_title || item.name }}</div>
            <div class="edit-meta">
              <template v-if="editItemType === 'video' || editItemType === 'subtitle'">
                {{ item.video_type === 'tv' ? '电视剧' : '电影' }}<template v-if="item.video_year"> · {{ item.video_year }}</template>
              </template>
              <template v-else-if="editItemType === 'music'">
                {{ item.person_artists?.map(a => a.name).join(' / ') || '未知歌手' }}
              </template>
            </div>
          </div>
          <i class="fas fa-chevron-right" style="color: var(--system-tertiary); font-size: 0.8rem;"></i>
        </button>
      </div>
      
      <div v-if="editSearching" class="loading-state loading-state--sm"><i class="fas fa-circle-notch fa-spin"></i></div>
      <div v-if="editSearched && !editSearching && editSearchResults.length === 0 && !editSelectedVideo" class="list-empty">未找到匹配的资源</div>
      
      <div v-if="editSelectedVideo && (editItemType === 'video' || editItemType === 'subtitle')" class="edit-selected-video">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 500;">{{ editSelectedVideo.video_title }}</div>
            <div style="font-size: 0.8rem; color: var(--system-tertiary);">{{ editSelectedVideo.video_type === 'movie' ? '电影' : '电视剧' }}</div>
          </div>
          <button class="modal-btn secondary" style="padding: 4px 12px; font-size: 0.8rem;" @click="editSelectedVideo = null; editTreeData = []; editSelectedTarget = null">重新选择</button>
        </div>

        <div v-if="editSelectedVideo.video_type === 'movie'" class="edit-results">
          <div class="edit-item selected" style="cursor: default; background: var(--system-quaternary);">
            <div class="edit-info"><div class="edit-title">{{ editSelectedVideo.video_title }}</div></div>
            <i class="fas fa-check" style="color: var(--key-color); font-size: 0.85rem;"></i>
          </div>
        </div>

        <div v-if="editSelectedVideo.video_type === 'tv' && editTreeLoading" class="loading-state loading-state--sm"><i class="fas fa-circle-notch fa-spin"></i></div>
        <div v-if="editSelectedVideo.video_type === 'tv' && !editTreeLoading" class="edit-tree">
          <div v-for="(season, sIdx) in editTreeData" :key="sIdx" class="edit-season">
            <button class="edit-season-header" @click="toggleEditSeason(sIdx)">
              <i :class="editExpandedSeasons[sIdx] ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" style="font-size: 0.7rem; color: var(--system-tertiary); width: 16px;"></i>
              <span>第 {{ season.season_number }} 季</span>
            </button>
            <div v-if="editExpandedSeasons[sIdx]" class="edit-episodes">
              <button v-for="ep in season.episodes" :key="ep.item_id" class="edit-item" :class="{ selected: editSelectedTarget?.item_id === ep.item_id }" @click="selectEditEpisode(ep)">
                <div class="edit-info"><div class="edit-title"><span class="episode-number">{{ ep.episode_number }}.</span> {{ ep.episode_title || `第 ${ep.episode_number} 集` }}</div></div>
                <i v-if="editSelectedTarget?.item_id === ep.item_id" class="fas fa-check" style="color: var(--key-color); font-size: 0.85rem;"></i>
                <i v-else class="fas fa-chevron-right" style="color: var(--system-tertiary); font-size: 0.8rem;"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <template v-if="editSelectedTarget || (editItemType === 'music' && editSelectedVideo)" #footer>
        <button class="modal-btn secondary" @click="editSelectedTarget = null; editSelectedVideo = null">取消选择</button>
        <button class="modal-btn primary" @click="handleEditSelect" :disabled="editSubmitting"><i v-if="editSubmitting" class="fas fa-circle-notch fa-spin"></i><span v-else>确认关联</span></button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.image-uploader-preview {
  margin-bottom: 1.5rem;
  background: var(--opaque-shelf-bg);
}

.image-uploader-preview.dragover {
  background: color-mix(in srgb, var(--key-color) 8%, var(--grouped-bg));
}

.upload-queue {
  background: var(--opaque-shelf-bg);
  border-radius: 20px;
  padding: 0 1.25rem;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1.25rem 0 0 0;
}

.queue-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.concurrency-control {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--grouped-bg);
  padding: 4px 8px;
  border-radius: 20px;
  height: 36px;
}

.action-icon {
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: transparent;
  border: none;
  color: var(--system-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;

}
.action-icon:active:not(:disabled) { color: var(--key-color); }
.action-icon:disabled { opacity: 0.4; cursor: not-allowed; }

.concurrency-value {
  font: var(--body-emphasized);
  color: var(--system-primary);
  min-width: 16px;
  text-align: center;
}

.queue-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.9rem;
  height: 36px;
  background: var(--grouped-bg);
  border: none;
  border-radius: 20px;
  color: var(--system-secondary);
  font: var(--callout-emphasized);
  cursor: pointer;

  white-space: nowrap;
}
.queue-btn:active { opacity: 0.8; }
.queue-btn i { font-size: 0.85rem; }

.upload-list { display: flex; flex-direction: column; }

.upload-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--grouped-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--key-color);
  font-size: 1rem;
}
.upload-item-icon.identifying { color: var(--system-tertiary); }
.upload-item-icon.failed { color: var(--danger); }
.upload-item-icon.paused { color: var(--warning); }

.upload-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: visible;
}

.upload-item-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.upload-item-info { flex: 1; min-width: 0; }

.upload-item-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.error-text { color: var(--danger); }
.resume-hint { color: var(--key-color); font: var(--callout-emphasized); }

.upload-item-actions {
  margin-left: auto;
}

.upload-item-progress {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--system-quaternary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--key-color);
  border-radius: 2px;
  transition: width 0.15s ease-out;
}

.progress-text {
  font: var(--callout-emphasized);
  color: var(--system-secondary);
  min-width: 32px;
  text-align: right;
}

.progress-speed {
  font: var(--callout);
  color: var(--system-tertiary);
  min-width: 60px;
}

.waiting-hint {
  font: var(--callout);
  color: var(--system-tertiary);
}

.music-select-hint { margin-bottom: 1rem; }
.list-row--clickable { cursor: pointer; }

@media (max-width: 483px) {
  .upload-queue {
    border-radius: 20px;
    padding: 0 0.75rem;
  }
  .queue-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    padding: 0.75rem 0 0 0;
  }
  .queue-actions {
    flex-wrap: nowrap;
    justify-content: flex-start;
    gap: 0.4rem;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .queue-actions::-webkit-scrollbar { display: none; }
  .queue-btn {
    padding: 0 0.6rem;
    height: 32px;
    border-radius: 20px;
    flex-shrink: 0;
  }
  .concurrency-control {
    height: 32px;
    padding: 3px 6px;
    border-radius: 20px;
    flex-shrink: 0;
  }
  .action-icon {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    font-size: 0.65rem;
  }
  .upload-item-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    font-size: 0.8rem;
  }

}

.edit-results { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.edit-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.8rem; background: var(--grouped-bg); border: none; border-radius: 10px; cursor: pointer; text-align: left; width: 100%; }
.edit-item:active { opacity: 0.7; }
.edit-item.selected { background: color-mix(in srgb, var(--key-color) 12%, var(--grouped-bg)); }

.edit-info { flex: 1; min-width: 0; }
.edit-title { font: var(--callout-emphasized); color: var(--system-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.edit-meta { font: var(--footnote); color: var(--system-tertiary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.edit-selected-video { margin-top: 12px; padding: 12px; background: var(--grouped-bg); border: none; border-radius: 10px; }
.edit-tree { margin-top: 8px; }
.edit-season { margin-bottom: 4px; }
.edit-season-header { display: flex; align-items: center; gap: 8px; padding: 0.5rem 0.6rem; background: var(--opaque-shelf-bg); border: none; border-radius: 8px; cursor: pointer; width: 100%; text-align: left; font: var(--callout); color: var(--system-primary); }
.edit-season-header:active { opacity: 0.7; }
.edit-episodes { padding-left: 12px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px; }
.episode-number { color: var(--system-tertiary); margin-right: 0.25rem; }
</style>
