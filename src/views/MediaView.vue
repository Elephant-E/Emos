<script setup>
import { ref, nextTick, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import videoApi from '@/api/videoApi.js'
import liveApi from '@/api/liveApi.js'
import seekApi from '@/api/seekApi.js'
import musicApi from '@/api/musicApi.js'
import { normalizeList } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import ImageUploader from '@/components/ImageUploader.vue'
import MediaVideoGrid from '@/components/media/MediaVideoGrid.vue'
import MediaLiveGrid from '@/components/media/MediaLiveGrid.vue'
import MediaMusicGrid from '@/components/media/MediaMusicGrid.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import { useMediaModals } from '@/composables/useMediaModals.js'

const router = useRouter()

const currentView = ref('video')

const viewTabs = computed(() => [
  { label: '影视', value: 'video' },
  { label: '直播', value: 'live' },
  { label: '音乐', value: 'music' }
])

watch(currentView, (view) => {
  searchQuery.value = ''
  currentPage.value = 1
  if (view === 'video') loadVideos()
  else if (view === 'live') loadLiveChannels()
  else if (view === 'music') loadMusicData()
})
const searchQuery = ref('')
const isLoading = ref(false)
const isSearching = ref(false)
const videos = ref([])
const liveChannels = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)

const livePage = ref(1)
const liveHasMore = ref(true)
const liveLoading = ref(false)

let searchTimeout = null
let videosAbortController = null
let liveAbortController = null


const musicSubView = ref('song')
const musicSongs = ref([])
const musicArtists = ref([])
const musicAlbums = ref([])
const musicSongPage = ref(1)
const musicArtistPage = ref(1)
const musicAlbumPage = ref(1)
const musicSongHasMore = ref(true)
const musicArtistHasMore = ref(true)
const musicAlbumHasMore = ref(true)
const musicLoading = ref(false)
let musicSongAbortController = null
let musicArtistAbortController = null
let musicAlbumAbortController = null


const {
  // 片单
  showPlaylistModal,
  playlists,
  selectedPlaylistIds,
  currentVideoForPlaylist,
  playlistLoading,
  showPlaylistSelectionModal,
  togglePlaylistSelection,
  confirmAddToPlaylist,
  closePlaylistModal,
  // 直播频道
  showAddChannelModal,
  liveLibraries,
  channelForm,
  isSubmittingChannel,
  showAddChannelModalFunc,
  closeAddChannelModal,
  submitChannel,
  // Spotify
  showSyncModal,
  syncArtistName,
  spotifyResults,
  selectedSpotifyArtists,
  spotifySearching,
  spotifySearched,
  syncSubmitting,
  closeSyncModal,
  toggleSpotifyArtist,
  handleSyncInput,
  searchSpotifyArtist,
  submitSync,
} = useMediaModals({
  onChannelCreated: () => {
    livePage.value = 1
    liveChannels.value = []
    liveHasMore.value = true
    loadLiveChannels()
  },
  onMusicDataReload: () => {
    loadMusicData()
  }
})

const loadMusicData = (reset = true) => {
  if (musicSubView.value === 'song') loadMusicSongs(reset)
  else if (musicSubView.value === 'artist') loadMusicArtists(reset)
  else if (musicSubView.value === 'album') loadMusicAlbums(reset)
}

const loadMusicSongs = async (reset = true) => {
  if (!reset && !musicSongHasMore.value) return
  if (!reset && musicLoading.value) return
  if (musicSongAbortController) musicSongAbortController.abort()
  musicSongAbortController = new AbortController()
  const currentController = musicSongAbortController
  if (reset) musicSongPage.value = 1
  musicLoading.value = true
  try {
    const params = { page: musicSongPage.value, page_size: pageSize.value }
    if (searchQuery.value) params.name = searchQuery.value
    const res = await musicApi.songList(params, { signal: currentController.signal })
    if (currentController.signal.aborted) return
    const items = normalizeList(res)
    if (reset) musicSongs.value = items
    else musicSongs.value = [...musicSongs.value, ...items]
    const totalPages = res.total ? Math.ceil(res.total / pageSize.value) : 0
    musicSongHasMore.value = musicSongPage.value < totalPages
    if (musicSongHasMore.value) musicSongPage.value++
  } catch (error) {
    if (!currentController.signal.aborted) showToast('加载歌曲失败', 'error')
  } finally {
    if (!currentController.signal.aborted) { musicLoading.value = false; isSearching.value = false }
  }
}

