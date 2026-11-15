import { musicApi, videoApi } from '@/api/endpoints'
import { episodeCode } from './format'
import { parseFilename } from './filename'
import type { UploadTarget } from './uploader'

/**
 * 上传前的两步解析，从视图里搬出来的纯逻辑（只依赖 api 封装，不碰 React state）：
 *
 * - `resolveTargetByFilename`：文件名 → 上传落点
 * - `findDuplicateMusic`：按文件 sha256 查库里是否已有同一份音频
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
    const video = found.items.find((v) => v.video_title === parsed.title) ?? found.items[0]
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

/** 按 sha256 查重；网络或接口失败一律当作「没查到」，不拦上传 */
export async function findDuplicateMusic(file: File): Promise<{ music_song_id: number } | null> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
    const hits = await musicApi.batchHashExist([hash])
    return hits.find((row) => row.file_hash.toLowerCase() === hash) ?? null
  } catch {
    return null
  }
}

/** 从文件名取歌名：「歌手 - 歌名」取后一段，并去掉开头的音轨号 */
export function musicTermFromName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/^\d+[\s._-]+/, '')
  const parts = base.split(/\s+-\s+/)
  return (parts.length > 1 ? parts[parts.length - 1] : base).trim()
}
