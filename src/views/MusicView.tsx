import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ListCard } from '@/components/ListCard'
import { Poster } from '@/components/Poster'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Pager } from '@/components/Pager'
import { useMusicAlbums, useMusicMutations, useMusicPersons, useMusicSongs } from '@/api/queries'
import { toast } from '@/ui/toast'
import { useDebounced } from '@/lib/useDebounced'
import { } from '@/lib/format'

export interface MusicSearch {
  page: number
  page_size: number
  tab: 'songs' | 'albums' | 'persons'
  q: string
  filter: '' | 'no_media' | 'favorite'
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

  // 只查当前 tab：三份一起请求的话，切 tab 会直接命中缓存，看不到加载态
  const songs = useMusicSongs(search.page, search.q, search.tab === 'songs', search.page_size, search.filter)
  const albums = useMusicAlbums(search.page, search.q, search.tab === 'albums', search.page_size)
  const persons = useMusicPersons(search.page, search.q, search.tab === 'persons', search.page_size)
  const actions = useMusicMutations()

  const active = search.tab === 'songs' ? songs : search.tab === 'albums' ? albums : persons
  useDebounced(term, (next) => onSearch({ q: next, page: 1 }), { current: search.q })
  // 「无资源 / 已收藏」只作用于歌曲 tab：筛出 0 条不等于「音乐库为空」
  const filter = search.tab === 'songs' ? search.filter : ''
  const filtered = Boolean(search.q) || Boolean(filter)

  return (
    <>
      <PageHeader
        crumb={['音乐', TABS.find((t) => t.key === search.tab)?.label ?? '歌曲']}
        title="音乐"
        tools={
          active.isFetching ? (
            <span className="stamp">
              <i />
              拉取中
            </span>
          ) : null
        }
      />

      <div className="toolbar">
        <Tabs items={TABS} value={search.tab} onChange={(tab) => onSearch({ tab, page: 1, q: '' })} label="音乐分类" />
        <span className="spacer" />
        <input
          className="input"
          type="search"
            aria-label="搜索名称"
          placeholder="搜索名称"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {search.tab === 'songs' ? (
          <div className="seg" role="group" aria-label="过滤">
            <button type="button" aria-pressed={search.filter === ''} onClick={() => onSearch({ filter: '', page: 1 })}>
              全部
            </button>
            <button type="button" aria-pressed={search.filter === 'no_media'} onClick={() => onSearch({ filter: 'no_media', page: 1 })}>
              无资源
            </button>
            <button type="button" aria-pressed={search.filter === 'favorite'} onClick={() => onSearch({ filter: 'favorite', page: 1 })}>
              我收藏的
            </button>
          </div>
        ) : null}
      </div>

      {active.error ? <ErrorBlock error={active.error} onRetry={() => active.refetch()} /> : null}
      {active.isLoading ? <LoadingBlock rows={8} columns={4} /> : null}
      {active.data && !active.error && active.data.items.length === 0 ? (
        <EmptyBlock
          title={search.q ? `没有找到「${search.q}」` : '这个库还是空的'}
          action={
            filtered ? (
              <button type="button" className="btn btn--ghost" onClick={() => onSearch({ q: '', filter: '', page: 1 })}>
                清空筛选
              </button>
            ) : undefined
          }
        />
      ) : null}

      {active.data && active.data.items.length > 0 ? (
        <ListCard
          items={active.data.items as readonly unknown[]}
          total={active.data.total}
          idKey={(v) => {
            const row = v as Record<string, number | undefined>
            return row.song_id ?? row.album_id ?? row.person_id ?? ''
          }}
          scope={search.tab}
        >
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40%' }} className={search.tab === 'songs' ? undefined : 'th-thumb'}>
                  {search.tab === 'persons' ? '歌手' : search.tab === 'albums' ? '专辑' : '歌曲'}
                </th>
                <th style={{ width: '26%' }}>艺人</th>
                <th className="num" style={{ width: '12%' }}>
                  {search.tab === 'songs' ? '时长' : search.tab === 'persons' ? '生日' : '发行'}
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
                    tabIndex={isSong ? 0 : undefined}
                    role={isSong ? 'link' : undefined}
                    onKeyDown={(e) => {
                      if (!isSong) return
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      navigate({ to: '/music/song/$songId', params: { songId: String(id) } })
                    }}
                    style={{ cursor: isSong ? 'pointer' : 'default' }}
                  >
                    <td>
                      <span className="cell-title">
                        {isAlbum ? (
                          <Poster src={row.image_poster_url as string} name={name} shape="square" />
                        ) : isSong ? null : (
                          <Poster src={row.image_profile_url as string} name={name} shape="square" />
                        )}
                        <span>
                          <span className="cell-title__name">{name}</span>
                          {row.tagline ? <span className="cell-title__code">{String(row.tagline)}</span> : null}
                        </span>
                      </span>
                    </td>
                    <td className="muted">
                      {artists ||
                        (search.tab === 'persons'
                          ? String(row.birthplace ?? row.birthday ?? '—')
                          : String(row.original_name ?? '—'))}
                    </td>
                    <td className="num muted">
                      {isSong
                        ? duration(Number(row.duration ?? 0))
                        : search.tab === 'persons'
                          ? String(row.birthday ?? '—')
                          : String(row.release_date ?? '—')}
                    </td>
                    <td>
                      {isSong && row.has_media === false ? (
                        <span className="badge badge--wait">
                          <i />
                          无资源
                        </span>
                      ) : isAlbum && row.count_song ? (
                        <span className="muted">{String(row.count_song)} 首</span>
                      ) : search.tab === 'persons' ? (
                        <span className="muted">{row.is_virtual === '0' || row.is_virtual === 0 ? '真人' : '虚拟'}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <button type="button"
                        className="btn btn--quiet"
                        onClick={(e) => {
                          e.stopPropagation()
                          actions.sync.mutate(
                            // mp 歌手 / ms 歌曲 / ma 专辑，按当前 tab 决定
                            { type: search.tab === 'albums' ? 'ma' : search.tab === 'persons' ? 'mp' : 'ms', value: String(id) },
                            { onSuccess: () => toast('已触发同步', 'success') },
                          )
                        }}
                      >
                        同步
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pager
            total={active.data.total}
            page={search.page}
            pageSize={search.page_size}
            onPage={(page) => onSearch({ page })}
            onPageSize={(page_size) => onSearch({ page_size, page: 1 })}
          />
        </ListCard>
      ) : null}
    </>
  )
}
