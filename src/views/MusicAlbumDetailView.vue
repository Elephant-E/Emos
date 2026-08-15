<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import musicApi from '@/api/musicApi.js'


import BaseModal from '@/components/common/BaseModal.vue'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import { normalizeList } from '@/utils/format.js'

const route = useRoute()
const router = useRouter()


const album = ref(null)
const songs = ref([])
const isLoading = ref(true)
const showDescModal = ref(false)
const isDescOverflow = ref(false)
const descRef = ref(null)

const albumTypeMusicLabel = (type) => {
  const map = { single: '单曲', ep: 'EP', album: '专辑' }
  return map[type] || '歌曲'
}

const hasDescription = computed(() => album.value?.description && album.value.description.trim().length > 0)

const checkDescOverflow = () => {
  if (descRef.value) {
    isDescOverflow.value = descRef.value.scrollHeight > descRef.value.clientHeight + 2
  }
}

const deleteSong = async (song) => {
  if (!(await confirmDialog('确定要删除该歌曲吗？此操作不可恢复！', '确认', true))) return
  try {
    await musicApi.deleteSong(song.song_id)
    songs.value = songs.value.filter(s => s.song_id !== song.song_id)
    showToast('歌曲已删除', 'success')
  } catch (error) {
    showToast(error.message || '删除失败', 'error')
  }
}


const loadAlbumDetail = async () => {
  try {
    isLoading.value = true
    const res = await musicApi.albumList({ album_id: route.params.id, page: 1, page_size: 1 })
    const albumItems = normalizeList(res)
    album.value = albumItems[0] || null
    if (album.value) {
      const songRes = await musicApi.songList({ album_id: route.params.id, page: 1, page_size: 50 })
      songs.value = normalizeList(songRes)
    }
  } catch (error) {
    console.error('加载专辑详情失败:', error)
    showToast('加载专辑详情失败', 'error')
  } finally {
    isLoading.value = false
    await nextTick()
    checkDescOverflow()
  }
}

onMounted(() => {
  loadAlbumDetail()
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
          <div class="skeleton-meta"></div>
        </div>
      </div>
    </div>

    <template v-else-if="album">
      <div class="detail-header-row">
        <button class="operation-btn back-btn" @click="router.back()" title="返回">
          <i class="fas fa-arrow-left"></i>
        </button>
      </div>

      <!-- 电脑端：左图右信息 / 移动端：纵向排列 -->
      <div class="album-hero">
        <div class="album-cover-lg" :style="{ background: album._gradient || 'var(--system-quaternary)' }">
          <i class="fas fa-compact-disc" style="font-size: 4rem; color: rgba(255,255,255,0.4);"></i>
        </div>
        <div class="album-hero-info">
          <h1 class="album-title-lg">{{ album.name }}</h1>
          <div v-if="album.person_artists?.length" class="album-artists">
            <span v-for="(artist, idx) in album.person_artists" :key="artist.person_id">
              <span v-if="idx > 0" style="color: var(--system-tertiary);"> / </span>
              <span class="artist-link" @click="router.push(`/music/artist/${artist.person_id}`)">{{ artist.name }}</span>
            </span>
          </div>
          <div class="album-meta-line">
            <span>{{ albumTypeMusicLabel(album.type) }}</span>
            <span v-if="album.release_date"> · {{ album.release_date.substring(0, 4) }}</span>
          </div>
          <div class="album-desc-desktop" v-if="hasDescription">
            <div class="desc-wrapper-inner">
              <p ref="descRef" class="album-desc-text">{{ album.description }}</p>
              <button v-if="isDescOverflow" class="desc-more-btn" @click="showDescModal = true">更多</button>
            </div>
          </div>
          <div class="album-desc-placeholder" v-else></div>


          <div class="album-desc-mobile" v-if="hasDescription">
            <div class="desc-wrapper-inner">
              <p class="album-desc-text-mobile">{{ album.description }}</p>
              <button class="desc-more-btn-mobile" @click="showDescModal = true">更多</button>
            </div>
          </div>
        </div>
      </div>

      <div class="song-divider" v-if="songs.length > 0"></div>

      <div v-if="songs.length === 0" class="list-empty">
        <i class="fas fa-music"></i>
        <p>暂无曲目</p>
      </div>

      <div v-else class="list-group">
        <div v-for="(song, idx) in songs" :key="song.song_id" class="list-row clickable" @click="router.push(`/music/${song.song_id}`)">
          <span class="list-row__rank">{{ idx + 1 }}</span>
          <div class="list-row__content">
            <div class="list-row__title">{{ song.name }}</div>
          </div>
          <div v-if="song.is_can_edit" class="list-row__action" @click.stop>
            <div class="cloud-buttons">
              <button class="cloud-btn cloud-btn--danger" @click="deleteSong(song)" title="删除"><i class="fas fa-trash-alt"></i></button>
            </div>
          </div>
        </div>
      </div>

    </template>

    <div v-else>
      <div class="detail-header-row">
        <button class="operation-btn back-btn" @click="router.back()" title="返回"><i class="fas fa-arrow-left"></i></button>
      </div>
      <div class="empty-state">
        <i class="fas fa-compact-disc" style="font-size: 2rem; margin-bottom: 0.8rem; display: block; opacity: 0.4;"></i>
        <p>专辑不存在或已删除</p>
      </div>
    </div>
  </div>

  <BaseModal :visible="showDescModal" title="专辑简介" @close="showDescModal = false">
    <p style="line-height: 1.8; color: var(--system-secondary); font-size: 0.95rem;">{{ album?.description }}</p>
  </BaseModal>
</template>

<style scoped>

.skeleton-hero { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 1.5rem; }
.skeleton-cover { width: 220px; height: 220px; border-radius: 20px; flex-shrink: 0; box-shadow: var(--shadow-lg); background: var(--system-quaternary); }
.skeleton-hero-info { flex: 1; min-width: 0; padding-top: 8px; }
.skeleton-title { height: 32px; width: 55%; border-radius: 6px; margin-bottom: 12px; background: var(--system-quaternary); }
.skeleton-subtitle { height: 18px; width: 35%; border-radius: 4px; margin-bottom: 8px; background: var(--system-quaternary); }
.skeleton-meta { height: 14px; width: 45%; border-radius: 4px; background: var(--system-quaternary); }
@media (max-width: 768px) { .skeleton-hero { flex-direction: column; align-items: center; } .skeleton-cover { width: 200px; height: 200px; } .skeleton-hero-info { text-align: center; padding-top: 0; } .skeleton-title, .skeleton-subtitle, .skeleton-meta { margin-left: auto; margin-right: auto; } }

.album-hero {
  display: flex;
  gap: 24px;
  align-items: stretch;
  margin-bottom: 1.5rem;
}

.album-cover-lg {
  width: 220px;
  height: 220px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-lg);
}

.album-hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-top: 8px;
}

