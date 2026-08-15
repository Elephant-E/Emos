import { ref } from 'vue'
import musicApi from '@/api/musicApi.js'
import liveApi from '@/api/liveApi.js'
import watchlistApi from '@/api/watchlistApi.js'
import { showToast } from '@/utils/toast.js'

/**
 * 媒体管理「模态框」域：加入片单选择、添加直播频道、Spotify 艺人同步。
 * 与原实现行为保持一致。
 *
 * 依赖注入：
 *   - onChannelCreated：添加频道成功后刷新直播频道列表（原 loadLiveChannels）
 *   - onMusicDataReload：Spotify 同步成功后刷新音乐列表（原 loadMusicData）
 */
export function useMediaModals({ onChannelCreated, onMusicDataReload }) {
  // ================= 片单选择 =================
  const showPlaylistModal = ref(false)
  const playlists = ref([])
  const selectedPlaylistIds = ref([])
  const currentVideoForPlaylist = ref(null)
  const playlistLoading = ref(false)

  const showPlaylistSelectionModal = async (video) => {
    currentVideoForPlaylist.value = video
    selectedPlaylistIds.value = []
    showPlaylistModal.value = true
    await loadPlaylists()
  }

  const loadPlaylists = async () => {
    playlistLoading.value = true
    try {
      const response = await watchlistApi.getList({ is_self: 1 })
      playlists.value = response.items || []
    } catch (error) {
      console.error('加载片单失败:', error)
      showToast('加载片单失败', 'error')
    } finally {
      playlistLoading.value = false
    }
  }

  const togglePlaylistSelection = (playlistId) => {
    const idx = selectedPlaylistIds.value.indexOf(playlistId)
    if (idx > -1) selectedPlaylistIds.value.splice(idx, 1)
    else selectedPlaylistIds.value.push(playlistId)
  }

  const confirmAddToPlaylist = async () => {
    if (selectedPlaylistIds.value.length === 0 || !currentVideoForPlaylist.value) { showToast('请至少选择一个片单', 'warning'); return }
    try {
      await Promise.all(selectedPlaylistIds.value.map(watchId => watchlistApi.addVideo(watchId, currentVideoForPlaylist.value.video_id, { sort: 80 })))
      showToast(`已成功添加到 ${selectedPlaylistIds.value.length} 个片单`, 'success')
      showPlaylistModal.value = false
    } catch (error) {
      console.error('添加到片单失败:', error)
      showToast('添加失败，请重试', 'error')
    }
  }

  const closePlaylistModal = () => {
    showPlaylistModal.value = false
    selectedPlaylistIds.value = []
    currentVideoForPlaylist.value = null
  }

  // ================= 添加直播频道 =================
  const showAddChannelModal = ref(false)
  const liveLibraries = ref([])
  const channelForm = ref({
    id: null,
    live_library_id: '',
    title: '',
    description: '',
    tagline: '',
    image_poster_url: ''
  })
  const isSubmittingChannel = ref(false)

  const showAddChannelModalFunc = () => {
    channelForm.value = {
      id: null,
      live_library_id: '',
      title: '',
      description: '',
      tagline: '',
      image_poster_url: ''
    }
    showAddChannelModal.value = true
    loadLiveLibraries()
  }

  const loadLiveLibraries = async () => {
    try {
      const response = await liveApi.getLibrary()
      if (Array.isArray(response)) {
        liveLibraries.value = response.map(lib => ({ id: lib.id, name: lib.title || lib.name }))
        if (liveLibraries.value.length > 0 && !channelForm.value.live_library_id) {
          channelForm.value.live_library_id = liveLibraries.value[0].id
        }
      } else {
        liveLibraries.value = []
      }
    } catch (error) {
      console.error('加载直播库列表失败:', error)
      showToast('加载直播库列表失败', 'error')
    }
  }

  const closeAddChannelModal = () => {
    showAddChannelModal.value = false
    channelForm.value = { id: null, live_library_id: '', title: '', description: '', tagline: '', image_poster: '' }
  }

  const submitChannel = async () => {
    if (!channelForm.value.live_library_id) { showToast('请选择直播库', 'warning'); return }
    if (!channelForm.value.title || !channelForm.value.title.trim()) { showToast('请输入频道标题', 'warning'); return }
    isSubmittingChannel.value = true
    try {
      await liveApi.createOrUpdateChannel({
        id: channelForm.value.id,
        live_library_id: channelForm.value.live_library_id,
        title: channelForm.value.title.trim(),
        description: channelForm.value.description.trim() || null,
        tagline: channelForm.value.tagline.trim() || null,
        image_poster_url: channelForm.value.image_poster_url.trim() || null
      })
      showToast('频道添加成功', 'success')
      closeAddChannelModal()
      if (onChannelCreated) onChannelCreated()
    } catch (error) {
      console.error('添加频道失败:', error)
      showToast(error.message || '添加频道失败', 'error')
    } finally {
      isSubmittingChannel.value = false
    }
  }

  // ================= Spotify 同步 =================
  const showSyncModal = ref(false)
  const syncArtistName = ref('')
  const spotifyResults = ref([])
  const selectedSpotifyArtists = ref([])
  const spotifySearching = ref(false)
  const spotifySearched = ref(false)
  const syncSubmitting = ref(false)
  let syncDebounceTimer = null

  const closeSyncModal = () => {
    showSyncModal.value = false
    syncArtistName.value = ''
    spotifyResults.value = []
    selectedSpotifyArtists.value = []
    spotifySearching.value = false
    spotifySearched.value = false
    syncSubmitting.value = false
  }

  const toggleSpotifyArtist = (item) => {
    const idx = selectedSpotifyArtists.value.findIndex(a => a.id === item.id)
    if (idx >= 0) selectedSpotifyArtists.value.splice(idx, 1)
    else selectedSpotifyArtists.value.push(item)
  }

  const handleSyncInput = () => {
    clearTimeout(syncDebounceTimer)
    syncDebounceTimer = setTimeout(() => {
      searchSpotifyArtist()
    }, 500)
  }

  const searchSpotifyArtist = async () => {
    if (!syncArtistName.value.trim()) return
    spotifySearching.value = true
    spotifySearched.value = false
    spotifyResults.value = []
    try {
      const data = await musicApi.spotifySearch(syncArtistName.value.trim(), 'artist', 15)
      spotifyResults.value = data.artists?.items || []
    } catch (error) {
      showToast('Spotify 搜索失败: ' + (error.message || '未知错误'), 'error')
    } finally {
      spotifySearching.value = false
      spotifySearched.value = true
    }
  }

  const submitSync = async () => {
    if (selectedSpotifyArtists.value.length === 0) return
    syncSubmitting.value = true
    const names = selectedSpotifyArtists.value.map(a => a.name)
    try {
      for (const artist of selectedSpotifyArtists.value) {
        await musicApi.syncSpotifyArtist(artist.id)
      }
      showToast(`已同步: ${names.join(', ')}`, 'success')
      showSyncModal.value = false
      syncArtistName.value = ''
      spotifyResults.value = []
      selectedSpotifyArtists.value = []
      if (onMusicDataReload) onMusicDataReload()
    } catch (error) {
      showToast('同步失败: ' + (error.message || '未知错误'), 'error')
    } finally {
      syncSubmitting.value = false
    }
  }

  return {
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
  }
}