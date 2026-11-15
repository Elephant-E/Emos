import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { UserCell } from '@/components/UserCell'
import { RecordList } from '@/components/RecordList'
import { Tabs } from '@/components/Tabs'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Poster } from '@/components/Poster'
import { rankApi } from '@/api/endpoints'
import { formatDateTime, formatSize, formatThousand, episodeCode } from '@/lib/format'

const TABS = [
  { key: 'carrot' as const, label: '萝卜' },
  { key: 'upload' as const, label: '上传量' },
  { key: 'sign' as const, label: '签到' },
  { key: 'playing' as const, label: '正在播放' },
  { key: 'live' as const, label: '直播' },
]

type RankTab = (typeof TABS)[number]['key']

export interface RankSearch {
  tab: RankTab
}

/** 榜单都是「前 30 条、10 分钟缓存」，一次拉完，不分页 */
export function RankView({ search, onSearch }: { search: RankSearch; onSearch: (patch: Partial<RankSearch>) => void }) {
  const tab = search.tab
  const carrot = useQuery({ queryKey: ['rank', 'carrot'], queryFn: rankApi.carrot, enabled: tab === 'carrot', staleTime: 10 * 60_000 })
  const upload = useQuery({ queryKey: ['rank', 'upload'], queryFn: rankApi.upload, enabled: tab === 'upload', staleTime: 10 * 60_000 })
  const sign = useQuery({ queryKey: ['rank', 'sign'], queryFn: rankApi.sign, enabled: tab === 'sign', staleTime: 10 * 60_000 })
  const playing = useQuery({
    queryKey: ['rank', 'playing'],
    queryFn: rankApi.playingVideo,
    enabled: tab === 'playing',
    // 「最近 3 分钟」的实时数据，60s 拉一次足够，不必每秒刷
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
            <RecordList
              rows={carrot.data ?? []}
              idKey={(row) => `${row.index}-${row.username}`}
              className="table"
              columns={[
                {
                  key: 'user',
                  label: '用户',
                  thClass: 'th-thumb',
                  mobile: 'primary',
                  render: (row) => (
                    <UserCell name={row.username} avatar={row.avatar} sub={row.level_name} />
                  ),
                },
                {
                  key: 'rank',
                  label: '#',
                  thClass: 'num',
                  thWidth: 64,
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <span className="muted tnum">#{row.index}</span>,
                },
                {
                  key: 'carrot',
                  label: '胡萝卜',
                  thClass: 'num',
                  thWidth: '20%',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <>{formatThousand(row.carrot)}</>,
                },
              ]}
            />
          ) : null}

          {tab === 'upload' ? (
            <RecordList
              rows={upload.data ?? []}
              idKey={(row) => `${row.index}-${row.username}`}
              className="table"
              columns={[
                {
                  key: 'user',
                  label: '用户',
                  thClass: 'th-thumb',
                  mobile: 'primary',
                  render: (row) => <UserCell name={row.username} avatar={row.avatar} />,
                },
                {
                  key: 'rank',
                  label: '#',
                  thClass: 'num',
                  thWidth: 64,
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <span className="muted tnum">#{row.index}</span>,
                },
                {
                  key: 'size',
                  label: '上传量',
                  thClass: 'num',
                  thWidth: '20%',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <>{formatSize(row.size)}</>,
                },
              ]}
            />
          ) : null}

          {tab === 'sign' ? (
            <RecordList
              rows={sign.data ?? []}
              idKey={(row) => `${row.sign_index}-${row.username}`}
              className="table"
              columns={[
                {
                  key: 'user',
                  label: '用户',
                  thClass: 'th-thumb',
                  mobile: 'primary',
                  render: (row) => <UserCell name={row.username} avatar={row.avatar} />,
                },
                {
                  key: 'rank',
                  label: '#',
                  thClass: 'num',
                  thWidth: 64,
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <span className="muted tnum">#{row.sign_index}</span>,
                },
                {
                  key: 'time',
                  label: '签到时间',
                  thWidth: '18%',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <span className="muted">{formatDateTime(row.sign_at)}</span>,
                },
                {
                  key: 'point',
                  label: '胡萝卜',
                  thClass: 'num',
                  thWidth: '12%',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <>+{formatThousand(row.earn_point)}</>,
                },
                {
                  key: 'days',
                  label: '连续天数',
                  thClass: 'num',
                  thWidth: '12%',
                  mobile: 'inline',
                  mobileLabel: null,
                  render: (row) => <span className="muted">{formatThousand(row.continuous_days)}</span>,
                },
              ]}
            />
          ) : null}

          {tab === 'playing' ? (
            <RecordList
                rows={playing.data ?? []}
                idKey={(row) => `${row.username}-${row.video_title}`}
                className="table"
                columns={[
                  {
                    key: 'video',
                    label: '在看',
                    thClass: 'th-thumb',
                    thWidth: '36%',
                    mobile: 'primary',
                    render: (row) => (
                      <div className="cell-title">
                        {row.video_image_poster ? (
                          <Poster src={row.video_image_poster} name={row.video_title} />
                        ) : (
                          <span className="thumb">{row.video_title.slice(0, 1)}</span>
                        )}
                        <span>
                          <span className="cell-title__name">{row.video_title}</span>
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'episode',
                    label: '季集',
                    thWidth: '16%',
                    mobile: 'inline',
                    mobileLabel: null,
                    render: (row) => (
                      <span className="muted">
                        {row.season_number != null ? episodeCode(row.season_number, row.episode_number) : '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'user',
                    label: '用户',
                    mobile: 'inline',
                    render: (row) => <span className="muted">{row.username}</span>,
                  },
                  {
                    key: 'speed',
                    label: '倍速',
                    thClass: 'num',
                    thWidth: '12%',
                    mobile: 'inline',
                    mobileLabel: null,
                    render: (row) => (
                      <span className="muted">{row.play_speed ? `${(row.play_speed / 10).toFixed(1)}×` : '—'}</span>
                    ),
                  },
                  {
                    key: 'ua',
                    label: '客户端',
                    thWidth: '18%',
                    mobile: 'hidden',
                    render: (row) => <span className="muted text-xs">{row.ua ?? '—'}</span>,
                  },
                ]}
              />
          ) : null}

          {tab === 'live' ? (
            <RecordList
                rows={live.data ?? []}
                idKey={(row) => `${row.username}-${row.live_title}`}
                className="table"
                columns={[
                  {
                    key: 'channel',
                    label: '频道',
                    thWidth: '34%',
                    mobile: 'primary',
                    render: (row) => <span className="cell-title__name">{row.live_title}</span>,
                  },
                  {
                    key: 'user',
                    label: '用户',
                    mobile: 'inline',
                    render: (row) => <span className="muted">{row.username}</span>,
                  },
                  {
                    key: 'watched',
                    label: '已看',
                    thClass: 'num',
                    thWidth: '18%',
                    mobile: 'inline',
                    mobileLabel: null,
                    render: (row) => (
                      <span className="muted">{Math.max(0, Math.round(row.play_durations / 60))} 分钟</span>
                    ),
                  },
                  {
                    key: 'ua',
                    label: '客户端',
                    thWidth: '22%',
                    mobile: 'hidden',
                    render: (row) => <span className="muted text-xs">{row.ua ?? '—'}</span>,
                  },
                ]}
              />
          ) : null}
        </div>
      ) : null}
    </>
  )
}