.album-title-lg {
  font: var(--title-1-emphasized);
  margin-bottom: 4px;
  color: var(--system-primary);
}

.album-artists {
  font: var(--body);
  color: var(--key-color);
  margin-bottom: 4px;
}

.album-meta-line {
  font: var(--callout);
  color: var(--system-tertiary);
  margin-bottom: 8px;
}


.artist-link {
  color: var(--key-color);
  cursor: pointer;
}

.artist-link:active {
  opacity: 0.7;
}

.album-desc-desktop {
  margin-bottom: 12px;
}

.album-desc-placeholder {
  margin-bottom: 12px;
}

.desc-wrapper-inner {
  position: relative;
}

.album-desc-text {
  color: var(--system-secondary);
  font: var(--callout);
  line-height: 1.6;
  margin: 0;
  padding-right: 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.desc-more-btn,
.desc-more-btn-mobile {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: rgba(255, 255, 255, 0.95);
  padding: 0.1rem 0.5rem;
  border-radius: 20px;
  font: var(--footnote);
  cursor: pointer;
  white-space: nowrap;
  line-height: 1;
}

.desc-more-btn:active,
.desc-more-btn-mobile:active {
  opacity: 0.7;
}

.album-desc-mobile {
  display: none;
  margin-top: 12px;
}

.album-desc-text-mobile {
  color: var(--system-secondary);
  font: var(--callout);
  line-height: 1.6;
  margin: 0;
  padding-right: 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}


.song-divider {
  height: 1px;
  background: var(--system-quaternary);
  margin: 1rem 0;
}



@media (max-width: 768px) {
  .album-hero {
    flex-direction: column;
    align-items: center;
  }

  .album-cover-lg {
    width: 200px;
    height: 200px;
  }

  .album-hero-info {
    min-width: 0;
    text-align: center;
    align-items: center;
    width: 100%;
  }

  .album-title-lg {
    font: var(--title-2-emphasized);
  }

  .album-meta-line {
    display: flex;
    justify-content: center;
    gap: 4px;
  }


  .album-desc-desktop {
    display: none;
  }

  .album-desc-placeholder {
    display: none;
  }

  .album-desc-mobile {
    display: block;
  }
}
</style>
