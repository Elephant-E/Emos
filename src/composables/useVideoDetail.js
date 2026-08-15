import { ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import videoApi from '@/api/videoApi.js'
import seekApi from '@/api/seekApi.js'
import { showToast } from '@/utils/toast.js'

/**
 * 视频详情核心数据域：加载详情、季/集、资源列表、同步、求片。
 * 与原实现行为保持一致。
 */
export function useVideoDetail() {
  const route = useRoute()
  const router = useRouter()

  // ================= 状态 =================
  const videoData = ref(null)
  const videoId = ref(route.params.id)
  const isLoading = ref(true)
  const isSyncing = ref(false)
  const isLoadingResources = ref(false) // 资源加载状态（与资源操作域共享）

  // 季列表、集列表、资源列表
  const seasons = ref([])
  const episodes = ref({}) // { season_id: [episodes] }
  const resources = ref([]) // 当前选中的集的资源列表
  const expandedSeasons = ref({}) // { season_id: boolean } 跟踪哪些季被展开
  const selectedEpisode = ref(null) // 当前选中的集
  const allEpisodesData = ref([]) // 存储所有集的原始数据

  // ================= 工具 =================

  // 解析视频ID，提取纯数字部分
  const getNumericId = (id) => {
    if (!id) return null
    // 如果是以 vl- 开头的片单ID，提取后面的数字
    if (typeof id === 'string' && id.startsWith('vl-')) {
      return parseInt(id.replace('vl-', ''))
    }
    // 否则直接返回数字
    return typeof id === 'number' ? id : parseInt(id)
  }

  // 格式化类型
  const formatVideoType = (type) => {
    return type === 'movie' ? '电影' : '电视剧'
  }

  // 格式化分类
  const formatGenres = (genres) => {
    if (!genres || genres.length === 0) return ''

    if (typeof genres[0] === 'object') {
      return genres.slice(0, 2).map(g => g.name).join(' · ')
    }

    return genres.slice(0, 2).join(' · ')
  }

  // ================= 资源数据 =================

  // 加载指定集的资源列表
  const loadResourcesForEpisode = async (seasonId, episodeId) => {
    isLoadingResources.value = true
    try {
      const params = {
        video_list_id: getNumericId(videoId.value)
      }

      if (seasonId != null) {
        params.video_season_id = seasonId
      }
      if (episodeId != null) {
        params.video_episode_id = episodeId
      }

      const result = await videoApi.getMediaList(params)
      resources.value = result || []
    } catch (error) {
      console.error('加载资源列表失败:', error)
      showToast('加载资源列表失败', 'error')
      resources.value = []
    } finally {
      isLoadingResources.value = false
    }
  }

  // 加载电影资源列表（与模板 openResourcesModal 联动）
  const loadResourcesForMovie = async () => {
    isLoadingResources.value = true
    try {
      const response = await videoApi.getMediaList({
        video_list_id: getNumericId(videoId.value),
        video_episode_id: '',
        video_part_id: ''
      })
      const result = Array.isArray(response) ? response : (response.data || [])
      resources.value = result
    } catch (error) {
      console.error('加载电影资源失败:', error)
      showToast('加载资源失败', 'error')
    } finally {
      isLoadingResources.value = false
    }
  }

  // ================= 季/集 =================

  // 加载季和集列表
  const loadSeasonsAndEpisodes = async () => {
    try {
      // 获取所有集的列表（包含季信息）
      const result = await videoApi.getEpisodes(getNumericId(videoId.value), {
        with_seek_is_request: 1
      })

      allEpisodesData.value = result || []

      // 从集数据中提取季信息
      const seasonMap = new Map()
      allEpisodesData.value.forEach(episode => {
        if (!seasonMap.has(episode.season_id)) {
          seasonMap.set(episode.season_id, {
            season_id: episode.season_id,
            season_number: episode.season_number,
            episodes_count: 0
          })
        }
        seasonMap.get(episode.season_id).episodes_count++
      })

      // 转换为数组并排序
      seasons.value = Array.from(seasonMap.values())
        .sort((a, b) => a.season_number - b.season_number)

      // 按season_id分组集数据
      allEpisodesData.value.forEach(episode => {
        if (!episodes.value[episode.season_id]) {
          episodes.value[episode.season_id] = []
        }
        episodes.value[episode.season_id].push(episode)
      })

      // 默认不展开任何季
      // if (seasons.value.length > 0) {
      //   expandedSeasons.value[seasons.value[0].season_id] = true
      // }
    } catch (error) {
      console.error('加载季和集列表失败:', error)
      showToast('加载季和集列表失败', 'error')
    }
  }

  // 切换季的展开/折叠状态
  const toggleSeason = (season) => {
    const seasonId = season.season_id
    if (expandedSeasons.value[seasonId]) {
      expandedSeasons.value[seasonId] = false
    } else {
      expandedSeasons.value[seasonId] = true
    }
  }

  // 判断季的资源状态
  const getSeasonResourceStatus = (seasonId) => {
    const seasonEpisodes = episodes.value[seasonId]
    if (!seasonEpisodes || seasonEpisodes.length === 0) {
      return 'incomplete'
    }
    const allHaveResources = seasonEpisodes.every(episode => episode.medias_count > 0)
    return allHaveResources ? 'complete' : 'incomplete'
  }

  // 选择集并加载资源列表
  const selectEpisode = async (episode) => {
    selectedEpisode.value = episode
    await loadResourcesForEpisode(episode.video_season_id, episode.video_episode_id)
  }

  // ================= 详情 =================

  // 加载视频详情
  const loadVideoDetail = async () => {
    try {
      const response = await videoApi.list({
        video_id: getNumericId(videoId.value)
      })

      if (!response || !response.items || response.items.length === 0) {
        showToast('视频不存在', 'error')
        return
      }

      const apiData = response.items[0]

      // 合并 API 数据
      videoData.value = {
        video_id: apiData.video_id,
        video_title: apiData.video_title,
        video_title_original: apiData.video_origin_title || apiData.video_title,
        video_date_air: apiData.video_date_air,
        video_type: apiData.video_type,
        video_image_poster: apiData.video_image_poster,
        video_image_backdrop: apiData.video_image_backdrop,
        video_image_logo: apiData.video_image_logo || null,
        genres: apiData.genres || [],
        overview: apiData.video_description || '',
        tmdb_id: apiData.tmdb_id,
        tmdb_url: apiData.tmdb_url,
        todb_id: apiData.todb_id,
        medias_count: apiData.medias_count || 0,
        request_count: apiData.request_count || 0,
        seek_is_request: apiData.seek_is_request || false
      }

      // 如果是电视剧，加载季列表
      if (apiData.video_type === 'tv') {
        await loadSeasonsAndEpisodes()
      } else {
        // 电影直接加载资源列表
        await loadResourcesForEpisode(null, null)
      }
    } catch (error) {
      console.error('加载视频详情失败:', error)
      showToast('加载视频详情失败', 'error')
    } finally {
      isLoading.value = false
    }
  }

  // 返回上一页
  const goBack = () => {
    // 使用 nextTick 确保 UI 先响应点击
    nextTick(() => {
      // 如果有历史记录，返回上一页
      if (window.history.length > 1) {
        router.back()
      } else {
        // 否则跳转到媒体页面
        router.push('/media')
      }
    })
  }

  // ================= 同步/求片 =================

  // 同步资料功能
  const handleSyncData = async () => {
    if (isSyncing.value) return

    if (!videoData.value?.tmdb_id) {
      showToast('缺少 TMDB ID', 'error')
      return
    }

    isSyncing.value = true
    try {
      const result = await videoApi.sync({
        tmdb_id: videoData.value.tmdb_id
      })

      if (result && result.length > 0) {
        showToast(`已开始同步 ${result.length} 个资源`, 'success')
      } else {
        showToast('同步请求已发送，请稍后刷新查看', 'success')
      }
    } catch (error) {
      console.error('同步失败:', error)
      showToast(error.message || '同步失败', 'error')
    } finally {
      isSyncing.value = false
    }
  }

  // 集列表求片功能
  const handleEpisodeSeekRequest = async (episode) => {
    try {
      const response = await seekApi.apply('ve', episode.episode_id)

      // 更新本地状态
      episode.with_seek_is_request = !episode.with_seek_is_request

      if (episode.with_seek_is_request) {
        showToast('求片成功', 'success')
      } else {
        showToast('已取消求片', 'info')
      }
    } catch (error) {
      console.error('求片操作失败:', error)
      showToast('求片操作失败', 'error')
    }
  }

  return {
    videoData,
    videoId,
    isLoading,
    isSyncing,
    isLoadingResources,
    seasons,
    episodes,
    resources,
    expandedSeasons,
    selectedEpisode,
    allEpisodesData,
    getNumericId,
    formatVideoType,
    formatGenres,
    loadResourcesForEpisode,
    loadResourcesForMovie,
    loadSeasonsAndEpisodes,
    toggleSeason,
    getSeasonResourceStatus,
    selectEpisode,
    loadVideoDetail,
    goBack,
    handleSyncData,
    handleEpisodeSeekRequest,
  }
}