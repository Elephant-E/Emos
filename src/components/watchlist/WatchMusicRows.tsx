import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Modal } from '@/components/Modal'
import { PickList } from '@/components/PickList'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { duration } from '@/lib/format'
import { MUSIC_DISABLED, MUSIC_DISABLED_HINT, MUSIC_DISABLED_TITLE } from '@/lib/feature-flags'
import { rowLink } from '@/lib/rowLink'
import type { WatchItem } from '@/api/types'
import { useWatchMusicMutations, useWatchMusicSearch, type useWatchMusic } from '@/api/queries'

/** 片单详情页的查询参数（影视与音乐共用） */
export interface WatchDetailSearch {
  page_size: number
  q: string
}

export function WatchMusicRows({
  watchId,
  item,
  songs,
  addingSong,
  onCloseAdd,
}: {
  watchId: number
  item: WatchItem
  songs: ReturnType<typeof useWatchMusic>
  addingSong: boolean
  onCloseAdd: () => void
}) {
  const navigate = useNavigate()
  const canEdit = item.is_edit_video
  const { addSong, removeSong } = useWatchMusicMutations(watchId)
  const [songTerm, setSongTerm] = useState('')
  const songCandidates = useWatchMusicSearch(watchId, songTerm)

  // 上游停用音乐域：片单里的音乐行不再请求
  if (MUSIC_DISABLED) {
    return <EmptyBlock title={MUSIC_DISABLED_TITLE} hint={MUSIC_DISABLED_HINT} />
  }

  return (
    <>

      {songs.error ? <ErrorBlock error={songs.error} onRetry={() => songs.refetch()} /> : null}
      {songs.isLoading ? <LoadingBlock rows={8} columns={3} /> : null}

      {!songs.error && !songs.isLoading && songs.data && songs.data.items.length === 0 ? (
        <EmptyBlock title="这个片单还没有歌" />
      ) : null}

      {songs.data && songs.data.items.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: canEdit ? '52%' : '72%' }}>歌曲</th>
                <th className="num" style={{ width: '14%' }}>时长</th>
                <th style={{ width: '20%' }}>艺人</th>
                {canEdit ? <th style={{ width: '96px' }}>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {songs.data.items.map((song: import('@/api/types').MusicSong) => (
                <tr
                  key={song.song_id}
                  {...rowLink(() => navigate({ to: '/music/song/$songId', params: { songId: String(song.song_id) } }))}
                >
                  <td>
                    <span className="cell-title__name">{song.name}</span>
                    {song.description ? (
                      <span className="cell-title__code">{song.description.slice(0, 40)}</span>
                    ) : null}
                  </td>
                  <td className="num muted">
                    {duration(song.duration)}
                  </td>
                  <td className="muted" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(song.person_artists ?? []).map((x) => x.name).join("/")}</td>
                  {canEdit ? (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button type="button"
                      className="btn btn--danger-text"
                      disabled={removeSong.isPending && removeSong.variables === song.song_id}
                      onClick={async () => {
                        const ok = await confirmDialog({
              title: `从片单移除《${song.name}》？`,
              message: '歌曲本身不会被删除。',
              confirmText: '移除',
              danger: true,
                        })
                        if (!ok) return
                        removeSong.mutate(song.song_id, { onSuccess: () => toast('已移除', 'success') })
                      }}
                    >
                      移除
                    </button>
                  </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {addingSong ? (
        <Modal title="添加歌曲" onClose={onCloseAdd} width={460}>
          <label className="field">
            <span>按歌名搜索</span>
            <input className="input" autoFocus value={songTerm} placeholder="输入歌名" onChange={(e) => setSongTerm(e.target.value)} />
          </label>
          <PickList loading={songCandidates.isFetching} query={songTerm} count={(songCandidates.data?.items ?? []).length}>
            {(songCandidates.data?.items ?? []).map((sg) => (
              <div key={sg.song_id} className="pick-row">
                <span className="pick-row__text">
                  <span className="ellipsis" style={{ fontSize: 13.5 }}>{sg.name}</span>
                  <span className="meta-sm">{(sg.person_artists ?? []).map((x) => x.name).join("/")}</span>
                </span>
                <button type="button"
                  className="btn btn--ghost"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => addSong.mutate(sg.song_id, { onSuccess: () => toast(`已加入「${sg.name}」`, 'success') })}
                  disabled={addSong.isPending}
                >
                  加入
                </button>
              </div>
            ))}
          </PickList>
        </Modal>
      ) : null}
    </>
  )
}
