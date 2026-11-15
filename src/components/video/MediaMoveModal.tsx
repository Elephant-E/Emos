import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { toast } from '@/ui/toast'
import { mediaApi } from '@/api/endpoints'
import { useEpisodes, useSeasons, useVideoPage } from '@/api/queries'

/**
 * 移动资源：先搜目标影片（留空表示在当前影片内移动），再选季/集。
 *
 * 搜片名、选中的目标影片、当前季这些状态都收在组件里：它们只在「移动」这一件事上有意义，
 * 放在页面上只会让页面替一个弹窗保管 5 个中间态。
 */
export function MediaMoveModal({
  media,
  videoId,
  season,
  currentEpisodeId,
  onClose,
  onMoved,
}: {
  media: { mediaId: string; name: string }
  /** 当前影片 id：不换片时就移到这部影片的其它集 */
  videoId: number
  /** 打开时的当前季，作为「在当前影片内移动」的默认页签 */
  season: number
  /** 当前选中的集 id，用于把「当前位置」那行按钮禁用 */
  currentEpisodeId?: number
  onClose: () => void
  /** 移动成功后由页面刷新资源列表 */
  onMoved: () => void
}) {
  const [target, setTarget] = useState<{ id: number; title: string; type: 'movie' | 'tv' } | null>(null)
  const [term, setTerm] = useState('')
  const [keyword, setKeyword] = useState('')
  const [activeSeason, setActiveSeason] = useState(season)
  const timer = useRef<number | undefined>(undefined)

  const targetId = target?.id ?? videoId
  const search = useVideoPage({ page: 1, page_size: 6, title: keyword || undefined, enabled: Boolean(keyword) })
  const seasons = useSeasons(targetId)
  const episodes = useEpisodes(targetId, activeSeason)

  // 换目标影片后季号要归位，否则会停在上一个影片的季上
  useEffect(() => setActiveSeason(1), [targetId])

  const move = (type: 'vl' | 've', itemId: number, done: string) => {
    mediaApi
      .move(media.mediaId, type, itemId)
      .then(() => {
        toast(done, 'success')
        onMoved()
        onClose()
      })
      .catch((error) => toast(error instanceof Error ? error.message : '移动失败', 'error'))
  }

  return (
    <Modal title={`移动资源 · ${media.name}`} width={460} onClose={onClose}>
      <label className="field">
        <span>目标影片</span>
        <input
          className="input"
          type="search"
          aria-label="搜片名，留空则在当前影片里移动"
          placeholder="搜片名，留空则在当前影片里移动"
          value={term}
          onChange={(e) => {
            const value = e.target.value
            setTerm(value)
            if (!value.trim()) {
              setTarget(null)
              setKeyword('')
              return
            }
            // 每次输入都清掉上一个定时器，否则连打六个字就是六个请求
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => setKeyword(value.trim()), 300)
          }}
        />
      </label>

      {target ? (
        <p className="card-note" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <span>目标：{target.title}</span>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              setTarget(null)
              setTerm('')
              setKeyword('')
            }}
          >
            换一部
          </button>
        </p>
      ) : keyword ? (
        <div className="pick-list">
          {(search.data?.items ?? []).map((v) => (
            <div key={v.video_id} className="pick-row">
              <span className="pick-row__title">{v.video_title}</span>
              <span className="muted text-xs">{v.video_type === 'movie' ? '电影' : '剧集'}</span>
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => {
                  setTarget({ id: v.video_id, title: v.video_title, type: v.video_type === 'movie' ? 'movie' : 'tv' })
                  setKeyword('')
                }}
              >
                选它
              </button>
            </div>
          ))}
          {!search.isLoading && (search.data?.items ?? []).length === 0 ? (
            <p className="card-note">没有找到「{keyword}」</p>
          ) : null}
        </div>
      ) : null}

      {/* 电影没有季集，资源直接挂在影片上；剧集要选到集 */}
      {!keyword && target?.type === 'movie' ? (
        <button
          type="button"
          className="btn btn--primary"
          style={{ marginTop: 'var(--stack)' }}
          onClick={() => move('vl', target.id, `已移到《${target.title}》`)}
        >
          移到这部影片
        </button>
      ) : null}

      {!keyword && (!target || target.type !== 'movie') ? (
        <>
          <div className="tabs pick-tabs__scroll" role="tablist" aria-label="选择季">
            {(seasons.data ?? []).map((s) => (
              <button
                type="button"
                key={s.season_id}
                className="tab pick-tabs__item"
                role="tab"
                aria-selected={s.season_number === activeSeason}
                onClick={() => setActiveSeason(s.season_number)}
              >
                {s.season_title || `第 ${s.season_number} 季`}
              </button>
            ))}
          </div>

          <div className="pick-list">
            {(episodes.data ?? []).map((ep) => {
              const samePlace = !target && ep.episode_id === currentEpisodeId
              return (
                <div key={ep.episode_id} className="pick-row">
                  <span className="tnum muted pick-row__num">{String(ep.episode_number).padStart(2, '0')}</span>
                  <span className="pick-row__title">{ep.episode_title}</span>
                  <button
                    type="button"
                    className="btn btn--quiet"
                    disabled={samePlace}
                    onClick={() => move('ve', ep.episode_id, '已移动')}
                  >
                    {samePlace ? '当前位置' : '移到这里'}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </Modal>
  )
}
