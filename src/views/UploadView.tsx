import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CardHead } from '@/components/CardHead'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { TargetPicker } from '@/components/TargetPicker'
import { IconPlus, IconUpload } from '@/components/icons'
import { uploadApi, userApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { DEFAULT_UPLOAD_STORAGE, UPLOAD_STORAGES, uploadAndSave, type UploadTarget } from '@/lib/uploader'
import { formatSize } from '@/lib/format'
import { USE_MOCK } from '@/api/client'

type Status = 'recognizing' | 'need-target' | 'ready' | 'uploading' | 'done' | 'failed'

interface QueueItem {
  id: string
  file: File
  status: Status
  target?: UploadTarget
  progress: number
  message?: string
}

export function UploadView() {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [over, setOver] = useState(false)
  // 暂存区浏览用的盘（/api/upload/store/disk 返回，如 local_emos_1）
  const [storage, setStorage] = useState('')
  // 上传文件落点（getUploadToken 的 file_storage），取值见 wiki
  const [fileStorage, setFileStorage] = useState<string>(DEFAULT_UPLOAD_STORAGE)
  const [archiving, setArchiving] = useState<{ file_name: string } | null>(null)
  const [picking, setPicking] = useState<QueueItem | null>(null)

  const disks = useQuery({ queryKey: ['upload', 'disks'], queryFn: () => uploadApi.disks(), retry: false })
  const storeFiles = useQuery({
    queryKey: ['upload', 'store', storage],
    queryFn: () => uploadApi.storeFiles(storage),
    enabled: Boolean(storage),
    retry: false,
  })
  // 暂存区要单独申请权限（422「请先申请权限后使用」），没有时整块不出现
  const storeDenied = (storeFiles.error as { status?: number } | null)?.status === 422
  const showStore = Boolean(storage) && !storeDenied && !storeFiles.isLoading

  useEffect(() => {
    if (!storage && disks.data?.length) setStorage(disks.data[0])
  }, [disks.data, storage])

  const patch = (id: string, changes: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    const next: QueueItem[] = list.map((file) => ({
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
            target: { item_type: itemType, item_id: itemId, title: String(res.video_title ?? res.title ?? item.file.name) },
          })
          // recognize 是猜的，video/base 给的才是入库后真正显示的名字
          // （剧集形如「【我推的孩子】 - S01E03 - 漫画原作的电视剧」）
          try {
            const base = await uploadApi.videoBase(itemType, itemId)
            if (base?.title) {
              patch(item.id, { target: { item_type: itemType, item_id: itemId, title: base.title } })
            }
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
    patch(item.id, { status: 'uploading', progress: 0, message: undefined })
    try {
      const result = await uploadAndSave(item.file, item.target, (ratio) => patch(item.id, { progress: ratio }), fileStorage)
      patch(item.id, { status: 'done', progress: 1 })
      // 入库会改媒体列表、该影片的资源数与胡萝卜余额
      void qc.invalidateQueries({ queryKey: ['video', item.target.item_id] })
      void qc.invalidateQueries({ queryKey: ['videos'] })
      void qc.invalidateQueries({ queryKey: ['media'] })
      void qc.invalidateQueries({ queryKey: ['session'] })
      toast(`《${item.target.title}》入库完成，+${result.carrot} 胡萝卜`, 'success')
    } catch (err) {
      patch(item.id, { status: 'failed', message: err instanceof Error ? err.message : '上传失败' })
      toast(err instanceof Error ? err.message : '上传失败', 'error')
    }
  }

  const active = queue.filter((item) => item.status !== 'done')

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
        <span className="spacer" />
        <button className="btn btn--primary" onClick={() => inputRef.current?.click()}>
          <IconPlus />
          选择文件
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
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

      {active.length > 0 ? (
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
                        <span>{item.message ?? `${item.file.type || '未知类型'}`}</span>
                      )}
                    </div>
                  </td>
                  <td className="num muted">{formatSize(item.file.size)}</td>
                  <td>
                    {item.target ? (
                      <span style={{ color: 'var(--fg-2)' }}>{item.target.title}</span>
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
                        params={{ videoId: String(item.target.item_id) }}
                        search={{ season: 1, episode: 1 }}
                      >
                        查看
                      </Link>
                    ) : item.status === 'uploading' ? (
                      <span className="muted">{Math.round(item.progress * 100)}%</span>
                    ) : (
                      <button className="btn btn--quiet" onClick={() => startUpload(item)}>
                        {item.status === 'failed' ? '重试' : '上传'}
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

      {showStore ? (
      <section className="cards cards--wide" style={{ marginTop: 22 }}>
        <article className="card">
          <CardHead title="暂存区">
            <span className="row">
              <span className="muted tnum-sm">{storeFiles.data?.length ?? 0} 个文件</span>
              {(disks.data ?? []).length > 1 ? (
                <select
                  className="input"
                  style={{ width: 160 }}
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  aria-label="暂存盘"
                >
                  {(disks.data ?? []).map((disk) => (
                    <option key={disk} value={disk}>
                      {disk}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="muted tnum-sm">{storage}</span>
              )}
            </span>
          </CardHead>
          {/* 暂存区不是常用概念，一句话说清它和「上传」的关系 */}
          <p className="card-note">已传到存储、还没绑定到任何影片的文件</p>

          {storeFiles.error ? <ErrorBlock bare error={storeFiles.error} onRetry={() => storeFiles.refetch()} /> : null}
          {!storeFiles.error && storeFiles.data && storeFiles.data.length === 0 ? (
            <EmptyBlock bare title="暂存区是空的" />
          ) : null}
          {storeFiles.data && storeFiles.data.length > 0 ? (
            <table className="table table--inset" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>文件</th>
                  <th className="num" style={{ width: 100 }}>大小</th>
                  <th style={{ width: 120 }}>类型</th>
                  <th style={{ width: 100 }} />
                </tr>
              </thead>
              <tbody>
                {storeFiles.data.map((file) => (
                  <tr key={file.file_name}>
                    <td style={{ color: 'var(--fg-2)' }}>{file.file_name}</td>
                    <td className="num muted">{formatSize(file.file_size)}</td>
                    <td className="muted">{fileKind(file.file_name, file.mime_type)}</td>
                    <td>
                      <button
                        className="btn btn--quiet"
                        onClick={() => setArchiving({ file_name: file.file_name })}
                      >
                        归档
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </article>
      </section>
      ) : null}

      {archiving ? (
        <Modal
          title={`归档到影片 · ${archiving.file_name}`}
          onClose={() => setArchiving(null)}
          width={460}
          footer={
            <button className="btn btn--ghost" onClick={() => setArchiving(null)}>
              取消
            </button>
          }
        >
          <TargetPicker
            onPick={async (target) => {
              try {
                const res = await uploadApi.archive({
                  item_type: target.item_type,
                  item_id: target.item_id,
                  path_type: storage,
                  file_name: archiving.file_name,
                })
                toast(`已归档到《${target.title}》，+${res.carrot} 胡萝卜`, 'success')
                setArchiving(null)
                storeFiles.refetch()
                // 归档等于给这个落点加了一份资源，各处列表和余额都要刷新
                void qc.invalidateQueries({ queryKey: ['video'] })
                void qc.invalidateQueries({ queryKey: ['videos'] })
                void qc.invalidateQueries({ queryKey: ['media'] })
                void qc.invalidateQueries({ queryKey: ['session'] })
              } catch (err) {
                toast(err instanceof Error ? err.message : '归档失败', 'error')
              }
            }}
          />
        </Modal>
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
              patch(picking.id, { target, status: 'ready', message: undefined })
              setPicking(null)
            }}
          />
        </Modal>
      ) : null}
    </>
  )
}

/** 暂存区里混着视频和字幕，用户要的是「这是什么」而不是 MIME */
function fileKind(name: string, mime: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'ts', 'm2ts'].includes(ext)) return '视频'
  if (mime.startsWith('audio/') || ['mp3', 'flac', 'm4a', 'wav', 'aac'].includes(ext)) return '音频'
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return '图片'
  if (['srt', 'ass', 'ssa', 'vtt', 'sub'].includes(ext) || mime.includes('subrip') || mime.includes('ssa')) return '字幕'
  return '其他'
}

const STATUS: Record<Status, { label: string; cls: string }> = {
  recognizing: { label: '识别中', cls: 'badge--run' },
  'need-target': { label: '待关联', cls: 'badge--wait' },
  ready: { label: '待上传', cls: 'badge--run' },
  uploading: { label: '上传中', cls: 'badge--run' },
  done: { label: '已入库', cls: 'badge--ok' },
  failed: { label: '失败', cls: 'badge--warn' },
}
