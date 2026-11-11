import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { videoApi } from '@/api/endpoints'
import { PickList } from './PickList'

/** 上传/归档的落点：影片级（整部电影）或集级（某部剧的某一集） */
export interface PickTarget {
  item_type: 'vl' | 've'
  item_id: number
  title: string
  /** 所属影片 + 季集：入库后的「查看」要跳到这一集 */
  videoId: number
  season?: number
  episode?: number
}

/**
 * 选一个上传的落点：搜片名 → 电影直接选中，剧集再选季、选集。
 *
 * 不能只给到影片级：剧集的资源与字幕都挂在集上（`ve` + episode_id），
 * 只选到影片会让文件挂不上去。
 */
export function TargetPicker({ onPick }: { onPick: (target: PickTarget) => void }) {
  const [term, setTerm] = useState('')
  const [series, setSeries] = useState<{ videoId: number; title: string; season: number } | null>(null)

  const search = useQuery({
    queryKey: ['upload', 'pick', 'search', term],
    queryFn: () => videoApi.search({ title: term, page: 1, page_size: 8 }),
    enabled: term.trim().length > 0,
  })
  const seasons = useQuery({
    queryKey: ['upload', 'pick', 'seasons', series?.videoId ?? 0],
    queryFn: () => videoApi.seasons(series?.videoId ?? 0),
    enabled: Boolean(series?.videoId),
  })
  const episodes = useQuery({
    queryKey: ['upload', 'pick', 'episodes', series?.videoId ?? 0, series?.season ?? 0],
    queryFn: () => videoApi.episodes(series?.videoId ?? 0, series?.season),
    enabled: Boolean(series?.videoId),
  })

  if (series) {
    return (
      <>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button className="btn btn--quiet" onClick={() => setSeries(null)}>
            换一部
          </button>
          <span className="pick-row__title">{series.title}</span>
        </div>
        {(seasons.data ?? []).length > 1 ? (
          <label className="field">
            <span>季</span>
            <select
              className="input"
              value={series.season}
              onChange={(e) => setSeries({ ...series, season: Number(e.target.value) })}
            >
              {(seasons.data ?? []).map((s) => (
                <option key={s.season_id} value={s.season_number}>
                  {s.season_title || `第 ${s.season_number} 季`}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <PickList loading={episodes.isFetching} count={(episodes.data ?? []).length}>
          {(episodes.data ?? []).map((ep) => {
            const label = ep.episode_title || `第 ${ep.episode_number} 集`
            return (
              <div key={ep.episode_id} className="pick-row">
                <span className="tnum muted pick-row__num">{String(ep.episode_number).padStart(2, '0')}</span>
                <span className="pick-row__title">{label}</span>
                <button
                  className="btn btn--ghost"
                  style={{ marginLeft: 'auto' }}
                  onClick={() =>
                    onPick({
                      item_type: 've',
                      item_id: ep.episode_id,
                      title: `${series.title} · ${label}`,
                      videoId: series.videoId,
                      season: series.season,
                      episode: ep.episode_number,
                    })
                  }
                >
                  选择
                </button>
              </div>
            )
          })}
        </PickList>
      </>
    )
  }

  return (
    <>
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
      <PickList loading={search.isFetching} query={term} count={(search.data?.items ?? []).length}>
        {(search.data?.items ?? []).map((video) => (
          <div key={video.video_id} className="pick-row">
            <span className="pick-row__title">{video.video_title}</span>
            <span className="muted text-xs">
              {video.video_type === 'movie' ? '电影' : '剧集'}
            </span>
            <button
              className="btn btn--ghost"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                if (video.video_type === 'movie') {
                  onPick({ item_type: 'vl', item_id: video.video_id, title: video.video_title, videoId: video.video_id })
                  return
                }
                // 剧集要选到某一集：资源与字幕都挂在集上
                setSeries({ videoId: video.video_id, title: video.video_title, season: 1 })
              }}
            >
              {video.video_type === 'movie' ? '选择' : '选剧集'}
            </button>
          </div>
        ))}
      </PickList>
    </>
  )
}
