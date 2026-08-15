<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import musicApi from '@/api/musicApi.js'

import { normalizeList } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'


const route = useRoute()
const router = useRouter()


const artist = ref(null)
const songs = ref([])
const albums = ref([])
const isLoading = ref(true)
const activeTab = ref('songs')

const loadArtistDetail = async () => {
  try {
    isLoading.value = true
    const res = await musicApi.personList({ person_id: route.params.id, page: 1, page_size: 1 })
    const personItems = normalizeList(res)
    artist.value = personItems[0] || null
    if (artist.value) {
      const [songRes, albumRes] = await Promise.all([
        musicApi.songList({ person_id_artist: route.params.id, page: 1, page_size: 20 }),
        musicApi.albumList({ person_id_artist: route.params.id, page: 1, page_size: 20 })
      ])
      songs.value = normalizeList(songRes)
      const albumItems = normalizeList(albumRes)
      albums.value = albumItems
    }
  } catch (error) {
    console.error('加载歌手详情失败:', error)
    showToast('加载歌手详情失败', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadArtistDetail()
})
</script>

<template>
  <div class="watchlist-detail-view">
    <div v-if="isLoading">
      <div class="detail-header-row">
        <button class="operation-btn back-btn" @click="router.back()" title="返回"><i class="fas fa-arrow-left"></i></button>
      </div>
      <div class="skeleton-hero">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-hero-info">
          <div class="skeleton-title"></div>
          <div class="skeleton-subtitle"></div>
        </div>
      </div>
    </div>

    <template v-else-if="artist">
      <div class="detail-header-row">
        <button class="operation-btn back-btn" @click="router.back()" title="返回">
          <i class="fas fa-arrow-left"></i>
        </button>
      </div>

      <div class="artist-hero">
        <div class="artist-avatar-lg" :style="{ background: artist._gradient || 'var(--system-quaternary)' }">
          <i class="fas fa-microphone-alt" style="font-size: 3.5rem; color: rgba(255,255,255,0.4);"></i>
        </div>
        <div class="artist-hero-info">
          <h1 class="artist-title-lg">{{ artist.name }}</h1>
          <div v-if="artist.original_name" class="artist-original-name">{{ artist.original_name }}</div>

        </div>
      </div>

      <div class="filter-bar" style="margin: 1.5rem 0 1rem;">
        <div class="filter-group">
          <button class="filter-chip" :class="{ active: activeTab === 'songs' }" @click="activeTab = 'songs'">
            <i class="fas fa-music"></i> 歌曲 <span class="filter-count">{{ songs.length }}</span>
          </button>
          <button class="filter-chip" :class="{ active: activeTab === 'albums' }" @click="activeTab = 'albums'">
            <i class="fas fa-compact-disc"></i> 专辑 <span class="filter-count">{{ albums.length }}</span>
          </button>
        </div>
      </div>

      <!-- 歌曲列表 -->
      <div v-if="activeTab === 'songs'">
      <div v-if="songs.length === 0" class="list-empty">
        <i class="fas fa-music"></i>
        <p>暂无歌曲</p>
      </div>
      <div v-else class="list-group">
        <div v-for="song in songs" :key="song.song_id" class="list-row clickable" @click="router.push(`/music/${song.song_id}`)">
          <div class="list-row__icon" :style="{ background: song._gradient || 'var(--system-quaternary)' }">
            <i class="fas fa-music" style="font-size: 0.7rem; color: rgba(255,255,255,0.5);"></i>
          </div>
          <div class="list-row__content">
            <div class="list-row__title">{{ song.name }}</div>
          </div>
        </div>
      </div>
      </div>

      <!-- 专辑列表 - 网格卡片，和主页一样 -->
      <div v-if="activeTab === 'albums'">
      <div v-if="albums.length === 0" class="list-empty">
        <i class="fas fa-compact-disc"></i>
        <p>暂无专辑</p>
      </div>
        <div v-else class="album-grid">
          <div v-for="album in albums" :key="album.album_id" class="album-card" @click="router.push(`/music/album/${album.album_id}`)">
            <div class="album-cover" :style="{ background: album._gradient || 'var(--system-quaternary)' }">
              <i class="fas fa-compact-disc" style="font-size: 2.5rem; color: rgba(255,255,255,0.4);"></i>

            </div>
            <div class="album-info">
              <div class="album-title">{{ album.name }}</div>
              <div class="album-meta">
                <span v-if="album.release_date">{{ album.release_date.substring(0, 4) }}</span>
                <span v-if="album.count_song">· {{ album.count_song }} 首</span>
              </div>
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
        <i class="fas fa-microphone-alt" style="font-size: 2rem; margin-bottom: 0.8rem; display: block; opacity: 0.4;"></i>
        <p>歌手不存在或已删除</p>
      </div>
    </div>
  </div>
</template>

<style scoped>

.skeleton-hero { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 1.5rem; }
.skeleton-avatar { width: 160px; height: 160px; border-radius: 50%; flex-shrink: 0; box-shadow: var(--shadow-lg); background: var(--system-quaternary); }
.skeleton-hero-info { flex: 1; min-width: 0; padding-top: 8px; }
.skeleton-title { height: 32px; width: 50%; border-radius: 6px; margin-bottom: 12px; background: var(--system-quaternary); }
.skeleton-subtitle { height: 16px; width: 35%; border-radius: 4px; background: var(--system-quaternary); }
@media (max-width: 768px) { .skeleton-hero { flex-direction: column; align-items: center; } .skeleton-avatar { width: 140px; height: 140px; } .skeleton-hero-info { text-align: center; padding-top: 0; } .skeleton-title, .skeleton-subtitle { margin-left: auto; margin-right: auto; } }

.artist-hero {
  display: flex;
  gap: 24px;
  align-items: stretch;
  margin-bottom: 1.5rem;
}

.artist-avatar-lg {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-lg);
}

.artist-hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-top: 8px;
}

.artist-title-lg {
  font: var(--title-1-emphasized);
  margin-bottom: 4px;
  color: var(--system-primary);
}

.artist-original-name {
  font: var(--body);
  color: var(--system-secondary);
}


.filter-count {
  font: var(--footnote);
  opacity: 0.6;
  margin-left: 2px;
}


.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.album-card {
  cursor: pointer;
}

.album-card:active {
  opacity: 0.9;
}

.album-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  box-shadow: var(--shadow-sm);
  position: relative;
}

.album-info {
  padding: 0 2px;
}

.album-title {
  font: var(--callout-emphasized);
  color: var(--system-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font: var(--footnote);
  color: var(--system-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .artist-hero {
    flex-direction: column;
    align-items: center;
  }

  .artist-avatar-lg {
    width: 140px;
    height: 140px;
  }

  .artist-hero-info {
    text-align: center;

  }

  .artist-title-lg {
    font: var(--title-2-emphasized);
  }

  .filter-bar {
    justify-content: center;
  }

  .album-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .album-cover {
    border-radius: 10px;
  }
}
</style>
