import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { RecordRow } from '@/components/RecordRow'
import { ListSection } from '@/components/ListSection'
import { Tabs } from '@/components/Tabs'
import { rankApi } from '@/api/endpoints'
import { formatSize, formatThousand, episodeCode } from '@/lib/format'

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

  // 三个榜单字段各不相同：胡萝卜榜有 level_name，上传榜只有 size，签到榜连 index 都叫 sign_index
  const people = [
    ...(carrot.data ?? []).map((row) => ({
      key: `c-${row.index}-${row.username}`,
      index: row.index,
      username: row.username,
      avatar: row.avatar,
      level: row.level_name ?? '',
      value: `${formatThousand(row.carrot)} 胡萝卜`,
    })),
    ...(upload.data ?? []).map((row) => ({
      key: `u-${row.index}-${row.username}`,
      index: row.index,
      username: row.username,
      avatar: row.avatar,
      level: '',
      value: `${formatSize(row.size)} 上传`,
    })),
  ]
  // 按连续天数降序后再编号：`#1` 必须是天数最多的那位，
  // 否则「#1 291 天 < #3 301 天」会被读成名次错乱
  const signPeople = [...(sign.data ?? [])]
    .sort((a, b) => b.continuous_days - a.continuous_days)
    .map((row, position) => ({
    key: `s-${row.sign_index}-${row.username}`,
    index: position + 1,
    username: row.username,
    avatar: row.avatar,
    level: row.sign_content ?? '—',
    value: `${formatThousand(row.continuous_days)} 天连续签到`,
  }))

  return (
    <>
      <PageHeader crumb={['运营', '榜单']} title="榜单" hint="前 30 名，10 分钟缓存" />

      <div className="toolbar">
        <Tabs items={TABS} value={tab} onChange={(next) => onSearch({ tab: next })} label="榜单" />
      </div>

      <ListSection
        isLoading={current.isLoading}
        error={current.error}
        onRetry={() => current.refetch()}
        items={(rows ?? []) as unknown[]}
        loadingKind="rows"
        loadingPoster="square"
        loadingLines={2}
        loadingActions={0}
        loadingValue
        loadingRows={8}
        emptyTitle="还没有数据"
      >
          {tab === 'playing' ? (
            <RecordRow
              rows={playing.data ?? []}
              idKey={(row) => `${row.username}-${row.video_title}`}
              poster={(row) => row.video_image_poster}
              title={(row) => row.video_title}
              meta={(row) => (
                <>
                  <span>{row.username}</span>
                  <span>
                    {row.season_number != null ? episodeCode(row.season_number, row.episode_number) : '—'}
                  </span>
                </>
              )}
              facts={(row) => (
                <>
                  <span>{row.ua ?? '—'}</span>
                  <span>{row.play_speed ? `${(row.play_speed / 10).toFixed(1)}×` : '—'}</span>
                </>
              )}
              value={(row) => `${Math.max(0, Math.round(Number(row.play_seconds ?? 0) / 60))} 分钟`}
            />
          ) : tab === 'live' ? (
            <RecordRow
              rows={live.data ?? []}
              idKey={(row) => `${row.username}-${row.live_title}`}
              title={(row) => row.live_title}
              meta={(row) => <span>{row.username}</span>}
              facts={(row) => <span>{row.ua ?? '—'}</span>}
              value={(row) => `${Math.max(0, Math.round(row.play_durations / 60))} 分钟`}
            />
          ) : (
            <RecordRow
              rows={tab === 'sign' ? signPeople : people.filter((row) => row.key.startsWith(tab === 'carrot' ? 'c-' : 'u-'))}
              idKey={(row) => row.key}
              posterShape="square"
              poster={(row) => row.avatar}
              title={(row) => row.username}
              meta={(row) => (
                <>
                  <span className="tnum">#{row.index}</span>
                  <span>{row.level}</span>
                </>
              )}
              value={(row) => row.value}
            />
          )}
      </ListSection>
    </>
  )
}
