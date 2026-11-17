import { CardHead } from '@/components/CardHead'
import { EmptyBlock, ErrorBlock } from '@/components/StateBlock'
import type { VideoEpisode, VideoSeason } from '@/api/types'

/** 季与集卡（左栏）：季下拉 + 集号矩阵 + 当前集信息；数据与选中状态由页面持有。 */
export function VideoSeasons({
  seasons,
  seasonsError,
  seasonsLoading,
  onRetrySeasons,
  season,
  onPickSeason,
  episodesError,
  episodesLoading,
  onRetryEpisodes,
  seasonEpisodes,
  currentEpisode,
  onPickEpisode,
}: {
  seasons: VideoSeason[]
  seasonsError: unknown
  seasonsLoading: boolean
  onRetrySeasons: () => void
  season: number
  onPickSeason: (seasonNumber: number) => void
  episodesError: unknown
  episodesLoading: boolean
  onRetryEpisodes: () => void
  seasonEpisodes: VideoEpisode[]
  currentEpisode?: VideoEpisode
  onPickEpisode: (seasonNumber: number, episodeNumber: number) => void
}) {
  return (
    <article className="card">
      <CardHead title="季与集">
        <span className="muted tnum-sm">
          共 {seasons.length} 季 · 本季 {seasonEpisodes.length} 集
        </span>
      </CardHead>

      {seasonsError ? <ErrorBlock error={seasonsError} onRetry={onRetrySeasons} /> : null}
      {seasonsLoading ? <div className="skeleton" style={{ height: 34, marginTop: 'var(--stack)' }} /> : null}
      {seasons.length > 0 ? (
        <select
          className="input"
          style={{ marginTop: 'var(--stack)' }}
          value={season}
          aria-label="选择季"
          onChange={(event) => onPickSeason(Number(event.target.value))}
        >
          {seasons.map((s) => (
            <option key={s.season_id} value={s.season_number}>
              {s.season_title || `第 ${s.season_number} 季`}
              {s.episodes_count ? `（${s.episodes_count} 集）` : ''}
            </option>
          ))}
        </select>
      ) : null}

      {episodesError ? <ErrorBlock error={episodesError} onRetry={onRetryEpisodes} /> : null}
      {episodesLoading ? <div className="skeleton" style={{ height: 160, marginTop: 'var(--stack)' }} /> : null}
      {!episodesError && !episodesLoading && seasonEpisodes.length === 0 ? (
        <EmptyBlock title="这一季还没有集" />
      ) : null}

      {seasonEpisodes.length > 0 ? (
        <>
          {/* role=listbox 承诺「一个停靠点 + 方向键」：集数可能上百，
              每个 chip 都在 Tab 顺序里的话根本走不出去 → roving tabindex + ←/→ */}
          <div className="ep-grid" role="listbox" aria-label="选择集">
            {seasonEpisodes.map((ep, index) => {
              const active = currentEpisode?.episode_id === ep.episode_id
              return (
                <button
                  type="button"
                  key={ep.episode_id}
                  role="option"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  className={`ep-chip${active ? ' is-active' : ''}`}
                  title={ep.episode_title || `第 ${ep.episode_number} 集`}
                  onClick={() => onPickEpisode(ep.season_number, ep.episode_number)}
                  onKeyDown={(event) => {
                    const delta =
                      event.key === 'ArrowRight' || event.key === 'ArrowDown'
                        ? 1
                        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                          ? -1
                          : 0
                    const jump = event.key === 'Home' ? 0 : event.key === 'End' ? seasonEpisodes.length - 1 : null
                    const next = jump ?? (delta ? (index + delta + seasonEpisodes.length) % seasonEpisodes.length : null)
                    if (next == null) return
                    event.preventDefault()
                    const target = seasonEpisodes[next]
                    if (!target) return
                    onPickEpisode(target.season_number, target.episode_number)
                    const chips = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.ep-chip')
                    chips?.[next]?.focus()
                  }}
                >
                  {String(ep.episode_number).padStart(2, '0')}
                  {ep.seek ? <span className="ep-chip__dot ep-chip__dot--seek" aria-hidden="true" /> : null}
                  {ep.medias_count > 0 ? <span className="ep-chip__dot" aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>

          {currentEpisode ? (
            <div className="ep-current">
              <span className="ep-current__title">
                {currentEpisode.episode_title || `第 ${currentEpisode.episode_number} 集`}
              </span>
              <span className="meta-sm">
                {currentEpisode.date_air ? `${currentEpisode.date_air.slice(0, 10)} · ` : ''}
                {/* 这里的 `{' '}` 会和 JSX 自身的换行空白叠成两个空格 */}
                {currentEpisode.runtime ? `${currentEpisode.runtime} 分钟` : '—'} ·{' '}
                {`${currentEpisode.medias_count} 资源 · ${currentEpisode.subtitles_count} 字幕`}
                {currentEpisode.seek ? ` · 求片中 ${currentEpisode.seek.seek_carrot ?? 0} 胡萝卜` : ''}
              </span>
              {currentEpisode.episode_description ? (
                <span className="ep-current__desc">{currentEpisode.episode_description}</span>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  )
}
