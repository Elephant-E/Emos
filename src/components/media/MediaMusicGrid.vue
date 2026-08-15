<script setup>
import { escapeHtml } from '@/utils/format.js'
import { useRouter } from 'vue-router'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const router = useRouter()

const props = defineProps({
  songs: { type: Array, default: () => [] },
  artists: { type: Array, default: () => [] },
  albums: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  pageSize: { type: Number, default: 20 },
  searchQuery: { type: String, default: '' },
  subView: { type: String, default: 'song' }
})

const emit = defineEmits(['switchSubView'])

const subViewTabs = [
  { label: '歌曲', value: 'song' },
  { label: '歌手', value: 'artist' },
  { label: '专辑', value: 'album' }
]

const generateSkeletonArray = (count) => Array.from({ length: count }, (_, i) => i)

const getImageUrl = (imageId) => {
  if (!imageId) return null
  return `https://files.emosstore.sbs/files/image/${imageId}`
}
</script>


<template>
  <div id="musicView" class="view-container">
    <SegmentedControl :tabs="subViewTabs" :model-value="subView" @update:model-value="emit('switchSubView', $event)" full />

    <!-- 歌曲 -->
    <div v-if="subView === 'song'">
      <div v-if="loading && songs.length === 0" class="music-grid">
        <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-song-' + i" class="skeleton-card-wrapper">
          <div class="skeleton-card"><div class="skeleton-poster" style="aspect-ratio: 1;"></div></div>
          <div class="skeleton-info"><div class="skeleton-title"></div><div class="skeleton-year"></div></div>
        </div>
      </div>
      <div v-else-if="songs.length === 0" class="list-empty">
        <i class="fas fa-music" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>{{ searchQuery ? '没有找到匹配的歌曲' : '暂无歌曲' }}</p>
      </div>
      <div v-else class="music-grid">
        <div v-for="song in songs" :key="song.song_id" class="album-card" @click="router.push(`/music/${song.song_id}`)">
          <div class="album-cover" :style="{ background: song._gradient || 'var(--system-quaternary)' }">
            <i class="fas fa-music" style="font-size: 2.5rem; color: rgba(255,255,255,0.5);"></i>

          </div>
          <div class="album-info">
            <div class="album-title">{{ song.name }}</div>
            <div v-if="song.person_artists?.length" class="album-meta">{{ song.person_artists.map(a => a.name).join(' / ') }}</div>
          </div>
        </div>
        <template v-if="loading">
          <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-song-more-' + i" class="skeleton-card-wrapper">
            <div class="skeleton-card"><div class="skeleton-poster" style="aspect-ratio: 1;"></div></div>
            <div class="skeleton-info"><div class="skeleton-title"></div><div class="skeleton-year"></div></div>
          </div>
        </template>
      </div>
    </div>

    <!-- 歌手 -->
    <div v-if="subView === 'artist'">
      <div v-if="loading && artists.length === 0" class="artist-grid">
        <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-artist-' + i" class="artist-skeleton">
          <div class="artist-skeleton-avatar"></div>
          <div class="artist-skeleton-name"></div>
          <div class="artist-skeleton-meta"></div>
        </div>
      </div>
      <div v-else class="artist-grid">
        <div v-for="artist in artists" :key="artist.person_id" class="artist-card" @click="router.push(`/music/artist/${artist.person_id}`)">
          <div class="artist-avatar">
            <img v-if="artist.image_profile_url" :src="getImageUrl(artist.image_profile_url)" :alt="escapeHtml(artist.name)" @error="$event.target.style.display='none'; $event.target.nextElementSibling.style.display='flex'" loading="lazy">
            <div :style="{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: artist._gradient || 'var(--system-quaternary)', borderRadius: '50%' }">
              <i class="fas fa-microphone-alt" style="font-size: 2rem; color: rgba(255,255,255,0.5);"></i>
            </div>

          </div>
          <div class="artist-name">{{ artist.name }}</div>
          <div v-if="artist.original_name" class="artist-meta">{{ artist.original_name }}</div>
        </div>
        <template v-if="loading">
          <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-artist-more-' + i" class="artist-skeleton">
            <div class="artist-skeleton-avatar"></div>
            <div class="artist-skeleton-name"></div>
            <div class="artist-skeleton-meta"></div>
          </div>
        </template>
      </div>
      <div v-if="!loading && artists.length === 0" class="list-empty">
        <i class="fas fa-microphone-alt" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>{{ searchQuery ? '没有找到匹配的歌手' : '暂无歌手' }}</p>
      </div>
    </div>

    <!-- 专辑 -->
    <div v-if="subView === 'album'">
      <div v-if="loading && albums.length === 0" class="music-grid">
        <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-album-' + i" class="skeleton-card-wrapper">
          <div class="skeleton-card"><div class="skeleton-poster" style="aspect-ratio: 1;"></div></div>
          <div class="skeleton-info"><div class="skeleton-title"></div><div class="skeleton-year"></div></div>
        </div>
      </div>
      <div v-else-if="albums.length === 0" class="list-empty">
        <i class="fas fa-compact-disc" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>{{ searchQuery ? '没有找到匹配的专辑' : '暂无专辑' }}</p>
      </div>
      <div v-else class="music-grid">
        <div v-for="album in albums" :key="album.album_id" class="album-card" @click="router.push(`/music/album/${album.album_id}`)">
          <div class="album-cover">
            <img v-if="album.image_poster_url" :src="album.image_poster_url" :alt="escapeHtml(album.name)" @error="$event.target.style.display='none'" loading="lazy">
            <div v-else :style="{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: album._gradient || 'var(--system-quaternary)', borderRadius: '12px' }">
              <i class="fas fa-compact-disc" style="font-size: 3rem; color: rgba(255,255,255,0.4);"></i>
            </div>

          </div>
          <div class="album-info">
            <div class="album-title">{{ album.name }}</div>
            <div class="album-meta">
              <span v-if="album.person_artists?.length">{{ album.person_artists.map(a => a.name).join(' / ') }}</span>
              <span v-if="album.count_song">· {{ album.count_song }} 首</span>
              <span v-if="album.release_date">· {{ album.release_date.substring(0, 4) }}</span>
            </div>
          </div>
        </div>
        <template v-if="loading">
          <div v-for="i in generateSkeletonArray(pageSize)" :key="'skeleton-album-more-' + i" class="skeleton-card-wrapper">
            <div class="skeleton-card"><div class="skeleton-poster" style="aspect-ratio: 1;"></div></div>
            <div class="skeleton-info"><div class="skeleton-title"></div><div class="skeleton-year"></div></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.music-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
