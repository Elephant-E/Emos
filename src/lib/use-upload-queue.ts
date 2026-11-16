import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { musicApi, uploadApi } from '@/api/endpoints'
import { qk } from '@/api/queries'
import { toast } from '@/ui/toast'
import { detectUploadKind, type UploadKind } from '@/lib/format'
import { findDuplicateMusic, musicTermFromName, resolveTargetByFilename } from '@/lib/upload-resolve'
import { runPool } from '@/lib/concurrency'
import { MUSIC_DISABLED, MUSIC_DISABLED_TITLE } from '@/lib/feature-flags'
import { DEFAULT_UPLOAD_STORAGE, uploadAndSave, uploadSong, uploadSubtitle, type UploadTarget } from '@/lib/uploader'

export const KIND_LABEL: Record<UploadKind, string> = { video: '视频', subtitle: '字幕', music: '音乐' }

export type Status =
  | 'recognizing'
  | 'need-target'
  | 'need-song'
  | 'ready'
  | 'uploading'
  | 'done'
  | 'failed'
  | 'duplicate'

export interface QueueSong {
  song_id: number
  name: string
  artists: string
  has_media: boolean
}

export interface QueueItem {
  id: string
  file: File
  kind: UploadKind
  status: Status
  /** 视频与字幕：绑到某一部影片或某一集 */
  target?: UploadTarget
  /** 音乐：绑到某一首歌 */
  song?: QueueSong
  progress: number
  message?: string
  /** 目标上已有的资源数，上传前先展示 */
  existing?: number
}

/**
 * 上传队列的状态机：收文件、识别落点、绑定歌曲、逐个/批量上传、查重。
 *
 * 这段逻辑原来全在视图里，和渲染混了 300 行；抽出来之后视图只负责呈现，
 * 「队列怎么推进」集中在这一个文件，改并发或改识别策略都不用碰 JSX。
 */
