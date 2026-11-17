import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useCapabilities } from '@/api/queries'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { RecordRow } from '@/components/RecordRow'
import { Badge } from '@/components/Badge'
import { TargetPicker } from '@/components/TargetPicker'
import { IconPlus, IconUpload } from '@/components/icons'
import { UPLOAD_STORAGES } from '@/lib/uploader'
import { KIND_LABEL, useUploadQueue, type Status } from '@/lib/use-upload-queue'
import { ConsentDialog } from '@/components/ConsentDialog'
import { formatSize } from '@/lib/format'

export function UploadView() {
  const caps = useCapabilities()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [consent, setConsent] = useState(false)
  const {
    queue,
    clearDone,
    patch,
    addFiles,
    startUpload,
    uploadAll,
    placing,
    setPlacing,
    readyCount,
    uploading,
    fileStorage,
    setFileStorage,
  } = useUploadQueue()

  const active = queue.filter((item) => item.status !== 'done')

  return (
    <>
      <PageHeader
        crumb={['上传', '入库']}
        title="上传"
        hint={queue.length ? `${queue.length} 个文件` : undefined}
        tools={
          <>
            {!caps.canUpload ? (
              <button type="button" className="btn btn--ghost" onClick={() => setConsent(true)}>
                开通上传权限
              </button>
            ) : null}
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
          accept="video/*,.mkv,.ts,.m2ts,.m4v,.rmvb,.srt,.ass,.ssa,.vtt,.sub"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div
        className={`dropzone${over ? ' is-over' : ''}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
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
        <span className="dropzone__title--desktop">把视频或字幕拖到这里，或点击选择文件</span>
        <span className="dropzone__title--touch">点这里选择文件</span>
        <span className="muted text-xs">
          视频 MP4/MKV · 字幕 SRT/ASS · 可多选
        </span>
      </div>

      {queue.length > 0 ? (
        <div className="upload-queue">
          <RecordRow
            rows={queue}
            idKey={(item) => item.id}
            title={(item) => item.file.name}
            meta={(item) => (
              <>
                <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
                <span>{formatSize(item.file.size)}</span>
                {item.status === 'uploading' ? <span>{Math.round(item.progress * 100)}%</span> : null}
              </>
            )}
            facts={(item) => {
              const placedTitle = item.target?.title ?? ''
              return (
                <>
                  <span>{item.message ?? KIND_LABEL[item.kind]}</span>
                  {placedTitle ? <span className="ellipsis">目标：{placedTitle}</span> : null}
                  {item.existing ? <span>已有 {item.existing} 个资源</span> : null}
                  {item.status === 'uploading' ? (
                    <span className="progress-line">
                      <i style={{ transform: `scaleX(${item.progress.toFixed(3)})` }} />
                    </span>
                  ) : null}
                </>
              )
            }}
            actions={(item) =>
              item.status === 'done' ? (
                item.target ? (
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
                <span className="meta-sm">已跳过</span>
              ) : item.status === 'uploading' ? null : item.status === 'recognizing' ? (
                /* 识别还没回来：此时手选的目标会被识别结果覆盖，先不让点 */
                <span className="meta-sm">识别中…</span>
              ) : (
                <button type="button" className="btn btn--quiet" onClick={() => startUpload(item)}>
                  {item.status === 'need-target' ? '选目标' : item.status === 'failed' ? '重试' : '上传'}
                </button>
              )
            }
          />
          <div className="table-foot">
            <span>
              {queue.filter((q) => q.status === 'done').length} 个已入库 · {active.length} 个待处理
            </span>
            <button type="button" className="btn btn--quiet" onClick={clearDone}>
              清理已完成
            </button>
          </div>
        </div>
      ) : null}

      {placing ? (
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

      {consent ? <ConsentDialog kind="upload" onClose={() => setConsent(false)} /> : null}
    </>
  )
}

const STATUS: Record<Status, { label: string; tone: 'ok' | 'wait' | 'run' | 'warn' | 'off' }> = {
  recognizing: { label: '识别中', tone: 'run' as const },
  'need-target': { label: '待关联', tone: 'wait' as const },
  ready: { label: '待上传', tone: 'run' as const },
  uploading: { label: '上传中', tone: 'run' as const },
  done: { label: '已入库', tone: 'ok' as const },
  failed: { label: '失败', tone: 'warn' as const },
  duplicate: { label: '重复', tone: 'warn' as const },
}
