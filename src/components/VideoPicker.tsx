import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/Modal'
import { PickList } from '@/components/PickList'
import { videoApi } from '@/api/endpoints'
import { useDebounced } from '@/lib/useDebounced'

/**
 * 选一部影片（只取 video_id 与片名）。
 * 关联 MV 这类动作只需要影片 id，不像上传落点那样要选到季集。
 */
export function VideoPicker({
  title,
  onClose,
  onPick,
}: {
  title: string
  onClose: () => void
  onPick: (video: { videoId: number; title: string }) => void
}) {
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')
  useDebounced(term, (next) => setQuery(next), { current: query })

  const videos = useQuery({
    queryKey: ['video-picker', query] as const,
    queryFn: () => videoApi.list({ title: query, page: 1, page_size: 10 }),
    enabled: query.trim().length > 0,
  })

  return (
    <Modal
      title={title}
      width={520}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          取消
        </button>
      }
    >
      <label className="field">
        <span>按片名搜索</span>
        <input
          className="input"
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="输入片名"
        />
      </label>
      <PickList
        loading={videos.isFetching}
        query={query}
        count={(videos.data?.items ?? []).length}
      >
        {(videos.data?.items ?? []).map((video) => (
          <div key={video.video_id} className="pick-row">
            <span className="pick-row__title">{video.video_title}</span>
            <span className="muted text-xs">
              {video.video_type === 'movie' ? '电影' : '剧集'} · #{video.video_id}
            </span>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginLeft: 'auto' }}
              onClick={() => onPick({ videoId: video.video_id, title: video.video_title })}
            >
              选择
            </button>
          </div>
        ))}
      </PickList>
    </Modal>
  )
}
