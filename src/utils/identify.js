import identifyApi from '@/api/identifyApi.js'
import musicApi from '@/api/musicApi.js'
import uploadApi from '@/api/uploadApi.js'
import { normalizeList } from '@/utils/format.js'

/**
 * 上传文件识别逻辑（纯函数化）。
 * 从 upload store 拆分：identifyVideoFile / identifyMusicFile 的决策逻辑，
 * 返回对队列项要应用的变更（patches），由调用方写入响应式队列。
 *
 * 返回统一结构：
 *   { patches: { videoInfo?, musicCandidates?, existingMedias?, status, error? }, error? }
 * - 成功路径：patches 含最终状态
 * - 失败路径：patches.status = 'failed' + error（或返回 { error } 由调用方处理）
 */

/**
 * 识别视频文件：调用 TMDB 识别 → 查重 → 返回队列项变更。
 * @param {string} fileName 文件名
 * @param {number} fileSize 文件大小（用于查重）
 */
export async function identifyVideoFile(fileName, fileSize) {
  try {
    const result = await identifyApi.identify(fileName, 'video')

    const patches = {
      videoInfo: {
        title: result.title,
        season: result.season,
        episode: result.episode,
        video_type: result.season ? 'tv' : 'movie',
        item_type: result.item_type,
        item_id: result.item_id
      },
      status: 'ready'
    }

    // 查重：获取基本信息，检查相同大小资源
    try {
      const baseInfo = await uploadApi.getVideoBase(result.item_type, result.item_id)
      const existingMedias = baseInfo?.video_medias || []
      const duplicate = existingMedias.find(m => m.media_file_size === fileSize)
      if (duplicate) {
        return {
          patches: {
            videoInfo: patches.videoInfo,
            status: 'failed',
            error: `已存在相同大小的资源 (${duplicate.media_name || duplicate.media_id}${duplicate.is_self_upload ? '，本人上传' : ''})`
          }
        }
      }
      if (existingMedias.length > 0) {
        patches.existingMedias = existingMedias
      }
    } catch {
      // 获取基本信息失败不影响上传流程
    }

    return { patches }
  } catch (error) {
    return {
      patches: {
        status: 'failed',
        error: error.message || '识别失败'
      }
    }
  }
}

/**
 * 识别音乐文件：调用识别 → 搜索歌曲 → 返回队列项变更。
 * 可能结果：
 * - 搜索无结果 → failed
 * - 唯一匹配 → ready（直接关联歌曲）
 * - 多候选 → selecting（等待用户选择）
 */
export async function identifyMusicFile(fileName) {
  try {
    const result = await identifyApi.identify(fileName, 'music')
    const songName = result.title
    const artistName = result.artist || null

    const searchParams = { name: songName, page: 1, page_size: 10 }
    if (artistName) searchParams.person_name_artist = artistName

    const searchResult = await musicApi.songSearch(searchParams)
    const items = normalizeList(searchResult)

    if (items.length === 0) {
      return {
        patches: {
          status: 'failed',
          error: `音乐搜索无结果: "${songName}${artistName ? ' - ' + artistName : ''}"`
        }
      }
    }

    if (items.length === 1) {
      const song = items[0]
      return {
        patches: {
          videoInfo: {
            title: song.name,
            item_type: 'music',
            item_id: song.song_id,
            song_id: song.song_id,
            person_artists: song.person_artists || []
          },
          status: 'ready'
        }
      }
    }

    // 多个候选：进入选择状态
    return {
      patches: {
        musicCandidates: items,
        videoInfo: {
          title: songName,
          item_type: 'music'
        },
        status: 'selecting'
      }
    }
  } catch (error) {
    return {
      patches: {
        status: 'failed',
        error: error.message || '音乐识别失败'
      }
    }
  }
}

export default { identifyVideoFile, identifyMusicFile }