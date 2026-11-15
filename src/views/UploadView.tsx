import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { qk, useCapabilities } from '@/api/queries'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { PickList } from '@/components/PickList'
import { TargetPicker } from '@/components/TargetPicker'
import { IconPlus, IconUpload } from '@/components/icons'
import { musicApi } from '@/api/endpoints'
import { UPLOAD_STORAGES } from '@/lib/uploader'
import { KIND_LABEL, useUploadQueue, type Status } from '@/lib/use-upload-queue'
import { ConsentDialog } from '@/components/ConsentDialog'
import { formatSize } from '@/lib/format'
import { USE_MOCK } from '@/api/client'

/** 从文件名猜一个歌名：去掉扩展名和开头的音轨号，「歌手 - 歌名」取歌名那段 */
export function UploadView() {
  const caps = useCapabilities()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [consent, setConsent] = useState(false)
  const [songTerm, setSongTerm] = useState('')
  const {
    queue,
    clearDone,
    patch,
    addFiles,
    startUpload,
    uploadAll,
    applySong,
    placing,
    setPlacing,
    readyCount,
    uploading,
    fileStorage,
    setFileStorage,
  } = useUploadQueue({ onSongTerm: setSongTerm })

  const songs = useQuery({
    queryKey: qk.uploadSongs(songTerm),
    queryFn: () => musicApi.songSearch({ name: songTerm, page: 1, page_size: 10 }),
    enabled: placing?.mode === 'song' && songTerm.trim().length > 0,
  })

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
          accept="video/*,audio/*,.mkv,.ts,.m2ts,.m4v,.rmvb,.srt,.ass,.ssa,.vtt,.sub,.flac,.ape,.alac,.dsd"
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
        <div className="table-card" style={{ marginTop: 'var(--gap-card)' }}>
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
            <button type="button" className="btn btn--quiet" onClick={clearDone}>
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
              <button
                type="button"
                key={song.song_id}
                className="pick-row"
                onClick={() => {
                  applySong(placing.item.id, song)
                  setPlacing(null)
                }}
              >
                <span className="pick-row__text">
                  <span className="pick-row__title">{song.name}</span>
                  <span className="pick-row__sub">
                    {(song.person_artists ?? []).map((a) => a.name).join(' / ') || '未知艺人'}
                    {song.has_media ? ' · 已有音频' : ''}
                  </span>
                </span>
              </button>
            ))}
          </PickList>
        </Modal>
      ) : null}
      {consent ? <ConsentDialog kind="upload" onClose={() => setConsent(false)} /> : null}
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
