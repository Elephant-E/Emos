import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { PickList } from '@/components/PickList'
import { TargetPicker } from '@/components/TargetPicker'
import { IconPlus, IconUpload } from '@/components/icons'
import { musicApi, uploadApi, userApi, videoApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import {
  DEFAULT_UPLOAD_STORAGE,
  UPLOAD_STORAGES,
  uploadAndSave,
  uploadSong,
  uploadSubtitle,
  type UploadTarget,
} from '@/lib/uploader'
import { detectUploadKind, formatSize, type UploadKind } from '@/lib/format'
import { parseFilename } from '@/lib/filename'
import { USE_MOCK } from '@/api/client'

type Status =
  | 'recognizing'
  | 'need-target'
  | 'need-song'
  | 'ready'
  | 'uploading'
  | 'done'
  | 'failed'
  | 'duplicate'

interface QueueSong {
  song_id: number
  name: string
  artists: string
  has_media: boolean
}

interface QueueItem {
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

const KIND_LABEL: Record<UploadKind, string> = { video: '视频', subtitle: '字幕', music: '音乐' }

/** 从文件名猜一个歌名：去掉扩展名和开头的音轨号，「歌手 - 歌名」取歌名那段 */
function musicTermFromName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/^\d+[\s._-]+/, '')
  const parts = base.split(/\s+-\s+/)
  return (parts.length > 1 ? parts[parts.length - 1] : base).trim()
}

