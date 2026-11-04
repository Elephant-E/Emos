import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconDots, IconPlus, IconUpload } from '@/components/icons'
import { uploadApi, userApi, videoApi } from '@/api/endpoints'
import { toast } from '@/ui/toast'
import { uploadAndSave, type UploadTarget } from '@/lib/uploader'
import { formatSize } from '@/lib/format'
import { USE_MOCK } from '@/api/client'
import type { VideoItem } from '@/api/types'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [over, setOver] = useState(false)
  const [storage, setStorage] = useState('')
  const [picking, setPicking] = useState<QueueItem | null>(null)
  const [term, setTerm] = useState('')

  const disks = useQuery({ queryKey: ['upload', 'disks'], queryFn: () => uploadApi.disks() })
  const storeFiles = useQuery({
    queryKey: ['upload', 'store', storage],
    queryFn: () => uploadApi.storeFiles(storage),
    enabled: Boolean(storage),
  })
  const candidates = useQuery({
    queryKey: ['upload', 'search', term],
    queryFn: () => videoApi.search({ title: term, page: 1, page_size: 8 }),
    enabled: term.trim().length > 0,
  })

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
          patch(item.id, {
            status: 'ready',
            target: { item_type: String(res.item_type ?? 'vl'), item_id: itemId, title: String(res.title ?? item.file.name) },
          })
        } else {
          patch(item.id, { status: 'need-target', message: String(res.message ?? '无法自动识别') })
        }
      } catch (err) {
        patch(item.id, { status: 'need-target', message: err instanceof Error ? err.message : '识别失败' })
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
      const result = await uploadAndSave(item.file, item.target, (ratio) => patch(item.id, { progress: ratio }))
      patch(item.id, { status: 'done', progress: 1 })
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>存储位置</span>
          <select className="input" style={{ minWidth: 180 }} value={storage} onChange={(e) => setStorage(e.target.value)}>
            {(disks.data ?? []).map((disk) => (
              <option key={disk} value={disk}>
                {disk}
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
          支持多选 · 8 MB 分片 · 单文件上限取决于存储
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
                <th style={{ width: '10%', textAlign: 'right' }}>操作</th>
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
                          <i style={{ width: `${Math.round(item.progress * 100)}%` }} />
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
                      <button className="btn btn--ghost" onClick={() => { setPicking(item); setTerm('') }}>
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
                  <td style={{ textAlign: 'right' }}>
                    {item.status === 'done' ? null : item.status === 'uploading' ? (
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

      <section className="cards cards--wide" style={{ marginTop: 22 }}>
        <article className="card">
          <div className="chart-head">
            <div>
              <p className="stat__label">暂存区</p>
              <p className="stat__value">
                {storeFiles.data?.length ?? 0}
                <small>个文件</small>
              </p>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              {storage || '未选择存储'}
            </span>
          </div>

          {storeFiles.error ? <ErrorBlock bare error={storeFiles.error as Error & { status?: number }} /> : null}
          {!storeFiles.error && storeFiles.data && storeFiles.data.length === 0 ? (
            <EmptyBlock bare title="暂存区是空的" hint="上传完成的文件会先落在这里，再入库到具体影片。" />
          ) : null}
          {storeFiles.data && storeFiles.data.length > 0 ? (
            <table className="table" style={{ marginTop: 12 }}>
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
                    <td className="muted">{file.mime_type}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="row-menu"
                        aria-label="归档"
                        onClick={async () => {
                          try {
                            const res = await uploadApi.archive({ path_type: storage, file_name: file.file_name })
                            toast(`已归档，+${res.carrot} 胡萝卜`, 'success')
                            storeFiles.refetch()
                          } catch (err) {
                            toast(err instanceof Error ? err.message : '归档失败', 'error')
                          }
                        }}
                      >
                        <IconDots />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </article>
      </section>

      {picking ? (
        <Modal title={`选择影片 · ${picking.file.name}`} onClose={() => setPicking(null)} width={520}>
          <label className="field">
            <span>按片名搜索</span>
            <input className="input" autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="输入片名" />
          </label>
          <div style={{ display: 'grid', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
            {candidates.isFetching ? <p className="muted">搜索中…</p> : null}
            {(candidates.data?.items ?? []).map((video: VideoItem) => (
              <div key={video.video_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ fontSize: 13.5, color: 'var(--fg)' }}>{video.video_title}</span>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  #{video.video_id}
                </span>
                <button
                  className="btn btn--ghost"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => {
                    const target = { item_type: 'vl', item_id: video.video_id, title: video.video_title }
                    patch(picking.id, { target, status: 'ready', message: undefined })
                    setPicking(null)
                  }}
                >
                  选择
                </button>
              </div>
            ))}
            {term.trim() && !candidates.isFetching && (candidates.data?.items ?? []).length === 0 ? (
              <p className="muted">没有找到「{term}」</p>
            ) : null}
          </div>
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
}
