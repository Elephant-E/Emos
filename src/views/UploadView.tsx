import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { TargetPicker } from '@/components/TargetPicker'
import { IconPlus, IconUpload } from '@/components/icons'
import { uploadApi, userApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { DEFAULT_UPLOAD_STORAGE, UPLOAD_STORAGES, uploadAndSave, type UploadTarget } from '@/lib/uploader'
import { fileKind, formatSize, isVideoFile } from '@/lib/format'
import { USE_MOCK } from '@/api/client'

type Status = 'recognizing' | 'need-target' | 'ready' | 'uploading' | 'done' | 'failed' | 'duplicate'

interface QueueItem {
  id: string
  file: File
  status: Status
  target?: UploadTarget
  progress: number
  message?: string
  /** 目标上已经有多少资源（上传前先让你看见） */
  existing?: number
}

export function UploadView() {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [over, setOver] = useState(false)
  // 上传文件落点（getUploadToken 的 file_storage），取值见 wiki
  const [fileStorage, setFileStorage] = useState<string>(DEFAULT_UPLOAD_STORAGE)
  const [picking, setPicking] = useState<QueueItem | null>(null)
  // 正在上传的 id，避免「全部上传」重复启动同一个文件
  const running = useRef(new Set<string>())


  const patch = (id: string, changes: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  const addFiles = async (files: FileList | File[]) => {
    const all = Array.from(files)
    // 这一页只走「资源上传」（视频绑到某一集），字幕和图片各有各的入口
    const videos = all.filter(isVideoFile)
    if (videos.length !== all.length) {
      toast(`${all.length - videos.length} 个不是视频文件，已跳过`, 'error')
    }
    // 同一个文件拖两次没有意义：队列里已有的（失败的不算）直接跳过
    const fresh = videos.filter(
      (file) => !queue.some((item) => item.file.name === file.name && item.file.size === file.size && item.status !== 'failed'),
    )
    if (fresh.length !== videos.length) {
      toast(`${videos.length - fresh.length} 个已在队列里，已跳过`, 'error')
    }
    if (!fresh.length) return
    const next: QueueItem[] = fresh.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      status: 'recognizing',
      progress: 0,
    }))
    setQueue((prev) => [...prev, ...next])

    for (const item of next) {
      try {
        const res = (await uploadApi.recognize(item.file.name)) as unknown as Record<string, unknown>
        const itemId = Number(res.item_id ?? 0)
        if (itemId) {
          const itemType = String(res.item_type ?? 'vl')
          patch(item.id, {
            status: 'ready',
            target: {
              item_type: itemType,
              item_id: itemId,
              title: String(res.video_title ?? res.title ?? item.file.name),
              video_id: Number(res.video_id ?? 0) || itemId,
              season: Number(res.video_season_number ?? 0) || undefined,
              episode: Number(res.video_episode_number ?? 0) || undefined,
            },
          })
          // recognize 是猜的，video/base 给的才是入库后真正显示的名字
          // （剧集形如「【我推的孩子】 - S01E03 - 漫画原作的电视剧」）
          try {
            const base = await uploadApi.videoBase(itemType, itemId)
            const medias = base?.video_medias ?? []
            // 查重：同一个落点上已经有同样大小的资源，基本就是同一份文件
            const same = medias.find((m) => m.media_file_size === item.file.size)
            if (same) {
              patch(item.id, {
                status: 'duplicate',
                existing: medias.length,
                message: `已存在相同大小的资源：${same.media_name}${same.is_self_upload ? '（本人上传）' : same.user_pseudonym ? `（${same.user_pseudonym}）` : ''}`,
              })
              continue
            }
            patch(item.id, {
              existing: medias.length,
              target: {
                item_type: itemType,
                item_id: itemId,
                title: base?.title || String(res.video_title ?? res.title ?? item.file.name),
                video_id: Number(res.video_id ?? 0) || itemId,
                season: Number(res.video_season_number ?? 0) || undefined,
                episode: Number(res.video_episode_number ?? 0) || undefined,
              },
            })
          } catch {
            /* 拿不到就沿用识别结果，不影响上传 */
          }
        } else {
          patch(item.id, { status: 'need-target', message: String(res.message ?? '无法自动识别') })
        }
      } catch {
        // 识别只是个便利，失败不该挡路：直接转成「手动选目标」
        patch(item.id, { status: 'need-target', message: '没能识别出是哪一部，手动选一下' })
      }
    }
  }

  const startUpload = async (item: QueueItem) => {
    if (!item.target) {
      setPicking(item)
      return
    }
    if (running.current.has(item.id)) return
    running.current.add(item.id)
    patch(item.id, { status: 'uploading', progress: 0, message: undefined })
    try {
      const result = await uploadAndSave(item.file, item.target, (ratio) => patch(item.id, { progress: ratio }), fileStorage)
      patch(item.id, { status: 'done', progress: 1 })
      // 入库会改媒体列表、该影片的资源数与胡萝卜余额
      // 剧集的 item_id 是 episode_id，缓存键要用所属影片
      void qc.invalidateQueries({ queryKey: ['video', item.target.video_id ?? item.target.item_id] })
      void qc.invalidateQueries({ queryKey: ['videos'] })
      void qc.invalidateQueries({ queryKey: ['media'] })
      void qc.invalidateQueries({ queryKey: ['session'] })
      toast(`《${item.target.title}》入库完成，+${result.carrot} 胡萝卜`, 'success')
    } catch (err) {
      patch(item.id, { status: 'failed', message: err instanceof Error ? err.message : '上传失败' })
      toast(err instanceof Error ? err.message : '上传失败', 'error')
    } finally {
      running.current.delete(item.id)
    }
  }

  /** 一批文件不可能一个个点：按 3 个并发把它们跑完 */
  const uploadAll = async () => {
    const pending = queue.filter((item) => item.status === 'ready' && item.target)
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
  const readyCount = queue.filter((item) => item.status === 'ready' && item.target).length
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
            <button className="btn btn--ghost" onClick={() => userApi.agreeUpload().then(() => toast('已同意上传协议', 'success'))}>
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
        <span className="muted" style={{ fontSize: 12 }}>
          {UPLOAD_STORAGES.find((opt) => opt.value === fileStorage)?.hint ?? ''}
        </span>
        <span className="spacer" />
        {readyCount > 0 ? (
          <button className="btn btn--ghost" disabled={uploading} onClick={() => void uploadAll()}>
            {uploading ? '上传中…' : `全部上传（${readyCount}）`}
          </button>
        ) : null}
        <button className="btn btn--primary" onClick={() => inputRef.current?.click()}>
          <IconPlus />
          选择文件
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept="video/*,.mkv,.ts,.m2ts,.rmvb"
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
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
      >
        <IconUpload size={20} />
        <span>把视频拖到这里，或点击选择文件</span>
        <span className="muted" style={{ fontSize: 12 }}>
          支持多选，单个文件大小由所选存储决定
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
                <th style={{ width: '10%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="queue-name">
                      <b title={item.file.name}>{item.file.name}</b>
                      {item.status === 'uploading' ? (
                        <div className="progress-line">
                          <i style={{ transform: `scaleX(${item.progress.toFixed(3)})` }} />
                        </div>
                      ) : (
                        <span>{item.message ?? fileKind(item.file.name, item.file.type)}</span>
                      )}
                    </div>
                  </td>
                  <td className="num muted">{formatSize(item.file.size)}</td>
                  <td>
                    {item.target ? (
                      <span style={{ color: 'var(--fg-2)' }}>
                        {item.target.title}
                        {item.existing ? <span className="meta-sm"> · 已有 {item.existing} 个资源</span> : null}
                      </span>
                    ) : (
                      <button className="btn btn--ghost" onClick={() => setPicking(item)}>
                        选择影片
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
                    {item.status === 'done' && item.target ? (
                      <Link
                        className="btn btn--quiet"
                        to="/media/$videoId"
                        // 剧集的 item_id 是 episode_id，跳转要用所属影片
                        params={{ videoId: String(item.target.video_id ?? item.target.item_id) }}
                        search={{ season: item.target.season ?? 1, episode: item.target.episode ?? 1 }}
                      >
                        查看
                      </Link>
                    ) : item.status === 'duplicate' ? (
                      <span className="muted" style={{ fontSize: 12 }}>已跳过</span>
                    ) : item.status === 'uploading' ? (
                      <span className="muted">{Math.round(item.progress * 100)}%</span>
                    ) : (
                      <button className="btn btn--quiet" onClick={() => startUpload(item)}>
                        {item.status === 'need-target' ? '选目标' : item.status === 'failed' ? '重试' : '上传'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-foot">
            <span>{queue.filter((q) => q.status === 'done').length} 个已入库 · {active.length} 个待处理</span>
            <button className="btn btn--quiet" onClick={() => setQueue((prev) => prev.filter((q) => q.status !== 'done'))}>
              清理已完成
            </button>
          </div>
        </div>
      ) : null}

      {picking ? (
        <Modal
          title={`选择目标 · ${picking.file.name}`}
          onClose={() => setPicking(null)}
          width={460}
          footer={
            <button className="btn btn--ghost" onClick={() => setPicking(null)}>
              取消
            </button>
          }
        >
          <TargetPicker
            onPick={(target) => {
              patch(picking.id, {
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
              setPicking(null)
            }}
          />
        </Modal>
      ) : null}
    </>
  )
}

const STATUS: Record<Status, { label: string; cls: string }> = {
  recognizing: { label: '识别中', cls: 'badge--run' },
  'need-target': { label: '待关联', cls: 'badge--wait' },
  ready: { label: '待上传', cls: 'badge--run' },
  uploading: { label: '上传中', cls: 'badge--run' },
  done: { label: '已入库', cls: 'badge--ok' },
  failed: { label: '失败', cls: 'badge--warn' },
  duplicate: { label: '重复', cls: 'badge--warn' },
}