export function UploadView() {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [over, setOver] = useState(false)
  // 上传文件落点（getUploadToken 的 file_storage），取值见 wiki
  const [fileStorage, setFileStorage] = useState<string>(DEFAULT_UPLOAD_STORAGE)
  /** 正在为哪一条选目标 / 选歌曲 */
  const [placing, setPlacing] = useState<{ item: QueueItem; mode: 'target' | 'song' } | null>(null)
  const [songTerm, setSongTerm] = useState('')
  // 正在上传的 id，避免「全部上传」重复启动同一个文件
  const running = useRef(new Set<string>())

  const songs = useQuery({
    queryKey: ['upload', 'song-pick', songTerm],
    queryFn: () => musicApi.songSearch({ name: songTerm, page: 1, page_size: 10 }),
    enabled: placing?.mode === 'song' && songTerm.trim().length > 0,
  })

  const patch = (id: string, changes: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  /** 音乐没有「识别」可用（/api/identify 已 404）：按文件名搜一次，
   *  唯一命中直接绑上，其余交给用户选 */
  const bindSong = async (item: QueueItem) => {
    const term = musicTermFromName(item.file.name)
    setSongTerm(term)
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
    const typed = all
      .map((file) => ({ file, kind: detectUploadKind(file) }))
      .filter((entry): entry is { file: File; kind: UploadKind } => entry.kind !== null)
    if (typed.length !== all.length) {
      toast(`${all.length - typed.length} 个文件类型不支持，已跳过`, 'error')
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

    for (const item of next) {
      if (item.kind === 'music') {
        await bindSong(item)
        continue
      }
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
        const res = (await uploadApi.recognize(item.file.name)) as unknown as Record<string, unknown>
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
    try {
      const digest = await crypto.subtle.digest('SHA-256', await item.file.arrayBuffer())
      const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
      const hits = await musicApi.batchHashExist([hash])
      const hit = hits.find((row) => row.file_hash.toLowerCase() === hash)
      if (hit) {
        patch(item.id, { status: 'duplicate', message: `库里已有同一份音频 · 歌曲 #${hit.music_song_id}` })
        return true
      }
    } catch {
      /* 查重失败不拦上传 */
    }
    return false
  }

  /**
   * 文件名 → 上传落点：
   * 1. 本地解析片名与季集
   * 2. 按片名查影片（video/list），取同名那条
   * 3. 有集号就查这一季的集列表，按集号换 episode_id（剧集必须挂在集上）
   * 任何一步拿不到就返回 null，交给上游 recognize 兜底
   */
  const resolveByFilename = async (fileName: string): Promise<UploadTarget | 'need-target' | null> => {
    const parsed = parseFilename(fileName)
    if (!parsed.title) return null
    try {
      const found = await videoApi.list({ title: parsed.title, page: 1, page_size: 10 })
      const exact = found.items.find((v) => v.video_title === parsed.title)
      const video = exact ?? found.items[0]
      if (!video) return null

      if (parsed.episode != null) {
        const seasonNo = parsed.season ?? 1
        const episodes = await videoApi.episodes(video.video_id, seasonNo)
        const episode = episodes.find((ep) => ep.episode_number === parsed.episode)
        if (!episode) return null
        return {
          item_type: 've',
          item_id: episode.episode_id,
          title: `${video.video_title} · S${String(seasonNo).padStart(2, '0')}E${String(parsed.episode).padStart(2, '0')}`,
          video_id: video.video_id,
          season: seasonNo,
          episode: parsed.episode,
        }
      }

      // 没有集号：电影挂影片级；剧集**不要**回落到上游识别（它会把 S02 判成 S00E02），
      // 直接让人手选是哪一集
      if (video.video_type === 'movie') {
        return { item_type: 'vl', item_id: video.video_id, title: video.video_title, video_id: video.video_id }
      }
      return 'need-target'
    } catch {
      return null
    }
  }

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
        void qc.invalidateQueries({ queryKey: ['subtitles'] })
        void qc.invalidateQueries({ queryKey: ['video', item.target.video_id ?? item.target.item_id] })
        toast(`字幕已入库：${item.target.title}`, 'success')
      } else if (item.kind === 'music' && item.song) {
        const result = await uploadSong(item.file, item.song.song_id, onProgress, fileStorage)
        patch(item.id, { status: 'done', progress: 1 })
        void qc.invalidateQueries({ queryKey: ['music'] })
        void qc.invalidateQueries({ queryKey: ['session'] })
        toast(`《${item.song.name}》入库完成，+${result.carrot} 胡萝卜`, 'success')
      } else if (item.target) {
        const result = await uploadAndSave(item.file, item.target, onProgress, fileStorage)
        patch(item.id, { status: 'done', progress: 1 })
        // 入库会改媒体列表、该影片的资源数与胡萝卜余额
        // 剧集的 item_id 是 episode_id，缓存键要用所属影片
        void qc.invalidateQueries({ queryKey: ['video', item.target.video_id ?? item.target.item_id] })
        void qc.invalidateQueries({ queryKey: ['videos'] })
        void qc.invalidateQueries({ queryKey: ['media'] })
        void qc.invalidateQueries({ queryKey: ['session'] })
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
    const limit = 3
    let cursor = 0
    const worker = async () => {
      while (cursor < pending.length) {
        const item = pending[cursor]
        cursor += 1
        await startUpload(item)
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, pending.length) }, worker))
  }

  const active = queue.filter((item) => item.status !== 'done')
  const readyCount = queue.filter((item) => item.status === 'ready' && (item.target || item.song)).length
  const uploading = queue.some((item) => item.status === 'uploading')

  return (
    <>
      <PageHeader
        crumb={['上传', '入库']}
        title="上传"
        hint={queue.length ? `${queue.length} 个文件` : undefined}
        tools={
          <>
            <span className="stamp">
              <i />
              {USE_MOCK ? '假数据模式' : '直传后端'}
            </span>
            <button type="button" className="btn btn--ghost" onClick={() => userApi.agreeUpload().then(() => toast('已同意上传协议', 'success'))}>
              同意上传协议
            </button>
          </>
        }
      />

      <div className="toolbar">
        <label className="toolbar-field">
          <span>上传落点</span>
          <select
            className="input"
            value={fileStorage}
            onChange={(e) => setFileStorage(e.target.value)}
            aria-label="上传落点"
          >
            {UPLOAD_STORAGES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <span className="muted text-xs">
          {UPLOAD_STORAGES.find((opt) => opt.value === fileStorage)?.hint ?? ''}
        </span>
        <span className="spacer" />
        {readyCount > 0 ? (
          <button type="button" className="btn btn--ghost" disabled={uploading} onClick={() => void uploadAll()}>
            {uploading ? '上传中…' : `全部上传（${readyCount}）`}
          </button>
        ) : null}
        <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()}>
          <IconPlus />
          选择文件
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept="video/*,audio/*,.mkv,.ts,.m2ts,.m4v,.rmvb,.srt,.ass,.ssa,.vtt,.sub,.flac,.ape,.alac,.dsd"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div
        className={`dropzone${over ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
      >
        <IconUpload size={20} />
        <span>把视频、字幕或音乐拖到这里，或点击选择文件</span>
        <span className="muted text-xs">
          视频 MP4/MKV · 字幕 SRT/ASS · 音乐 MP3/FLAC · 可多选
        </span>
      </div>

      {queue.length > 0 ? (
        <div className="table-card" style={{ marginTop: 18 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>文件</th>
                <th style={{ width: '14%' }}>大小</th>
                <th style={{ width: '22%' }}>目标</th>
                <th style={{ width: '14%' }}>状态</th>
                <th style={{ width: '1%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => {
                const placed = item.kind === 'music' ? item.song : item.target
                const placedTitle = item.song
                  ? `${item.song.name}${item.song.artists ? ` · ${item.song.artists}` : ''}`
                  : (item.target?.title ?? '')
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="queue-name">
                        <b title={item.file.name}>{item.file.name}</b>
                        {item.status === 'uploading' ? (
                          <div className="progress-line">
                            <i style={{ transform: `scaleX(${item.progress.toFixed(3)})` }} />
                          </div>
                        ) : (
                          <span>{item.message ?? KIND_LABEL[item.kind]}</span>
                        )}
                      </div>
                    </td>
                    <td className="num muted">{formatSize(item.file.size)}</td>
                    <td>
                      {placed ? (
                        <span style={{ color: 'var(--fg-2)' }}>
                          {placedTitle}
                          {item.existing ? <span className="meta-sm"> · 已有 {item.existing} 个资源</span> : null}
                          {item.song?.has_media ? <span className="meta-sm"> · 已有音频</span> : null}
                        </span>
                      ) : (
                        <button type="button" className="btn btn--ghost" onClick={() => setPlacing({ item, mode: item.kind === 'music' ? 'song' : 'target' })}>
                          {item.kind === 'music' ? '选歌曲' : '选目标'}
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${STATUS[item.status].cls}`}>
                        <i />
                        {STATUS[item.status].label}
                      </span>
                    </td>
                    <td>
                      {item.status === 'done' ? (
                        item.kind === 'music' && item.song ? (
                          <Link className="btn btn--quiet" to="/music/song/$songId" params={{ songId: String(item.song.song_id) }}>
                            查看
                          </Link>
                        ) : item.target ? (
                          <Link
                            className="btn btn--quiet"
                            to="/media/$videoId"
                            // 剧集的 item_id 是 episode_id，跳转要用所属影片
                            params={{ videoId: String(item.target.video_id ?? item.target.item_id) }}
                            search={{ season: item.target.season ?? 1, episode: item.target.episode ?? 1 }}
                          >
                            查看
                          </Link>
                        ) : null
                      ) : item.status === 'duplicate' ? (
                        <span className="muted text-xs">
                          已跳过
                        </span>
                      ) : item.status === 'uploading' ? (
                        <span className="muted">{Math.round(item.progress * 100)}%</span>
                      ) : (
                        <button type="button" className="btn btn--quiet" onClick={() => startUpload(item)}>
                          {item.status === 'need-target' || item.status === 'need-song'
                            ? item.kind === 'music'
                              ? '选歌曲'
                              : '选目标'
                            : item.status === 'failed'
                              ? '重试'
                              : '上传'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="table-foot">
            <span>
              {queue.filter((q) => q.status === 'done').length} 个已入库 · {active.length} 个待处理
            </span>
            <button type="button" className="btn btn--quiet" onClick={() => setQueue((prev) => prev.filter((q) => q.status !== 'done'))}>
              清理已完成
            </button>
          </div>
        </div>
      ) : null}

      {placing?.mode === 'target' ? (
        <Modal
          title={`选择目标 · ${placing.item.file.name}`}
          onClose={() => setPlacing(null)}
          width={460}
          footer={
            <button type="button" className="btn btn--ghost" onClick={() => setPlacing(null)}>
              取消
            </button>
          }
        >
          <TargetPicker
            onPick={(target) => {
              // 字幕传上去还要 save 到这一集，目标必须带上归属影片与季集
              patch(placing.item.id, {
                target: {
                  item_type: target.item_type,
                  item_id: target.item_id,
                  title: target.title,
                  video_id: target.videoId,
                  season: target.season,
                  episode: target.episode,
                },
                status: 'ready',
                message: undefined,
              })
              setPlacing(null)
            }}
          />
        </Modal>
      ) : null}

      {placing?.mode === 'song' ? (
        <Modal
          title={`选择歌曲 · ${placing.item.file.name}`}
          onClose={() => setPlacing(null)}
          width={460}
          footer={
            <button type="button" className="btn btn--ghost" onClick={() => setPlacing(null)}>
              取消
            </button>
          }
        >
          <label className="field">
            <span>按歌名搜索</span>
            <input className="input" autoFocus value={songTerm} onChange={(e) => setSongTerm(e.target.value)} placeholder="输入歌名" />
          </label>
          <PickList loading={songs.isFetching} query={songTerm} count={(songs.data?.items ?? []).length}>
            {(songs.data?.items ?? []).map((song) => (
              <div key={song.song_id} className="pick-row">
                <span className="pick-row__title">{song.name}</span>
                <span className="muted text-xs">
                  {(song.person_artists ?? []).map((a) => a.name).join(' / ')}
                  {song.has_media ? ' · 已有音频' : ''}
                </span>
                <button type="button"
                  className="btn btn--ghost"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => {
                    applySong(placing.item.id, song)
                    setPlacing(null)
                  }}
                >
                  选择
                </button>
              </div>
            ))}
          </PickList>
        </Modal>
      ) : null}
    </>
  )
}

const STATUS: Record<Status, { label: string; cls: string }> = {
  recognizing: { label: '识别中', cls: 'badge--run' },
  'need-target': { label: '待关联', cls: 'badge--wait' },
  'need-song': { label: '待选歌', cls: 'badge--wait' },
  ready: { label: '待上传', cls: 'badge--run' },
  uploading: { label: '上传中', cls: 'badge--run' },
  done: { label: '已入库', cls: 'badge--ok' },
  failed: { label: '失败', cls: 'badge--warn' },
  duplicate: { label: '重复', cls: 'badge--warn' },
}
