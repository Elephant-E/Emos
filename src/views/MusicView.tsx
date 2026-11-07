import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Pager } from '@/components/Pager'
import { IconDots } from '@/components/icons'
import { useMusicAlbums, useMusicMutations, useMusicPersons, useMusicSongs } from '@/api/queries'
import { toast } from '@/ui/toast'
import { } from '@/lib/format'

export interface MusicSearch {
  page: number
  tab: 'songs' | 'albums' | 'persons'
  q: string
}

const TABS: Array<{ key: MusicSearch['tab']; label: string }> = [
  { key: 'songs', label: '歌曲' },
  { key: 'albums', label: '专辑' },
  { key: 'persons', label: '歌手' },
]

function duration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function MusicView({ search, onSearch }: { search: MusicSearch; onSearch: (patch: Partial<MusicSearch>) => void }) {
  const navigate = useNavigate()
  const [term, setTerm] = useState(search.q)
  useEffect(() => setTerm(search.q), [search.q])

  const songs = useMusicSongs(search.page, search.q)
  const albums = useMusicAlbums(search.page, search.q)
  const persons = useMusicPersons(search.page, search.q)
  const actions = useMusicMutations()

  const active = search.tab === 'songs' ? songs : search.tab === 'albums' ? albums : persons
  const submit = () => onSearch({ q: term.trim(), page: 1 })

  return (
    <>
      <PageHeader
        crumb={['音乐', TABS.find((t) => t.key === search.tab)?.label ?? '歌曲']}
        title="音乐"
        tools={
          <span className="stamp">
            <i />
            {active.isFetching ? '同步中' : '已同步'}
          </span>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="音乐分类">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className="tab"
              role="tab"
              aria-selected={search.tab === tab.key}
              onClick={() => onSearch({ tab: tab.key, page: 1, q: '' })}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <input
          className="input"
          type="search"
          placeholder="搜索名称"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn btn--ghost" onClick={submit}>
          搜索
        </button>
      </div>

      {active.error ? <ErrorBlock error={active.error as Error & { status?: number }} onRetry={() => active.refetch()} /> : null}
      {active.isLoading ? <LoadingBlock rows={8} columns={4} /> : null}
      {active.data && active.data.items.length === 0 ? <EmptyBlock title="没有结果" hint={search.q ? `「${search.q}」没有匹配。` : '这个库还是空的。'} /> : null}

      {active.data && active.data.items.length > 0 ? (
        <div className="table-card content-in" key={`${search.tab}-${active.data.items.length}-${(active.data.items[0] as Record<string, unknown>)?.song_id ?? (active.data.items[0] as Record<string, unknown>)?.album_id ?? (active.data.items[0] as Record<string, unknown>)?.person_id}`}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>{search.tab === 'persons' ? '歌手' : search.tab === 'albums' ? '专辑' : '歌曲'}</th>
                <th style={{ width: '26%' }}>艺人</th>
                <th className="num" style={{ width: '12%' }}>
                  {search.tab === 'songs' ? '时长' : '发行'}
                </th>
                <th style={{ width: '12%' }}>状态</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {(active.data.items as Array<Record<string, unknown>>).map((row) => {
                const isSong = search.tab === 'songs'
                const isAlbum = search.tab === 'albums'
                const id = Number(row.song_id ?? row.album_id ?? row.person_id ?? 0)
                const name = String(row.name ?? '—')
                const artists = (row.person_artists as Array<{ name: string }> | undefined)?.map((a) => a.name).join(' / ')
                return (
                  <tr
                    key={`${search.tab}-${id}`}
                    onClick={() => isSong && navigate({ to: '/music/song/$songId', params: { songId: String(id) } })}
                    style={{ cursor: isSong ? 'pointer' : 'default' }}
                  >
                    <td>
                      <div className="cell-title">
                        {row.image_poster_url || row.image_profile_url ? (
                          <img className="poster-img" src={String(row.image_poster_url ?? row.image_profile_url)} alt="" loading="lazy" />
                        ) : (
                          <span className="thumb">{name.slice(0, 1)}</span>
                        )}
                        <span>
                          <span className="cell-title__name">{name}</span>
                          <span className="cell-title__code">
                            #{id}
                            {row.tagline ? ` · ${String(row.tagline)}` : ''}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="muted">{artists || String(row.original_name ?? '—')}</td>
                    <td className="num muted">{isSong ? duration(Number(row.duration ?? 0)) : String(row.release_date ?? '—')}</td>
                    <td>
                      {isSong && row.has_media === false ? (
                        <span className="badge badge--wait">
                          <i />
                          无资源
                        </span>
                      ) : isAlbum && row.count_song ? (
                        <span className="muted">{String(row.count_song)} 首</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isSong ? (
                        <button
                          className="row-menu"
                          aria-label="操作"
                          onClick={(e) => {
                            e.stopPropagation()
                            actions.sync.mutate(
                              { type: 'mp', value: String(id) },
                              {
                                onSuccess: () => toast('已触发同步', 'success'),
                              },
                            )
                          }}
                        >
                          <IconDots />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pager total={active.data.total} page={search.page} pageSize={active.data.page_size} onPage={(page) => onSearch({ page })} />
        </div>
      ) : null}
    </>
  )
}
