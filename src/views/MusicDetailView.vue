<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import musicApi from '@/api/musicApi.js'

import { formatFileSize, normalizeList, formatDuration } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const route = useRoute()
const router = useRouter()


const song = ref(null)
const isLoading = ref(true)
const lyrics = ref([])
const mediaList = ref([])
const mediaLoading = ref(true)
const activeTab = ref('media')

const showLyricModal = ref(false)
const lyricForm = reactive({ type: 'text', language: 'zh-CN', content: '' })
const isSavingLyric = ref(false)

const tabOptions = computed(() => [
  { label: '资源', value: 'media' },
  { label: '歌词', value: 'lyric' }
])

watch(activeTab, (newTab) => {
  // tab switching logic placeholder
})

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const loadSongDetail = async () => {
  try {
    isLoading.value = true
    song.value = await musicApi.songList({ song_id: route.params.id, page: 1, page_size: 1 })
    const items = normalizeList(song.value)
    song.value = items[0] || null
  } catch (error) {
    showToast('加载失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const loadLyrics = async () => {
  try {
    const res = await musicApi.getLyricList(route.params.id)
    lyrics.value = normalizeList(res)
  } catch (error) {
    console.error('加载歌词失败:', error)
    showToast('加载歌词失败', 'error')
  }
}

const loadMediaList = async () => {
  try {
    mediaLoading.value = true
    const res = await musicApi.getMediaList(route.params.id)
    mediaList.value = normalizeList(res)
  } catch (error) {
    console.error('加载资源失败:', error)
    showToast('加载资源失败', 'error')
  } finally {
    mediaLoading.value = false
  }
}


const deleteMedia = async (media) => {
  if (!(await confirmDialog('确定要删除该资源吗？此操作不可恢复！', '确认', true))) return
  try {
    await musicApi.deleteMedia(route.params.id, media.media_id)
    mediaList.value = mediaList.value.filter(m => m.media_id !== media.media_id)
    showToast('资源已删除', 'success')
  } catch (error) {
    showToast(error.message || '删除失败', 'error')
  }
}

const showMoveModal = ref(false)
const moveMediaId = ref(null)
const moveSearchQuery = ref('')
const moveSearchResults = ref([])
const moveSearching = ref(false)
let moveSearchTimer = null

const openMoveModal = (media) => {
  moveMediaId.value = media.media_id
  moveSearchQuery.value = ''
  moveSearchResults.value = []
  showMoveModal.value = true
}

const searchMoveTarget = async () => {
  clearTimeout(moveSearchTimer)
  if (!moveSearchQuery.value.trim()) {
    moveSearchResults.value = []
    return
  }
  moveSearchTimer = setTimeout(async () => {
    moveSearching.value = true
    try {
      const res = await musicApi.songSearch({ name: moveSearchQuery.value, page: 1, page_size: 10 })
      moveSearchResults.value = normalizeList(res)
    } catch {
      moveSearchResults.value = []
    } finally {
      moveSearching.value = false
    }
  }, 300)
}

const moveMedia = async (targetSongId) => {
  try {
    await musicApi.moveMedia(targetSongId, moveMediaId.value)
    mediaList.value = mediaList.value.filter(m => m.media_id !== moveMediaId.value)
    showMoveModal.value = false
    showToast('资源转移成功', 'success')
  } catch (error) {
    showToast(error.message || '转移失败', 'error')
  }
}

const deleteLyric = async (lyric) => {
  if (!(await confirmDialog('确定要删除该歌词吗？此操作不可恢复！', '确认', true))) return
  try {
    await musicApi.deleteLyric(route.params.id, lyric.lyric_id)
    lyrics.value = lyrics.value.filter(l => l.lyric_id !== lyric.lyric_id)
    showToast('歌词已删除', 'success')
  } catch (error) {
    showToast(error.message || '删除失败', 'error')
  }
}

const openLyricModal = () => {
  lyricForm.type = 'text'
  lyricForm.language = 'zh-CN'
  lyricForm.content = ''
  showLyricModal.value = true
}

const closeLyricModal = () => {
  showLyricModal.value = false
  lyricForm.type = 'text'
  lyricForm.language = 'zh-CN'
  lyricForm.content = ''
}

const closeMoveResourceModal = () => {
  showMoveModal.value = false
  moveMediaId.value = null
  moveSearchQuery.value = ''
  moveSearchResults.value = []
}

const saveLyric = async () => {
  if (!lyricForm.content.trim()) {
    showToast('请输入歌词内容', 'warning')
    return
  }
  isSavingLyric.value = true
  try {
    await musicApi.createLyric(route.params.id, {
      type: lyricForm.type,
      language: lyricForm.language,
      content: lyricForm.content.trim()
    })
    showToast('歌词已创建', 'success')
    showLyricModal.value = false
    await loadLyrics()
  } catch (error) {
    showToast(error.message || '创建失败', 'error')
  } finally {
    isSavingLyric.value = false
  }
}

const lyricTypeLabel = (type) => {
  const map = { text: '纯文本', lrc: '逐行', qrc: '逐字', inline: '逐字' }
  return map[type] || type
}

const formatLyricContent = (content, type) => {
  if (!content) return ''
  try {
    if (type === 'inline') {
      const arr = JSON.parse(content)
      if (!Array.isArray(arr)) return content
      const lines = arr
        .map(item => {
          if (!item || typeof item.text !== 'string') return ''
          const ts = typeof item.timestamp === 'number' && item.timestamp >= 0
            ? `[${String(Math.floor(item.timestamp / 60000)).padStart(2, '0')}:${String(Math.floor((item.timestamp % 60000) / 1000)).padStart(2, '0')}] `
            : ''
          const text = item.text.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim()
          return text ? ts + text : ''
        })
        .filter(t => t.length > 0)
      return lines.join('\n')
    }
    let text = content
    if (type === 'lrc' || type === 'qrc') {
      text = content.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim()
    }
    if (text.startsWith('"') && text.endsWith('"')) {
      text = JSON.parse(text)
    }
    if (typeof text === 'string' && /\\u[\da-f]{4}/i.test(text)) {
      text = text.replace(/\\u([\da-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    }
    return text
  } catch (e) {
    return content
  }
}

onMounted(async () => {
  await loadSongDetail()
  await Promise.all([loadLyrics(), loadMediaList()])
})

onUnmounted(() => {
  clearTimeout(moveSearchTimer)
})
</script>

<template>
  <div class="watchlist-detail-view">
    <div v-if="isLoading">
      <div class="detail-header-row">
        <button class="operation-btn back-btn" @click="router.back()" title="返回"><i class="fas fa-arrow-left"></i></button>
      </div>
      <div class="skeleton-hero">
        <div class="skeleton-cover"></div>
        <div class="skeleton-hero-info">
          <div class="skeleton-title"></div>
          <div class="skeleton-subtitle"></div>
          <div class="skeleton-tagline"></div>
        </div>
      </div>
    </div>

    <template v-else-if="song">
      <div class="detail-header-row">
        <button class="operation-btn back-btn" @click="router.back()" title="返回">
          <i class="fas fa-arrow-left"></i>
        </button>
      </div>

      <div class="music-hero">
        <div class="music-cover-lg" :style="{ background: song._gradient || 'var(--system-quaternary)' }">
          <i class="fas fa-music" style="font-size: 3.5rem; color: rgba(255,255,255,0.4);"></i>
        </div>
        <div class="music-hero-info">
          <h1 class="music-title-lg">{{ song.name }}</h1>
          <div v-if="song.person_artists?.length" class="music-artists">
            <span v-for="(artist, idx) in song.person_artists" :key="artist.person_id">
              <span v-if="idx > 0" style="color: var(--system-tertiary);"> / </span>
              <span class="artist-link" @click="router.push(`/music/artist/${artist.person_id}`)">{{ artist.name }}</span>
            </span>
          </div>
          <div v-if="song.tagline" class="music-tagline">{{ song.tagline }}</div>

        </div>
      </div>

      <div class="filter-bar" style="margin: 1.5rem 0 1rem;">
        <SegmentedControl :tabs="tabOptions" v-model="activeTab" />
        <div v-if="activeTab === 'lyric'" class="cloud-buttons">
          <button class="cloud-btn" title="创建歌词" @click="openLyricModal">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>

      <!-- 资源列表 -->
      <div v-if="activeTab === 'media'">
        <div v-if="mediaLoading" class="loading-state">
          <i class="fas fa-circle-notch fa-spin"></i>
          </div>
        <div v-else-if="mediaList.length === 0" class="list-empty">
          <i class="fas fa-file-audio"></i>
          <p>暂无资源</p>
        </div>
        <div v-else class="list-group">
          <div v-for="media in mediaList" :key="media.media_id" class="list-row">
            <span class="format-badge">{{ media.file_suffix?.toUpperCase() }}</span>
            <div class="list-row__content">
              <div class="list-row__title">{{ media.name || media.file_quality || media.file_suffix?.toUpperCase() }}</div>
              <div class="list-row__subtitle">{{ formatFileSize(media.file_size) }}<template v-if="media.file_second"> · {{ formatDuration(media.file_second) }}</template><template v-if="media.meta_rate_bit"> · {{ media.meta_rate_bit }}kbps</template><template v-if="media.meta_rate_sampling"> · {{ (media.meta_rate_sampling / 1000).toFixed(1) }}kHz</template> · {{ media.user?.username || '未知' }}<template v-if="media.created_at"> · {{ formatTime(media.created_at) }}</template></div>
            </div>
            <div class="list-row__action" @click.stop>
              <div class="cloud-buttons">
                <button class="cloud-btn" @click="openMoveModal(media)" title="转移"><i class="fas fa-exchange-alt"></i></button>
                <button class="cloud-btn cloud-btn--danger" @click="deleteMedia(media)" title="删除"><i class="fas fa-trash-alt"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 歌词列表 -->
      <div v-if="activeTab === 'lyric'">
        <div v-if="lyrics.length === 0" class="list-empty">
          <i class="fas fa-align-left"></i>
          <p>暂无歌词</p>
        </div>
        <div v-else class="video-list">
          <div v-for="lyric in lyrics" :key="lyric.lyric_id" class="lyric-item">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="format-badge">{{ lyricTypeLabel(lyric.type) }}</span>
                <span style="font: var(--callout); color: var(--system-tertiary);">{{ lyric.language }}</span>
                <span style="font: var(--callout); color: var(--system-tertiary);">· {{ lyric.name }}</span>
              </div>
              <div v-if="lyric.is_can_edit" class="cloud-buttons">
                <button class="cloud-btn cloud-btn--danger" @click="deleteLyric(lyric)" title="删除歌词"><i class="fas fa-trash-alt"></i></button>
              </div>
            </div>
            <div class="lyric-content">{{ formatLyricContent(lyric.content, lyric.type) }}</div>
          </div>
        </div>
      </div>
    </template>

    <div v-else>
      <div class="detail-header-row">
        <button class="operation-btn back-btn" @click="router.back()" title="返回"><i class="fas fa-arrow-left"></i></button>
      </div>
      <div class="empty-state">
        <i class="fas fa-music" style="font-size: 2rem; margin-bottom: 0.8rem; display: block; opacity: 0.4;"></i>
        <p>歌曲不存在或已删除</p>
      </div>
    </div>

    <!-- 创建歌词模态框 -->
    <BaseModal :visible="showLyricModal" title="创建歌词" @close="closeLyricModal">
      <div class="form-group">
        <label class="form-label">类型</label>
        <select class="modal-input" v-model="lyricForm.type">
          <option value="text">纯文本</option>
          <option value="lrc">逐行 (LRC)</option>
          <option value="qrc">逐字 (QRC)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">语言</label>
        <select class="modal-input" v-model="lyricForm.language">
          <option value="zh-CN">中文</option>
          <option value="en">英文</option>
          <option value="ja">日文</option>
          <option value="ko">韩文</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">歌词内容</label>
        <textarea class="modal-textarea" v-model="lyricForm.content" placeholder="请输入歌词内容" rows="8"></textarea>
      </div>
      <template #footer>
        <button class="modal-btn secondary" @click="showLyricModal = false">取消</button>
        <button class="modal-btn primary" @click="saveLyric" :disabled="isSavingLyric">
          <i v-if="isSavingLyric" class="fas fa-circle-notch fa-spin"></i>
          <span v-else>创建</span>
        </button>
      </template>
    </BaseModal>
  </div>

  <!-- 转移资源模态框 -->
  <BaseModal :visible="showMoveModal" title="转移资源" @close="closeMoveResourceModal">
    <p style="color: var(--system-secondary); margin-bottom: 1rem; font: var(--callout);">搜索目标歌曲，将资源转移至该歌曲下：</p>
    <div class="form-group">
      <input class="modal-input" v-model="moveSearchQuery" placeholder="输入歌曲名称搜索" @input="searchMoveTarget" />
    </div>
     <div v-if="moveSearching" class="loading-state loading-state--sm">
       <i class="fas fa-circle-notch fa-spin"></i>
       </div>
    <div v-else-if="moveSearchResults.length > 0" class="move-results">
      <div v-for="s in moveSearchResults" :key="s.song_id" class="move-result-item" @click="moveMedia(s.song_id)">
        <span class="move-result-name">{{ s.name }}</span>
        <span v-if="s.person_artists?.length" class="move-result-artist">{{ s.person_artists.map(a => a.name).join(' / ') }}</span>
      </div>
    </div>
    <div v-else-if="moveSearchQuery && !moveSearching" style="text-align: center; padding: 1rem; color: var(--system-tertiary); font: var(--callout);">
      无搜索结果
    </div>
  </BaseModal>
</template>

<style scoped>

.skeleton-hero { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 1.5rem; }
.skeleton-cover { width: 160px; height: 160px; border-radius: 50%; flex-shrink: 0; box-shadow: var(--shadow-lg); background: var(--system-quaternary); }
.skeleton-hero-info { flex: 1; min-width: 0; padding-top: 8px; }
.skeleton-title { height: 32px; width: 60%; border-radius: 6px; margin-bottom: 12px; background: var(--system-quaternary); }
.skeleton-subtitle { height: 18px; width: 40%; border-radius: 4px; margin-bottom: 8px; background: var(--system-quaternary); }
.skeleton-tagline { height: 14px; width: 50%; border-radius: 4px; background: var(--system-quaternary); }
@media (max-width: 768px) { .skeleton-hero { flex-direction: column; align-items: center; } .skeleton-cover { width: 140px; height: 140px; } .skeleton-hero-info { text-align: center; padding-top: 0; } .skeleton-title, .skeleton-subtitle, .skeleton-tagline { margin-left: auto; margin-right: auto; } }

.music-hero {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.music-cover-lg {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.music-hero-info {
  flex: 1;
  min-width: 0;
  padding-top: 8px;
}

.music-title-lg {
  font: var(--title-3-emphasized);
  margin-bottom: 4px;
  color: var(--system-primary);
}

.music-artists {
  font: var(--body);
  color: var(--key-color);
  margin-bottom: 4px;
}

.music-tagline {
  font: var(--callout);
  color: var(--system-tertiary);
}

.artist-link {
  color: var(--key-color);
  cursor: pointer;
}

.artist-link:active {
  opacity: 0.7;
}

.format-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 1000px;
  font: var(--footnote);
  background: color-mix(in srgb, var(--key-color) 15%, transparent);
  color: var(--key-color);
  margin-right: 6px;
  text-transform: uppercase;
}

.lyric-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0.8rem;
  background: var(--opaque-shelf-bg);
  border: none;
  border-radius: 20px;
}

.lyric-content {
  font: var(--callout);
  color: var(--system-primary);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.8;
  padding: 12px;
  border-radius: 20px;
  background: var(--system-quaternary);
  border: none;
  max-height: 300px;
  overflow-y: auto;
}

.move-results {
  max-height: 240px;
  overflow-y: auto;
  margin-top: 0.5rem;
}

.move-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  border-radius: 20px;
  cursor: pointer;
}

.move-result-item:active {
  opacity: 0.7;
}

.move-result-name {
  font: var(--callout-emphasized);
  color: var(--system-primary);
}

.move-result-artist {
  font: var(--footnote);
  color: var(--system-tertiary);
  margin-left: 8px;
  flex-shrink: 0;
}


@media (max-width: 768px) {
  .music-hero {
    flex-direction: column;
    align-items: center;
  }

  .music-cover-lg {
    width: 140px;
    height: 140px;
  }

  .music-hero-info {
    text-align: center;
    padding-top: 0;
  }
}
</style>
