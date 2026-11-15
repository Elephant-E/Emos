import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { PickList } from '@/components/PickList'
import { Poster } from '@/components/Poster'
import { toast } from '@/ui/toast'
import { VIDEO_TYPE_LABEL } from '@/lib/format'
import { useWatchMutations, useWatchSearch } from '@/api/queries'

/**
 * 添加影片：按片名搜、点「加入」。
 * 搜索词、候选列表与新增 mutation 都只服务这个弹窗，状态一并收进来；
 * 排序值取「当前列表最大值 + 10」，由调用方把当前最大 sort 传进来（它才知道列表）。
 */
export function AddVideoModal({
  watchId,
  maxSort,
  onClose,
}: {
  watchId: number
  /** 当前片单里已有的最大排序值，用于把新条目排在最后 */
  maxSort: number
  onClose: () => void
}) {
  const [term, setTerm] = useState('')
  const candidates = useWatchSearch(watchId, term)
  const { addVideo } = useWatchMutations(watchId)

  return (
    <Modal title="添加影片" onClose={onClose} width={460}>
      <label className="field">
        <span>按片名搜索</span>
        <input
          className="input"
          autoFocus
          value={term}
          placeholder="输入片名"
          onChange={(e) => setTerm(e.target.value)}
        />
      </label>
      <PickList loading={candidates.isFetching} query={term} count={(candidates.data ?? []).length}>
        {(candidates.data ?? []).map((c) => (
          <div key={c.video_id} className="pick-row">
            {c.video_image_poster ? <Poster src={c.video_image_poster} name={String(c.video_title ?? '?')} /> : null}
            <span className="pick-row__text">
              <span style={{ fontSize: 13.5 }}>{c.video_title}</span>
              <span className="meta-sm">
                {VIDEO_TYPE_LABEL[c.video_type]} · {c.video_date_air ?? '—'}
              </span>
            </span>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginLeft: 'auto' }}
              onClick={() =>
                addVideo.mutate(
                  { videoId: c.video_id, sort: maxSort + 10 },
                  { onSuccess: () => toast(`已加入《${c.video_title}》`, 'success') },
                )
              }
              disabled={addVideo.isPending}
            >
              加入
            </button>
          </div>
        ))}
      </PickList>
    </Modal>
  )
}
