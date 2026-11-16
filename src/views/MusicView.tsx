import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ListSection } from '@/components/ListSection'
import { VideoPicker } from '@/components/VideoPicker'
import { Tabs } from '@/components/Tabs'
import { Modal } from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { RecordRow } from '@/components/RecordRow'
import { EmptyBlock } from '@/components/StateBlock'
import { useAlbumMutations, useMusicAlbums, useMusicMutations, useMusicPersons, useMusicSongs } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useSearchTerm } from '@/lib/useSearchTerm'
import { duration } from '@/lib/format'
import { MUSIC_DISABLED, MUSIC_DISABLED_HINT, MUSIC_DISABLED_TITLE } from '@/lib/feature-flags'

export interface MusicSearch {
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

export function MusicView({ search, onSearch }: { search: MusicSearch; onSearch: (patch: Partial<MusicSearch>) => void }) {
  const navigate = useNavigate()
  const [term, setTerm] = useSearchTerm(search.q, (next) => onSearch({ q: next }))

  // 只查当前 tab：三份一起请求的话，切 tab 会直接命中缓存，看不到加载态
  const songs = useMusicSongs(1, search.q, search.tab === 'songs', search.page_size, search.filter)
  const albums = useMusicAlbums(1, search.q, search.tab === 'albums', search.page_size)
  const persons = useMusicPersons(1, search.q, search.tab === 'persons', search.page_size)
  const [syncArtist, setSyncArtist] = useState<string | null>(null)
  const [mvAlbum, setMvAlbum] = useState<{ albumId: number; name: string } | null>(null)
  const albumActions = useAlbumMutations()
  const actions = useMusicMutations()

  const active = search.tab === 'songs' ? songs : search.tab === 'albums' ? albums : persons
  const activeRows = (active.data?.items ?? []) as Array<Record<string, unknown>>
  // 「无资源 / 已收藏」只作用于歌曲 tab：筛出 0 条不等于「音乐库为空」
  const filter = search.tab === 'songs' ? search.filter : ''
  const filtered = Boolean(search.q) || Boolean(filter)

  // 上游 2026-11-14 停用音乐域：查询已全部 enabled=false，这里只留一句说明
  if (MUSIC_DISABLED) {
    return (
      <>
        <PageHeader crumb={['音乐', '曲库']} title="音乐" />
        <EmptyBlock title={MUSIC_DISABLED_TITLE} hint={MUSIC_DISABLED_HINT} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        crumb={['音乐', TABS.find((t) => t.key === search.tab)?.label ?? '歌曲']}
        title="音乐"
      />

      <div className="toolbar">
        <Tabs items={TABS} value={search.tab} onChange={(tab) => onSearch({ tab, q: '' })} label="音乐分类" />
        {search.tab === 'persons' ? (
          <button type="button" className="btn btn--ghost" onClick={() => setSyncArtist('')}>
            从 Spotify 同步
          </button>
        ) : null}
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
            <button type="button" aria-pressed={search.filter === ''} onClick={() => onSearch({ filter: '' })}>
              全部
            </button>
            <button type="button" aria-pressed={search.filter === 'no_media'} onClick={() => onSearch({ filter: 'no_media' })}>
              无资源
            </button>
            <button type="button" aria-pressed={search.filter === 'favorite'} onClick={() => onSearch({ filter: 'favorite' })}>
              我收藏的
            </button>
          </div>
        ) : null}
      </div>

      <ListSection
        isLoading={active.isLoading}
        error={active.error}
        onRetry={() => active.refetch()}
        items={activeRows}
        scope={`${search.tab}-${search.q}-${search.filter}`}
        loadingRows={8}
        loadingCols={4}
        emptyTitle={search.q ? `没有找到「${search.q}」` : filtered ? '没有符合筛选的歌曲' : '这个库还是空的'}
        emptyAction={
          filtered ? (
            <button type="button" className="btn btn--ghost" onClick={() => onSearch({ q: '', filter: '' })}>
              清空筛选
            </button>
          ) : undefined
        }
      >
          <RecordRow
          rows={activeRows}
          idKey={(row) => {
            const isSong = search.tab === 'songs'
            const isAlbum = search.tab === 'albums'
            return `${search.tab}-${String(isSong ? row.song_id : isAlbum ? row.album_id : row.person_id ?? row.name)}`
          }}
          onOpen={(row) => {
            if (search.tab !== 'songs') return
            const id = Number(row.song_id ?? 0)
            navigate({ to: '/music/song/$songId', params: { songId: String(id) } })
          }}
          posterShape="square"
          poster={(row) =>
            (search.tab === 'albums' ? (row.image_poster_url as string) : (row.image_profile_url as string)) ?? null
          }
          title={(row) => String(row.name ?? '—')}
          meta={(row) => {
            const isSong = search.tab === 'songs'
            const artists = (row.person_artists as Array<{ name: string }> | undefined)?.map((a) => a.name).join(' / ')
            return (
              <>
                <span>
                  {artists ||
                    (search.tab === 'persons'
                      ? String(row.birthplace ?? '—')
                      : String(row.original_name ?? '—'))}
                </span>
                <span>
                  {isSong
                    ? duration(Number(row.duration ?? 0))
                    : search.tab === 'persons'
                      ? String(row.birthday ?? '—')
                      : String(row.release_date ?? '—')}
                </span>
                {search.tab === 'persons' ? (
                  <span>
                    {row.is_virtual == null ? '—' : row.is_virtual === '0' || row.is_virtual === 0 ? '真人' : '虚拟'}
                  </span>
                ) : isSong ? (
                  <span>{row.has_media === false ? '无资源' : '有资源'}</span>
                ) : (
                  <span>{String(row.count_song ?? '—')} 首</span>
                )}
              </>
            )
          }}
          facts={(row) => (row.tagline ? <span className="ellipsis">{String(row.tagline)}</span> : null)}
          actions={(row) => {
            const id = Number(row.song_id ?? row.album_id ?? row.person_id ?? 0)
            const name = String(row.name ?? '—')
            return (
              <>
                {search.tab === 'albums' ? (
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => setMvAlbum({ albumId: id, name })}
                  >
                    关联 MV
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() =>
                    actions.sync.mutate(
                      // mp 歌手 / ms 歌曲 / ma 专辑，按当前 tab 决定
                      { type: search.tab === 'albums' ? 'ma' : search.tab === 'persons' ? 'mp' : 'ms', value: String(id) },
                      { onSuccess: () => toast('已触发同步', 'success') },
                    )
                  }
                >
                  同步
                </button>
              </>
            )
          }}
        />
      </ListSection>

    
      {syncArtist !== null ? (
        <Modal
          title="从 Spotify 同步歌手"
          width={480}
          onClose={() => setSyncArtist(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setSyncArtist(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!syncArtist.trim() || actions.syncArtist.isPending}
                onClick={() =>
                  actions.syncArtist.mutate(syncArtist.trim(), {
                    onSuccess: () => {
                      toast('已同步', 'success')
                      setSyncArtist(null)
                    },
                  })
                }
              >
                {actions.syncArtist.isPending ? '同步中…' : '同步'}
              </button>
            </>
          }
        >
          <label className="field">
            <span>歌手链接或 ID</span>
            <input
              className="input"
              value={syncArtist}
              onChange={(e) => setSyncArtist(e.target.value)}
              placeholder="https://open.spotify.com/artist/64NFGuC9PjqtNyJqnnTXh5"
              autoFocus
            />
          </label>
          <p className="card-note">填整条链接或只填 ID 都行，同步会按 todb 的字段覆盖。</p>
        </Modal>
      ) : null}

      {mvAlbum ? (
        <VideoPicker
          title={`关联 MV · ${mvAlbum.name}`}
          onClose={() => setMvAlbum(null)}
          onPick={async (video) => {
            const ok = await confirmDialog({
              title: `把专辑「${mvAlbum.name}」的 MV 关联到「${video.title}」？`,
              message: '关联后播放页会带上这支 MV。',
              hint: '服务端会按规则结算胡萝卜。',
              confirmText: '关联',
            })
            if (!ok) return
            albumActions.updateAlbumVideoId.mutate(
              { albumId: mvAlbum.albumId, videoId: video.videoId },
              {
                onSuccess: () => {
                  toast('已关联', 'success')
                  setMvAlbum(null)
                },
              },
            )
          }}
        />
      ) : null}
</>
  )
}
