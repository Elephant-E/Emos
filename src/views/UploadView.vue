<script setup>
import { watch, onMounted } from 'vue'
import { useUploadStore } from '@/stores/upload.js'
import { showToast } from '@/utils/toast.js'
import { formatFileSize } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

import { useEditTarget } from '@/composables/useEditTarget.js'
import { useMusicSelect } from '@/composables/useMusicSelect.js'
import { useUploadQueue } from '@/composables/useUploadQueue.js'
import { UPLOAD_STORAGES, DEFAULT_UPLOAD_STORAGE } from '@/utils/uploadStorage.js'

defineOptions({ name: 'UploadView' })

const uploadStore = useUploadStore()

// 存储位置：仅对用户暴露当前可用的（zn_r2_upload / google_drive）
const canChangeStorage = (item) => {
  return item.status === 'ready' || item.status === 'failed' || item.status === 'paused'
}

// ================= 编辑关联目标域 =================
const {
  editModalVisible,
  editItemId,
  editItemType,
  editSearchKeyword,
  editSearchResults,
  editSearching,
  editSearched,
  editSubmitting,
  editSelectedVideo,
  editTreeData,
  editTreeLoading,
  editExpandedSeasons,
  editSelectedTarget,
  closeEditModal,
  openEditModal,
  handleEditSearchInput,
  performEditSearch,
  selectEditVideo,
  toggleEditSeason,
  selectEditEpisode,
  handleEditSelectMusic,
  handleEditSelect,
  canEditItem,
} = useEditTarget({ uploadStore })

// ================= 音乐候选选择域 =================
const {
  musicSelectVisible,
  musicSelectCandidates,
  musicSelectItemId,
  musicSelectTitle,
  closeMusicSelectModal,
  openMusicSelect,
  handleMusicSelect,
} = useMusicSelect({ uploadStore })

// ================= 上传队列操作域 =================
const {
  isDragging,
  fileInput,
  resumeFileInput,
  resumeItem,
  statusFilter,
  statusOptions,
  filteredQueue,
  statusCounts,
  canStartAll,
  formatSpeed,
  handleFileSelect,
  handleDrop,
  handleFiles,
  handleResumeFileSelect,
  startItem,
  pauseItem,
  pauseWaitingItem,
  deleteItem,
  startAll,
  pauseAll,
  clearAll,
  adjustConcurrency,
} = useUploadQueue({ uploadStore })

// ================= 视图层：队列状态观察 =================
watch(() => uploadStore.queue.some(i => i.status === 'selecting'), (hasSelecting) => {
  if (hasSelecting && !musicSelectVisible.value) {
    const item = uploadStore.queue.find(i => i.status === 'selecting')
    if (item) openMusicSelect(item)
  }
})

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

    <div class="storage-guide">
      <span class="storage-guide__item"><strong>Zn 存档服 (R2)</strong>：默认存储，国内可用，稳定直传</span>
      <span class="storage-guide__item"><strong>谷歌盘</strong>：不支持国内直传，且存在 CORS 限制，失败时请改用默认</span>
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
                  <select
                    v-if="canChangeStorage(item)"
                    class="sort-select upload-item-storage-select"
                    :value="item.storage || DEFAULT_UPLOAD_STORAGE"
                    @change="uploadStore.setItemStorage(item, $event.target.value)"
                    title="存储位置"
                  >
                    <option v-for="opt in UPLOAD_STORAGES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <span v-else class="upload-item-storage-hint">· {{ uploadStore.getStorageLabel(item.storage) }}</span>
                  <span v-if="item.storage === 'google_drive' && item.status !== 'uploading' && item.status !== 'saving'" class="upload-item-storage-warn" title="谷歌盘不支持国内直传，且存在 CORS 限制，失败时请改用 Zn 存档服">⚠</span>
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
.storage-guide {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  padding: 0.6rem 0.25rem 1rem;
  color: var(--system-secondary);
  font: var(--footnote);
}

.storage-guide__item strong { color: var(--system-primary); }

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

.upload-item-storage-select {
  min-width: 0;
  max-width: 190px;
  height: 30px;
  padding: 0 1.4rem 0 0.5rem;
  background-position: right 8px center;
  font: var(--footnote-emphasized);
  vertical-align: middle;
}

.upload-item-storage-hint { color: var(--system-secondary); font: var(--footnote); }
.upload-item-storage-warn { color: var(--warning); font-size: 0.85rem; margin-left: 2px; cursor: help; }

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