const loadMusicArtists = async (reset = true) => {
  if (!reset && !musicArtistHasMore.value) return
  if (!reset && musicLoading.value) return
  if (musicArtistAbortController) musicArtistAbortController.abort()
  musicArtistAbortController = new AbortController()
  const currentController = musicArtistAbortController
  if (reset) musicArtistPage.value = 1
  musicLoading.value = true
  try {
    const params = { page: musicArtistPage.value, page_size: pageSize.value }
    if (searchQuery.value) params.name = searchQuery.value
    const res = await musicApi.personList(params, { signal: currentController.signal })
    if (currentController.signal.aborted) return
    const items = normalizeList(res)
    if (reset) musicArtists.value = items
    else musicArtists.value = [...musicArtists.value, ...items]
    const totalPages = res.total ? Math.ceil(res.total / pageSize.value) : 0
    musicArtistHasMore.value = musicArtistPage.value < totalPages
    if (musicArtistHasMore.value) musicArtistPage.value++
  } catch (error) {
    if (!currentController.signal.aborted) showToast('加载歌手失败', 'error')
  } finally {
    if (!currentController.signal.aborted) { musicLoading.value = false; isSearching.value = false }
  }
}

const loadMusicAlbums = async (reset = true) => {
  if (!reset && !musicAlbumHasMore.value) return
  if (!reset && musicLoading.value) return
  if (musicAlbumAbortController) musicAlbumAbortController.abort()
  musicAlbumAbortController = new AbortController()
  const currentController = musicAlbumAbortController
  if (reset) musicAlbumPage.value = 1
  musicLoading.value = true
  try {
    const params = { page: musicAlbumPage.value, page_size: pageSize.value }
    if (searchQuery.value) params.name = searchQuery.value
    const res = await musicApi.albumList(params, { signal: currentController.signal })
    if (currentController.signal.aborted) return
    const items = normalizeList(res)
    if (reset) musicAlbums.value = items
    else musicAlbums.value = [...musicAlbums.value, ...items]
    const totalPages = res.total ? Math.ceil(res.total / pageSize.value) : 0
    musicAlbumHasMore.value = musicAlbumPage.value < totalPages
    if (musicAlbumHasMore.value) musicAlbumPage.value++
  } catch (error) {
    if (!currentController.signal.aborted) showToast('加载专辑失败', 'error')
  } finally {
    if (!currentController.signal.aborted) { musicLoading.value = false; isSearching.value = false }
  }
}

const switchMusicSubView = (sub) => {
  musicSubView.value = sub
  loadMusicData()
}

const loadVideos = async (reset = true) => {
  if (!reset && !hasMore.value) return
  if (!reset && isLoading.value) return
  if (videosAbortController) videosAbortController.abort()
  videosAbortController = new AbortController()
  const currentController = videosAbortController
  if (reset) currentPage.value = 1
  isLoading.value = true
  try {
    const params = { page: currentPage.value, page_size: pageSize.value }
    if (searchQuery.value) {
      if (/^\d+$/.test(searchQuery.value)) params.tmdb_id = searchQuery.value
      else params.title = searchQuery.value
    }
    const response = await videoApi.list(params, { signal: currentController.signal })
    if (currentController.signal.aborted) return
    if (reset) videos.value = response.items || []
    else videos.value = [...videos.value, ...(response.items || [])]
    if (response.has_more !== undefined) hasMore.value = response.has_more
    else if (response.total !== undefined) hasMore.value = currentPage.value < Math.ceil(response.total / pageSize.value)
    else hasMore.value = (response.items?.length || 0) === pageSize.value
    if (hasMore.value) currentPage.value++
  } catch (error) {
    if (error.name !== 'AbortError' && !currentController.signal.aborted) showToast('加载视频失败: ' + error.message, 'error')
  } finally {
    if (!currentController.signal.aborted) { isLoading.value = false; isSearching.value = false }
  }
}

