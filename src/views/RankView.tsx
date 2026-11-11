import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Tabs } from '@/components/Tabs'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Poster } from '@/components/Poster'
import { rankApi } from '@/api/endpoints'
import { formatDateTime, formatSize, formatThousand } from '@/lib/format'

const TABS = [
  { key: 'carrot' as const, label: '萝卜' },
  { key: 'upload' as const, label: '上传量' },
  { key: 'sign' as const, label: '签到' },
  { key: 'playing' as const, label: '正在播放' },
  { key: 'live' as const, label: '直播' },
]

export type RankTab = (typeof TABS)[number]['key']

export interface RankSearch {
  tab: RankTab
}

/** 榜单都是「前 30 条、10 分钟缓存」，一次拉完，不分页 */
export function RankView({ search, onSearch }: { search: RankSearch; onSearch: (patch: Partial<RankSearch>) => void }) {
  const tab = search.tab
  const carrot = useQuery({ queryKey: ['rank', 'carrot'], queryFn: rankApi.carrot, enabled: tab === 'carrot', staleTime: 5 * 60_000 })
  const upload = useQuery({ queryKey: ['rank', 'upload'], queryFn: rankApi.upload, enabled: tab === 'upload', staleTime: 5 * 60_000 })
  const sign = useQuery({ queryKey: ['rank', 'sign'], queryFn: rankApi.sign, enabled: tab === 'sign', staleTime: 5 * 60_000 })
  const playing = useQuery({
    queryKey: ['rank', 'playing'],
    queryFn: rankApi.playingVideo,
    enabled: tab === 'playing',
    // 「最近 3 分钟」的数据，页面上停着不动没意义，但也不必每秒刷
    refetchInterval: tab === 'playing' ? 60_000 : false,
  })
  const live = useQuery({
    queryKey: ['rank', 'live'],
    queryFn: rankApi.playingLive,
    enabled: tab === 'live',
    refetchInterval: tab === 'live' ? 60_000 : false,
  })

  const current = { carrot, upload, sign, playing, live }[tab]
  const rows = current.data

  return (
    <>
      <PageHeader crumb={['运营', '榜单']} title="榜单" hint="前 30 名，10 分钟缓存" />

      <div className="toolbar">
        <Tabs items={TABS} value={tab} onChange={(next) => onSearch({ tab: next })} label="榜单" />
      </div>

      {current.error ? <ErrorBlock error={current.error} onRetry={() => current.refetch()} /> : null}
      {current.isLoading ? <LoadingBlock rows={8} columns={4} /> : null}

      {!current.error && !current.isLoading && (rows?.length ?? 0) === 0 ? <EmptyBlock title="还没有数据" /> : null}

      {!current.error && (rows?.length ?? 0) > 0 ? (
        <div className="table-card">
          {tab === 'carrot' ? (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 64 }} className="num">#</th>
                  <th>用户</th>
                  <th className="num" style={{ width: '20%' }}>胡萝卜</th>
                </tr>
              </thead>
              <tbody>
                {(carrot.data ?? []).map((row) => (
                  <tr key={`${row.index}-${row.username}`}>
                    <td className="num muted tnum">{row.index}</td>
                    <td>
                      <div className="cell-title">
                        <span className="thumb">{row.username.slice(0, 1)}</span>
                        <span>
                          <span className="cell-title__name">{row.username}</span>
                          {row.level_name ? <span className="cell-title__code">{row.level_name}</span> : null}
                        </span>
                      </div>
                    </td>
                    <td className="num">{formatThousand(row.carrot)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === 'upload' ? (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 64 }} className="num">#</th>
                  <th>用户</th>
                  <th className="num" style={{ width: '20%' }}>上传量</th>
                </tr>
              </thead>
              <tbody>
                {(upload.data ?? []).map((row) => (
                  <tr key={`${row.index}-${row.username}`}>
                    <td className="num muted tnum">{row.index}</td>
                    <td>
                      <div className="cell-title">
                        <span className="thumb">{row.username.slice(0, 1)}</span>
                        <span className="cell-title__name">{row.username}</span>
                      </div>
                    </td>
                    <td className="num">{formatSize(row.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === 'sign' ? (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 64 }} className="num">#</th>
                  <th>用户</th>
                  <th style={{ width: '18%' }}>签到时间</th>
                  <th className="num" style={{ width: '12%' }}>胡萝卜</th>
                  <th className="num" style={{ width: '12%' }}>连续天数</th>
                </tr>
              </thead>
              <tbody>
                {(sign.data ?? []).map((row) => (
                  <tr key={`${row.sign_index}-${row.username}`}>
                    <td className="num muted tnum">{row.sign_index}</td>
                    <td>
                      <div className="cell-title">
                        <span className="thumb">{row.username.slice(0, 1)}</span>
                        <span className="cell-title__name">{row.username}</span>
                      </div>
                    </td>
                    <td className="muted">{formatDateTime(row.sign_at)}</td>
                    <td className="num">+{formatThousand(row.earn_point)}</td>
                    <td className="num muted">{formatThousand(row.continuous_days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === 'playing' ? (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '36%' }}>在看</th>
                  <th style={{ width: '16%' }}>季集</th>
                  <th>用户</th>
                  <th className="num" style={{ width: '12%' }}>倍速</th>
                  <th style={{ width: '18%' }}>客户端</th>
                </tr>
              </thead>
              <tbody>
                {(playing.data ?? []).map((row, index) => (
                  <tr key={`${row.username}-${row.video_title}-${index}`}>
                    <td>
                      <div className="cell-title">
                        {row.video_image_poster ? (
                          <Poster src={row.video_image_poster} name={row.video_title} />
                        ) : (
                          <span className="thumb">{row.video_title.slice(0, 1)}</span>
                        )}
                        <span className="cell-title__name">{row.video_title}</span>
                      </div>
                    </td>
                    <td className="muted">
                      {row.season_number != null
                        ? `S${String(row.season_number).padStart(2, '0')}E${String(row.episode_number ?? 0).padStart(2, '0')}`
                        : '—'}
                    </td>
                    <td className="muted">{row.username}</td>
                    <td className="num muted">{row.play_speed ? `${(row.play_speed / 10).toFixed(1)}×` : '—'}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{row.ua ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === 'live' ? (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>频道</th>
                  <th>用户</th>
                  <th style={{ width: '18%' }}>已看</th>
                  <th style={{ width: '22%' }}>客户端</th>
                </tr>
              </thead>
              <tbody>
                {(live.data ?? []).map((row, index) => (
                  <tr key={`${row.username}-${row.live_title}-${index}`}>
                    <td className="cell-title__name">{row.live_title}</td>
                    <td className="muted">{row.username}</td>
                    <td className="num muted">{Math.max(0, Math.round(row.play_durations / 60))} 分钟</td>
                    <td className="muted" style={{ fontSize: 12 }}>{row.ua ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