export function useUploadQueue({ onSongTerm }: { onSongTerm?: (term: string) => void } = {}) {
  const qc = useQueryClient()
  const [queue, setQueue] = useState<QueueItem[]>([])
  // 上传文件落点（getUploadToken 的 file_storage），取值见 wiki
  const [fileStorage, setFileStorage] = useState<string>(DEFAULT_UPLOAD_STORAGE)
  /** 正在为哪一条选目标 / 选歌曲 */
  const [placing, setPlacing] = useState<{ item: QueueItem; mode: 'target' | 'song' } | null>(null)
  // 正在上传的 id，避免「全部上传」重复启动同一个文件
  const running = useRef(new Set<string>())

  const patch = (id: string, changes: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  /** 音乐：从文件名里取出歌名搜一次，唯一命中直接绑上，其余交给用户选 */
  const bindSong = async (item: QueueItem) => {
    const term = musicTermFromName(item.file.name)
    onSongTerm?.(term)
    if (!term) {
      patch(item.id, { status: 'need-song', message: '手选一首歌' })
      return
    }
    try {
      const res = await musicApi.songSearch({ name: term, page: 1, page_size: 10 })
      if (res.items.length === 1) {
        const song = res.items[0]
        applySong(item.id, song)
        return
      }
      patch(item.id, {
        status: 'need-song',
        message: res.items.length ? `搜到 ${res.items.length} 首，选一首` : `没搜到「${term}」，换个词`,
      })
    } catch {
      patch(item.id, { status: 'need-song', message: '手选一首歌' })
    }
  }

  const applySong = (id: string, song: { song_id: number; name: string; person_artists?: Array<{ name: string }>; has_media?: boolean }) => {
    patch(id, {
      status: 'ready',
      message: undefined,
      song: {
        song_id: song.song_id,
        name: song.name,
        artists: (song.person_artists ?? []).map((a) => a.name).join(' / '),
        has_media: Boolean(song.has_media),
      },
    })
  }

  const addFiles = async (files: FileList | File[]) => {
    const all = Array.from(files)
    let skippedMusic = 0
    const typed = all
      .map((file) => ({ file, kind: detectUploadKind(file) }))
      .filter((entry): entry is { file: File; kind: UploadKind } => entry.kind !== null)
      // 音乐上传随音乐域一起停用：不静默丢弃，明确告诉用户是功能不可用，而不是文件有问题
      .filter((entry) => {
        if (entry.kind !== 'music' || !MUSIC_DISABLED) return true
        skippedMusic += 1
        return false
      })
    if (skippedMusic > 0) {
      toast(`${skippedMusic} 个音频未加入：${MUSIC_DISABLED_TITLE}`, 'error')
    }
    const unsupported = all.length - typed.length - skippedMusic
    if (unsupported > 0) {
      toast(`${unsupported} 个文件类型不支持，已跳过`, 'error')
    }
    // 同一个文件拖两次没有意义：队列里已有的（失败的不算）直接跳过
    const fresh = typed.filter(
      ({ file }) =>
        !queue.some(
          (item) => item.file.name === file.name && item.file.size === file.size && item.status !== 'failed',
        ),
    )
    if (fresh.length !== typed.length) {
      toast(`${typed.length - fresh.length} 个已在队列里，已跳过`, 'error')
    }
    if (!fresh.length) return

    const next: QueueItem[] = fresh.map(({ file, kind }) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      kind,
      status: 'recognizing',
      progress: 0,
    }))
    setQueue((prev) => [...prev, ...next])

    // 音乐条目互不依赖，并行检索：真机上一次搜索约 2.4 秒，串行会把整批拖成十几秒
    const musicItems = next.filter((item) => item.kind === 'music')
    void Promise.all(musicItems.map((item) => bindSong(item)))

    for (const item of next) {
      if (item.kind === 'music') continue
      // 先用本地解析器拆片名/季/集：上游 recognize 会把「剧名.S02.mkv」判成 S00E02
      const byName = await resolveByFilename(item.file.name)
      if (byName === 'need-target') {
        patch(item.id, { status: 'need-target', message: '只从文件名认出季，手选一下具体哪一集' })
        continue
      }
      if (byName) {
        patch(item.id, { status: 'ready', target: byName })
        continue
      }

      // 视频与字幕都要绑到某一部影片 / 某一集，识别方式相同
      try {
        const res = await uploadApi.recognize(item.file.name)
        const itemId = Number(res.item_id ?? 0)
        if (!itemId) {
          patch(item.id, { status: 'need-target', message: String(res.message ?? '手选一个目标') })
          continue
        }
        const itemType = String(res.item_type ?? 'vl')
        const target: UploadTarget = {
          item_type: itemType,
          item_id: itemId,
          title: String(res.video_title ?? res.title ?? item.file.name),
          video_id: Number(res.video_id ?? 0) || itemId,
          season: Number(res.video_season_number ?? 0) || undefined,
          episode: Number(res.video_episode_number ?? 0) || undefined,
        }
        patch(item.id, { status: 'ready', target })
        // recognize 是猜的，video/base 给的才是入库后真正显示的名字
        // （剧集形如「【我推的孩子】 - S01E03 - 漫画原作的电视剧」）
        try {
          const base = await uploadApi.videoBase(itemType, itemId)
          const medias = base?.video_medias ?? []
          if (item.kind === 'video') {
            // 查重：同一个落点上已经有同样大小的资源，基本就是同一份文件
            const same = medias.find((m) => m.media_file_size === item.file.size)
            if (same) {
              patch(item.id, {
                status: 'duplicate',
                existing: medias.length,
                message: `已存在相同大小的资源：${same.media_name}${
                  same.is_self_upload ? '（本人上传）' : same.user_pseudonym ? `（${same.user_pseudonym}）` : ''
                }`,
              })
              continue
            }
          }
          patch(item.id, {
            existing: item.kind === 'video' ? medias.length : undefined,
            target: { ...target, title: base?.title || target.title },
          })
        } catch {
          /* 拿不到就沿用识别结果，不影响上传 */
        }
      } catch {
        // 识别只是便利，失败时转成「手动选目标」
        patch(item.id, { status: 'need-target', message: '没能识别出是哪一部，手动选一下' })
      }
    }
  }

  /** 音乐文件上传前按 sha256 查重：同一份音频已经在库里就没必要再传一遍 */
  const checkMusicHash = async (item: QueueItem) => {
    const hit = await findDuplicateMusic(item.file)
    if (!hit) return false
    patch(item.id, { status: 'duplicate', message: `库里已有同一份音频 · 歌曲 #${hit.music_song_id}` })
    return true
  }

  const resolveByFilename = (fileName: string) => resolveTargetByFilename(fileName)

  const startUpload = async (item: QueueItem) => {
    if (item.kind === 'music' ? !item.song : !item.target) {
      setPlacing({ item, mode: item.kind === 'music' ? 'song' : 'target' })
      return
    }
    if (running.current.has(item.id)) return
    if (item.kind === 'music' && (await checkMusicHash(item))) return
    running.current.add(item.id)
    patch(item.id, { status: 'uploading', progress: 0, message: undefined })
    const onProgress = (ratio: number) => patch(item.id, { progress: ratio })
    try {
      if (item.kind === 'subtitle' && item.target) {
        await uploadSubtitle(item.file, { item_type: item.target.item_type, item_id: item.target.item_id }, onProgress, fileStorage)
        patch(item.id, { status: 'done', progress: 1 })
        void qc.invalidateQueries({ queryKey: qk.subtitles })
        void qc.invalidateQueries({ queryKey: qk.videoOne(item.target.video_id ?? item.target.item_id) })
        toast(`字幕已入库：${item.target.title}`, 'success')
      } else if (item.kind === 'music' && item.song) {
        const result = await uploadSong(item.file, item.song.song_id, onProgress, fileStorage)
        patch(item.id, { status: 'done', progress: 1 })
        void qc.invalidateQueries({ queryKey: qk.music })
        void qc.invalidateQueries({ queryKey: qk.session })
        toast(`《${item.song.name}》入库完成，+${result.carrot} 胡萝卜`, 'success')
      } else if (item.target) {
        const result = await uploadAndSave(item.file, item.target, onProgress, fileStorage)
        patch(item.id, { status: 'done', progress: 1 })
        // 入库会改媒体列表、该影片的资源数与胡萝卜余额
        // 剧集的 item_id 是 episode_id，缓存键要用所属影片
        void qc.invalidateQueries({ queryKey: qk.videoOne(item.target.video_id ?? item.target.item_id) })
        void qc.invalidateQueries({ queryKey: qk.videos })
        void qc.invalidateQueries({ queryKey: qk.media })
        void qc.invalidateQueries({ queryKey: qk.session })
        toast(`《${item.target.title}》入库完成，+${result.carrot} 胡萝卜`, 'success')
      }
    } catch (err) {
      patch(item.id, { status: 'failed', message: err instanceof Error ? err.message : '上传失败' })
      toast(err instanceof Error ? err.message : '上传失败', 'error')
    } finally {
      running.current.delete(item.id)
    }
  }

  /** 批量上传：按 3 个并发把队列跑完 */
  const uploadAll = async () => {
    const pending = queue.filter((item) => item.status === 'ready' && (item.target || item.song))
    // 同时开 3 个，避免一次性打满带宽
    await runPool(pending, 3, startUpload)
  }

  const active = queue.filter((item) => item.status !== 'done')
  const readyCount = queue.filter((item) => item.status === 'ready' && (item.target || item.song)).length
  const uploading = queue.some((item) => item.status === 'uploading')

  /** 清掉已完成的行 */
  const clearDone = () => setQueue((prev) => prev.filter((item) => item.status !== 'done'))

  return {
    queue,
    clearDone,
    patch,
    addFiles,
    startUpload,
    uploadAll,
    applySong,
    bindSong,
    placing,
    setPlacing,
    active,
    readyCount,
    uploading,
    fileStorage,
    setFileStorage,
  }
}
