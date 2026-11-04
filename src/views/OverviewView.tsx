import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { EmptyBlock, ErrorBlock } from '@/components/StateBlock'
import { useCarrot, usePlayingNow, useRankUpload, useSeekOpen, useSession, useTodos, useZoneCounts } from '@/api/queries'
import { formatSize, formatThousand, VIDEO_TYPE_LABEL } from '@/lib/format'

export function OverviewView() {
  const session = useSession()
  const carrot = useCarrot()
  const zones = useZoneCounts()
  const rank = useRankUpload()
  const seekOpen = useSeekOpen()
  const todos = useTodos()
  const playing = usePlayingNow()

  const now = new Date()
  const monthName = `${now.getMonth() + 1} 月`
  const year = String(now.getFullYear())
  const total = zones.data?.total ?? 0
  const moviePct = total ? Math.round(((zones.data?.movie ?? 0) / total) * 100) : 0

  const error = zones.error ?? rank.error

  return (
    <>
      <PageHeader
        crumb={['概览', `${year} 年`]}
        title={monthName}
        hint={year}
        tools={
          <>
            <span className="stamp">
              <i />
              {playing.isFetching ? '同步中' : `正在播放 ${playing.data?.length ?? 0} 路`}
            </span>
            <button className="btn btn--ghost" onClick={() => playing.refetch()}>
              刷新
            </button>
          </>
        }
      />

      {error ? <ErrorBlock error={error as Error & { status?: number }} onRetry={() => zones.refetch()} /> : null}

      {!error ? (
        <>
          <section className="cards">
            <Link className="card todo" to="/seek" search={{ page: 1, page_size: 20, tab: 'default' }}>
              <p className="stat__label">待处理求片</p>
              <p className="stat__value" style={{ fontSize: 34 }}>
                {todos.data?.seeks === null ? '—' : formatThousand(todos.data?.seeks ?? seekOpen.data)}
                <small>条</small>
              </p>
              <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>用户还在等</p>
            </Link>

            <Link className="card todo" to="/orders" search={{ page: 1, pay: 'paid', delivery: 'pending' }}>
              <p className="stat__label">待发货订单</p>
              <p className="stat__value" style={{ fontSize: 34 }}>
                {todos.data?.orders === null ? '—' : formatThousand(todos.data?.orders)}
                <small>单</small>
              </p>
              <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>已付款未发货</p>
            </Link>

            <Link className="card todo" to="/account" search={{ tab: 'ban' }}>
              <p className="stat__label">封禁中用户</p>
              <p className="stat__value" style={{ fontSize: 34 }}>
                {todos.data?.bans === null ? '—' : formatThousand(todos.data?.bans)}
                <small>人</small>
              </p>
              <p className="stat__delta stat__delta--quiet" style={{ marginTop: 10 }}>可解除</p>
            </Link>
          </section>

          <section className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <StatCard
              label="片库总量"
              value={zones.isLoading ? '—' : formatThousand(total)}
              unit={zones.isLoading ? undefined : '部'}
              delta={zones.isLoading ? undefined : `电影 ${formatThousand(zones.data?.movie)}`}
              deltaSuffix={` · 剧集 ${formatThousand(zones.data?.tv)}`}
            />
            <StatCard
              label="我的胡萝卜"
              value={carrot.isLoading ? '—' : formatThousand(carrot.data?.carrot ?? session.data?.carrot)}
              unit="个"
              delta={session.data?.is_can_upload ? '可上传' : '无上传权限'}
              deltaSuffix={session.data ? ` · 剩余片单槽位 ${session.data.slot_remaining}` : ''}
              tone="amber"
            />
          </section>

          <section className="cards cards--wide">
            <article className="card">
              <div className="chart-head">
                <div>
                  <p className="stat__label">分区构成</p>
                  <p className="stat__value">
                    {zones.isLoading ? '—' : moviePct}
                    <small>% 电影占比</small>
                  </p>
                </div>
                <div className="legend">
                  <span style={{ color: 'var(--c-yellow)' }}>
                    <i />
                    电影 {formatThousand(zones.data?.movie)}
                  </span>
                  <span style={{ color: 'var(--c-green)' }}>
                    <i />
                    剧集 {formatThousand(zones.data?.tv)}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
                {['movie', 'tv'].map((type) => {
                  const value = type === 'movie' ? zones.data?.movie ?? 0 : zones.data?.tv ?? 0
                  const pct = total ? (value / total) * 100 : 0
                  const color = type === 'movie' ? 'var(--c-yellow)' : 'var(--c-green)'
                  return (
                    <div key={type} style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--fg-2)' }}>{VIDEO_TYPE_LABEL[type]}</span>
                        <span className="tnum" style={{ color: 'var(--fg-3)' }}>
                          {formatThousand(value)} 部 · {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: color,
                            boxShadow: `0 0 18px -6px ${color}`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          </section>

          <section className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <article className="card">
              <p className="stat__label">上传榜</p>
              {rank.isLoading ? (
                <div className="skeleton" style={{ height: 160 }} />
              ) : (
                <ol style={{ display: 'grid', gap: 12, marginTop: 8 }}>
                  {(rank.data ?? []).slice(0, 5).map((row) => (
                    <li key={row.username} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                      <span className="tnum" style={{ width: 18, color: 'var(--fg-4)' }}>
                        {row.index}
                      </span>
                      <span className="avatar" style={{ width: 22, height: 22, fontSize: 10.5 }}>
                        {row.username.slice(0, 1)}
                      </span>
                      <span style={{ color: 'var(--fg-2)' }}>{row.username}</span>
                      <span className="tnum" style={{ marginLeft: 'auto', color: 'var(--fg)' }}>
                        {formatSize(row.size)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </article>

            <article className="card">
              <p className="stat__label">正在播放</p>
              {playing.isLoading ? (
                <div className="skeleton" style={{ height: 160 }} />
              ) : playing.data && playing.data.length > 0 ? (
                <ul style={{ display: 'grid', gap: 14, marginTop: 8 }}>
                  {playing.data.slice(0, 3).map((item, i) => (
                    <li key={`${item.video_title}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <img className="poster-img" src={item.video_image_poster ?? ''} alt="" loading="lazy" />
                      <span style={{ display: 'grid', gap: 2 }}>
                        <span style={{ fontSize: 13.5, color: 'var(--fg)' }}>
                          {item.video_title}
                          {item.season_number ? ` S${item.season_number}` : ''}
                          {item.episode_number ? `E${item.episode_number}` : ''}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>
                          {item.upload_pseudonym ?? '—'} · {item.ua}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyBlock title="当前没有播放" hint="有设备开始播放时会出现在这里。" />
              )}
            </article>
          </section>
        </>
      ) : null}

    </>
  )
}