const loadLiveChannels = async (reset = true) => {
  if (!reset && !liveHasMore.value) return
  if (!reset && liveLoading.value) return
  if (liveAbortController) liveAbortController.abort()
  liveAbortController = new AbortController()
  const currentController = liveAbortController
  if (reset) livePage.value = 1
  liveLoading.value = true
  try {
    const params = { page: livePage.value, page_size: pageSize.value }
    if (searchQuery.value) params.title = searchQuery.value
    const response = await liveApi.getChannelList(params, { signal: currentController.signal })
    if (currentController.signal.aborted) return
    const channels = response.items || []
    if (reset) liveChannels.value = channels
    else liveChannels.value = [...liveChannels.value, ...channels]
    const totalPages = response.total ? Math.ceil(response.total / pageSize.value) : 0
    liveHasMore.value = livePage.value < totalPages
    if (liveHasMore.value) livePage.value++
  } catch (error) {
    if (!currentController.signal.aborted) showToast('加载直播频道失败', 'error')
  } finally {
    if (!currentController.signal.aborted) { liveLoading.value = false; isSearching.value = false }
  }
}

const handleSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1; livePage.value = 1; isSearching.value = true
    if (currentView.value === 'video') loadVideos()
    else if (currentView.value === 'live') loadLiveChannels()
    else if (currentView.value === 'music') loadMusicData()
  }, 500)
}

const handleSearch = () => {
  currentPage.value = 1; livePage.value = 1; isSearching.value = true
  if (currentView.value === 'video') loadVideos()
  else if (currentView.value === 'live') loadLiveChannels()
  else if (currentView.value === 'music') loadMusicData()
}

const handleScroll = () => {
  const scrollContainer = document.getElementById('scrollable-page')
  if (!scrollContainer) return
  const scrollTop = scrollContainer.scrollTop
  const windowHeight = scrollContainer.clientHeight
  const scrollHeight = scrollContainer.scrollHeight
  if (scrollHeight - scrollTop - windowHeight < 200) {
    if (currentView.value === 'video' && hasMore.value && !isLoading.value) loadVideos(false)
    else if (currentView.value === 'live' && liveHasMore.value && !liveLoading.value) loadLiveChannels(false)
    else if (currentView.value === 'music') {
      if (musicSubView.value === 'song' && musicSongHasMore.value && !musicLoading.value) loadMusicSongs(false)
      else if (musicSubView.value === 'artist' && musicArtistHasMore.value && !musicLoading.value) loadMusicArtists(false)
      else if (musicSubView.value === 'album' && musicAlbumHasMore.value && !musicLoading.value) loadMusicAlbums(false)
    }
  }
}

const goToDetail = (videoId) => router.push(`/media/${videoId}`)
const goToLiveChannelDetail = (channel) => router.push(`/live/${channel.id}`)

const handleSeekRequest = async (video) => {
  try {
    const response = await seekApi.apply('vl', video.video_id)
    if (response.seek_is_request) { video.seek_is_request = true; showToast('求片成功', 'success') }
    else { video.seek_is_request = false; showToast('已取消求片', 'info') }
  } catch (error) {
    console.error('求片操作失败:', error)
    showToast('求片操作失败', 'error')
  }
}

onMounted(() => {
  loadVideos()
  const scrollContainer = document.getElementById('scrollable-page')
  if (scrollContainer) scrollContainer.addEventListener('scroll', handleScroll)
})

onActivated(() => {
  const scrollContainer = document.getElementById('scrollable-page')
  if (scrollContainer) scrollContainer.addEventListener('scroll', handleScroll)
})

onDeactivated(() => {
  const scrollContainer = document.getElementById('scrollable-page')
  if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  const scrollContainer = document.getElementById('scrollable-page')
  if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (searchTimeout) clearTimeout(searchTimeout)
  if (videosAbortController) videosAbortController.abort()
  if (liveAbortController) liveAbortController.abort()
  if (musicSongAbortController) musicSongAbortController.abort()
  if (musicArtistAbortController) musicArtistAbortController.abort()
  if (musicAlbumAbortController) musicAlbumAbortController.abort()
})
</script>