.artist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1.2rem; }
.skeleton-card-wrapper { display: block; min-width: 0; }
.skeleton-card { border-radius: 20px; overflow: visible; }
.skeleton-poster { width: 100%; aspect-ratio: 2/3; border-radius: 20px; background: var(--system-quaternary); }
.skeleton-info { text-align: center; margin-top: 0.35rem; }
.skeleton-title { height: 16px; border-radius: 4px; background: var(--system-quaternary); margin-bottom: 4px; }
.skeleton-year { height: 12px; width: 40%; margin: 0 auto; border-radius: 4px; background: var(--system-quaternary); }
.artist-skeleton { display: flex; flex-direction: column; align-items: center; padding: 1.2rem 0.5rem; }
.artist-skeleton-avatar { width: 100px; height: 100px; border-radius: 50%; background: var(--system-quaternary); margin-bottom: 0.8rem; }
.artist-skeleton-name { height: 14px; width: 60%; border-radius: 4px; background: var(--system-quaternary); margin-bottom: 4px; }
.artist-skeleton-meta { height: 10px; width: 40%; border-radius: 4px; background: var(--system-quaternary); }
.artist-card { display: flex; flex-direction: column; align-items: center; padding: 1.2rem 0.5rem; border-radius: 20px; cursor: pointer; }
.artist-card:active { opacity: 0.9; }
.artist-avatar { width: 100px; height: 100px; border-radius: 50%; overflow: hidden; margin-bottom: 0.8rem; position: relative; }
.artist-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.artist-name { font: var(--callout-emphasized); color: var(--system-primary); text-align: center; margin-bottom: 2px; }
.artist-meta { font: var(--footnote); color: var(--system-tertiary); text-align: center; }
.album-card { cursor: pointer; }
.album-card:active { opacity: 0.9; }
.album-cover { width: 100%; aspect-ratio: 1; overflow: hidden; border-radius: 12px; margin-bottom: 0.6rem; display: flex; align-items: center; justify-content: center; position: relative; }
.album-cover img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; }
.album-info { padding: 0 2px; }
.album-title { font: var(--callout-emphasized); color: var(--system-primary); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.album-meta { display: flex; align-items: center; gap: 4px; font: var(--footnote); color: var(--system-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 768px) {
  .music-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
  .artist-grid { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
  .artist-card { padding: 0.6rem 0.3rem; }
  .artist-avatar { width: 70px; height: 70px; margin-bottom: 0.4rem; }
  .artist-name { font: var(--footnote); }
  .artist-meta { display: none; }
  .album-cover { border-radius: 10px; margin-bottom: 0.3rem; }
  .album-cover img { border-radius: 10px; }
  .album-title { font: var(--footnote); white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.05rem; }
  .album-meta { display: none; }
  .skeleton-info { margin-top: 0.25rem; }
  .skeleton-title { height: 12px; margin-bottom: 2px; }
  .skeleton-year { height: 10px; }
}
</style>