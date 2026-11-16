import { videoApi } from '@/api/endpoints'
import { episodeCode } from './format'
import { parseFilename } from './filename'
import type { UploadTarget } from './uploader'

/**
 * 上传前的解析，从视图里搬出来的纯逻辑（只依赖 api 封装，不碰 React state）：
 * `resolveTargetByFilename`：文件名 → 上传落点
 */

/**
 * 文件名 → 上传落点：
 * 1. 本地解析片名与季集
 * 2. 按片名查影片（video/list），优先同名那条
 * 3. 有集号就查这一季的集列表，按集号换 episode_id（剧集必须挂在集上）
 * 任何一步拿不到就返回 null，交给上游 recognize 兜底；
 * 「认出是剧集但没集号」返回 `'need-target'`——不能回落到上游识别，
 * 那正是把 `剧名.S02` 判成 `S00E02` 的来源。
 */
export async function resolveTargetByFilename(fileName: string): Promise<UploadTarget | 'need-target' | null> {
  const parsed = parseFilename(fileName)
  if (!parsed.title) return null
  try {
    const found = await videoApi.list({ title: parsed.title, page: 1, page_size: 10 })
    // 只认精确同名：拿搜索结果第一条当落点会把文件静默挂到别的影片下
    const video = found.items.find((v) => v.video_title === parsed.title)
    if (!video) return null

    if (parsed.episode != null) {
      const seasonNo = parsed.season ?? 1
      const episodes = await videoApi.episodes(video.video_id, seasonNo)
      const episode = episodes.find((ep) => ep.episode_number === parsed.episode)
      if (!episode) return null
      return {
        item_type: 've',
        item_id: episode.episode_id,
        title: `${video.video_title} · ${episodeCode(seasonNo, parsed.episode)}`,
        video_id: video.video_id,
        season: seasonNo,
        episode: parsed.episode,
      }
    }

    if (video.video_type === 'movie') {
      return { item_type: 'vl', item_id: video.video_id, title: video.video_title, video_id: video.video_id }
    }
    return 'need-target'
  } catch {
    return null
  }
}