<template>
  <header class="page-header">
    <h1 class="page-title">媒体管理</h1>

  </header>

  <div class="filter-bar">
    <SegmentedControl :tabs="viewTabs" v-model="currentView" full />
    <div class="search-sort-group">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input type="text" v-model="searchQuery" @input="handleSearchInput" @keyup.enter="handleSearch" :placeholder="currentView === 'live' ? '搜索频道标题...' : currentView === 'music' ? '搜索歌曲、歌手...' : '搜索标题或 TMDB ID...'" class="search-input" />
      </div>
      <div v-if="currentView === 'live'" class="cloud-buttons">
        <button class="cloud-btn" title="新增频道" @click="showAddChannelModalFunc"><i class="fas fa-plus"></i></button>
      </div>
      <div v-if="currentView === 'music'" class="cloud-buttons">
        <button class="cloud-btn" title="同步歌手" @click="showSyncModal = true"><i class="fas fa-plus"></i></button>
      </div>
    </div>
  </div>

  <MediaVideoGrid v-if="currentView === 'video'" :videos="videos" :is-loading="isLoading" :is-searching="isSearching" :page-size="pageSize" :search-query="searchQuery" @go-to-detail="goToDetail" @show-playlist="showPlaylistSelectionModal" @handle-seek="handleSeekRequest" />

  <MediaLiveGrid v-if="currentView === 'live'" :channels="liveChannels" :is-loading="liveLoading" :is-searching="isSearching" :page-size="pageSize" :search-query="searchQuery" @go-to-detail="goToLiveChannelDetail" />

  <MediaMusicGrid v-if="currentView === 'music'" :songs="musicSongs" :artists="musicArtists" :albums="musicAlbums" :loading="musicLoading" :page-size="pageSize" :search-query="searchQuery" :sub-view="musicSubView" @switch-sub-view="switchMusicSubView" />

  <!-- 片单选择模态框 -->
  <BaseModal :visible="showPlaylistModal" title="添加到片单" @close="closePlaylistModal">
    <div class="form-group">
      <p class="form-label">视频：{{ currentVideoForPlaylist?.video_title }}</p>
    </div>
    <div v-if="playlistLoading" class="loading-state loading-state--sm"><i class="fas fa-circle-notch fa-spin"></i></div>
    <div v-else-if="playlists.length === 0" class="list-empty">暂无片单</div>
    <div v-else class="video-select-list">
      <div 
        v-for="playlist in playlists" 
        :key="playlist.id" 
        :class="['video-select-item', { selected: selectedPlaylistIds.includes(playlist.id) }]"
        @click="togglePlaylistSelection(playlist.id)"
      >

        <div class="video-info">
          <div class="video-title">{{ playlist.name }}</div>
          <div class="video-origin-title">{{ playlist.is_public ? '公开' : '私有' }} · {{ playlist.video_count || 0 }} 个视频</div>
        </div>
        <div class="select-checkbox">
          <i v-if="selectedPlaylistIds.includes(playlist.id)" class="fas fa-check-circle"></i>
          <i v-else class="far fa-circle"></i>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closePlaylistModal">取消</button>
      <button class="modal-btn primary" @click="confirmAddToPlaylist" :disabled="selectedPlaylistIds.length === 0">确认</button>
    </template>
  </BaseModal>

  <!-- 新增频道模态框 -->
  <BaseModal :visible="showAddChannelModal" title="新增直播频道" @close="closeAddChannelModal">
    <div class="form-group"><label class="form-label">直播库</label><select v-model="channelForm.live_library_id" class="modal-input"><option value="">请选择直播库</option><option v-for="lib in liveLibraries" :key="lib.id" :value="lib.id">{{ lib.name }}</option></select></div>
    <div class="form-group"><label class="form-label">频道标题</label><input v-model="channelForm.title" class="modal-input" type="text" placeholder="请输入频道标题" /></div>
    <div class="form-group"><label class="form-label">宣传词</label><input v-model="channelForm.tagline" class="modal-input" type="text" placeholder="请输入宣传词（可选）" /></div>
    <div class="form-group"><label class="form-label">简介</label><textarea v-model="channelForm.description" class="modal-input modal-textarea" placeholder="请输入频道简介（可选）" rows="3"></textarea></div>
    <div class="form-group"><label class="form-label">封面图片</label><ImageUploader :model-value="channelForm.image_poster_url" @change="(data) => { channelForm.image_poster_url = data.url || '' }" :max-size="5 * 1024 * 1024" placeholder-text="点击上传封面" hint-text="支持 JPG、PNG，≤5MB" /></div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeAddChannelModal">取消</button>
      <button class="modal-btn primary" @click="submitChannel" :disabled="isSubmittingChannel"><i v-if="isSubmittingChannel" class="fas fa-circle-notch fa-spin"></i><span v-else>确认</span></button>
    </template>
  </BaseModal>

  <!-- Spotify 同步模态框 -->
  <BaseModal :visible="showSyncModal" title="从 Spotify 同步歌手" @close="closeSyncModal">
    <div class="form-group">
      <label class="form-label">歌手名称</label>
      <input v-model="syncArtistName" class="modal-input" type="text" placeholder="输入歌手名称" @input="handleSyncInput" />
    </div>
    <div v-if="spotifyResults.length > 0" class="spotify-results">
      <button v-for="item in spotifyResults" :key="item.id" class="spotify-item" :class="{ selected: selectedSpotifyArtists.some(a => a.id === item.id) }" @click="toggleSpotifyArtist(item)">
        <img v-if="item.images?.length" :src="item.images[item.images.length > 1 ? 1 : 0].url" class="spotify-img" />
        <div v-else class="spotify-img-placeholder"><i class="fas fa-user"></i></div>
        <div class="spotify-info">
          <div class="spotify-name">{{ item.name }}</div>
          <div class="spotify-meta">{{ item.followers?.total?.toLocaleString() }} 粉丝 · {{ item.genres?.slice(0, 3).join(', ') }}</div>
        </div>
        <i v-if="selectedSpotifyArtists.some(a => a.id === item.id)" class="fas fa-check" style="color: var(--success); font-size: 0.85rem;"></i>
        <i v-else class="fas fa-chevron-right" style="color: var(--system-tertiary); font-size: 0.8rem;"></i>
      </button>
    </div>
    <div v-if="spotifySearching" class="loading-state loading-state--sm"><i class="fas fa-circle-notch fa-spin"></i></div>
    <div v-if="spotifySearched && !spotifySearching && spotifyResults.length === 0" class="list-empty">未找到匹配的歌手</div>
    <template v-if="selectedSpotifyArtists.length > 0" #footer>
      <button class="modal-btn secondary" @click="selectedSpotifyArtists = []">取消选择</button>
      <button class="modal-btn primary" @click="submitSync" :disabled="syncSubmitting"><i v-if="syncSubmitting" class="fas fa-circle-notch fa-spin"></i><span v-else>同步 ({{ selectedSpotifyArtists.length }})</span></button>
    </template>
  </BaseModal>
</template>

<style scoped>
.spotify-results { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.spotify-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.8rem; background: var(--system-quaternary); border: none; border-radius: 10px; cursor: pointer; text-align: left; }
.spotify-item:active { opacity: 0.7; }
.spotify-item.selected { background: color-mix(in srgb, var(--key-color) 12%, var(--system-quaternary)); }
.spotify-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.spotify-img-placeholder { width: 40px; height: 40px; border-radius: 50%; background: var(--grouped-bg); display: flex; align-items: center; justify-content: center; color: var(--system-tertiary); flex-shrink: 0; font-size: 0.9rem; }
.spotify-info { flex: 1; min-width: 0; }
.spotify-name { font: var(--callout-emphasized); color: var(--system-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spotify-meta { font: var(--footnote); color: var(--system-tertiary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
