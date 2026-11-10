import { Fragment, useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { IconPlus } from '@/components/icons'
import { useLiveLibrary, useLiveList, useLiveMedia, useLiveMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatRelative } from '@/lib/format'

export interface LiveSearch {
  page: number
  library: number
  channel: number
}

export function LiveView({ search, onSearch }: { search: LiveSearch; onSearch: (patch: Partial<LiveSearch>) => void }) {
  const library = useLiveLibrary()
  const list = useLiveList(search.page, search.library)
  const [mediaPage, setMediaPage] = useState(1)
  // 换频道时源列表回到第一页，不然会停在上一个频道的页码上
  useEffect(() => setMediaPage(1), [search.channel])
  const media = useLiveMedia(search.channel, mediaPage)
  const actions = useLiveMutations()

  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', library: 100, description: '' })
  const [addingSource, setAddingSource] = useState(false)
  const [source, setSource] = useState({ name: '', path_type: 'm3u8', path_url: '' })

  const submitSource = () => {
    if (!channel || !source.name.trim() || !source.path_url.trim() || actions.addMedia.isPending) return
    actions.addMedia.mutate(
      {
        live_list_id: channel.id,
        name: source.name.trim(),
        path_type: source.path_type,
        path_url: source.path_url.trim(),
      },
      {
        onSuccess: () => {
          toast('源已添加', 'success')
          setAddingSource(false)
        },
      },
    )
  }

  const submitChannel = () => {
    if (!form.title.trim() || actions.saveChannel.isPending) return
    actions.saveChannel.mutate(
      {
        live_library_id: form.library,
        title: form.title.trim(),
        description: form.description.trim() || null,
      },
      {
        onSuccess: () => {
          toast('频道已创建', 'success')
          setCreating(false)
          setForm({ title: '', library: search.library || 100, description: '' })
        },
      },
    )
  }

  const channel = list.data?.items.find((item) => item.id === search.channel)

  const renderSources = () => {
    if (!channel) return null
    return (
    <div className="sources">
<article className="card">
            <div className="chart-head">
              <p className="stat__label">
                直播源
                <span className="muted tnum-sm" style={{ marginLeft: 8, letterSpacing: 0 }}>{media.data?.total ?? 0}</span>
              </p>
              {channel.is_can_edit ? (
                <button className="btn btn--ghost" onClick={() => { setSource({ name: '', path_type: 'm3u8', path_url: '' }); setAddingSource(true) }}>
                  新增源
                </button>
              ) : null}
            </div>

            {media.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
            {media.data && media.data.items.length === 0 ? <EmptyBlock bare title="这个频道还没有源" hint="支持 m3u8" /> : null}

            {media.data && media.data.items.length > 0 ? (
              <ul style={{ display: 'grid', gap: 2, marginTop: 12 }}>
                {media.data.items.map((row) => (
                  <li key={row.media_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 2px', borderBottom: '1px solid var(--line-soft)' }}>
                    <span style={{ color: 'var(--fg-2)', minWidth: 140 }}>{row.name}</span>
                    <span className="meta-sm">{row.path_type.toUpperCase()}</span>
                    <span className="meta-sm ellipsis" style={{ flex: 1, minWidth: 0 }}>
                      {row.path_url}
                    </span>
                    <span className="meta-sm">
                      {row.pseudonym ?? '—'}
                    </span>
                    <span className={`badge ${row.status === 'normal' ? 'badge--ok' : 'badge--warn'}`}>
                      <i />
                      {row.status === 'normal' ? '正常' : row.status === 'error' ? '异常' : String(row.status ?? '—')}
                    </span>
                    {row.is_can_edit ? (
                      <button
                        className="btn btn--danger-text"
                        disabled={actions.removeMedia.isPending}
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: '删除这个源？',
                            message: `「${row.name}」会从频道移除。`,
                            hint: '若这是最后一个源，频道将无内容可播。',
                            confirmText: '删除',
                            danger: true,
                          })
                          if (!ok) return
                          actions.removeMedia.mutate(row.media_id, { onSuccess: () => toast('已删除', 'success') })
                        }}
                      >
                        删除
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {media.data && media.data.total > media.data.page_size ? (
              <Pager
                total={media.data.total}
                page={mediaPage}
                pageSize={media.data.page_size}
                onPage={setMediaPage}
              />
            ) : null}
          </article>
    </div>
    )
  }


  return (
    <>
      <PageHeader
        crumb={['直播', channel?.title ?? '频道']}
        title="直播"
        tools={
          list.isFetching ? (
            <span className="stamp">
              <i />
              拉取中
            </span>
          ) : null
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="媒体库">
          <button className="tab" role="tab" aria-selected={search.library === 0} onClick={() => onSearch({ library: 0, channel: 0, page: 1 })}>
            全部
          </button>
          {(library.data ?? []).map((item) => (
            <button
              key={item.id}
              className="tab"
              role="tab"
              aria-selected={search.library === item.id}
              onClick={() => onSearch({ library: item.id, channel: 0, page: 1 })}
            >
              {item.title}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button className="btn btn--primary" onClick={() => setCreating(true)}>
          <IconPlus />
          新增频道
        </button>
      </div>

      {list.error ? <ErrorBlock error={list.error as Error & { status?: number }} onRetry={() => list.refetch()} /> : null}
      {list.isLoading ? <LoadingBlock rows={6} columns={4} /> : null}
      {list.data && list.data.items.length === 0 ? <EmptyBlock title="这个媒体库还没有频道" /> : null}

      {list.data && list.data.items.length > 0 ? (
        <>
        <div className="table-card content-in" key={`${list.data.items.length}-${list.data.items[0]?.id}-${list.data.total}`}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '34%' }} className="th-thumb">频道</th>
                <th style={{ width: '12%' }}>媒体库</th>
                <th className="num" style={{ width: '10%' }}>源</th>
                <th className="num" style={{ width: '12%' }}>排序</th>
                <th className="num" style={{ width: '16%' }}>更新</th>
                <th style={{ width: '16%' }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((item) => {
                const selected = item.id === search.channel
                return (
                  <Fragment key={item.id}>
                  <tr
                    onClick={() => onSearch({ channel: selected ? 0 : item.id })}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      onSearch({ channel: selected ? 0 : item.id })
                    }}
                    style={{ cursor: 'pointer' }}
                    className={selected ? 'is-expanded' : undefined}
                  >
                    <td>
                      <div className="cell-title">
                        <Poster src={item.image_poster_url} name={item.title} />
                        <span>
                          <span className="cell-title__name">
                            {item.title}
                            {selected ? <span className="meta-sm"> · 展开中</span> : null}
                          </span>
                          {item.tagline ? <span className="cell-title__code">{item.tagline}</span> : null}
                        </span>
                      </div>
                    </td>
                    <td className="muted">{library.data?.find((l) => l.id === item.live_library_id)?.title ?? `#${item.live_library_id}`}</td>
                    <td className="num">{item.media_count}</td>
                    <td className="num">{item.sort}</td>
                    <td className="num muted">{formatRelative(item.updated_at)}</td>
                    <td>
                      {item.is_can_edit ? (
                        <button
                          className="btn btn--danger-text"
                        disabled={actions.removeChannel.isPending}
                          onClick={async (e) => {
                            e.stopPropagation()
                            const ok = await confirmDialog({
                              title: `删除频道「${item.title}」？`,
                              message: '该频道下的所有直播源会一并删除。',
                              hint: '观看端会立即不可用。',
                              confirmText: '删除',
                              danger: true,
                            })
                            if (!ok) return
                            actions.removeChannel.mutate(item.id, { onSuccess: () => toast('已删除', 'success') })
                          }}
                        >
                          删除
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {selected ? (
                    <tr className="table__expand">
                      <td colSpan={6}>{renderSources()}</td>
                    </tr>
                  ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          <Pager total={list.data.total} page={search.page} pageSize={list.data.page_size} onPage={(page) => onSearch({ page })} />
        </div>
        </>
      ) : null}

      {creating ? (
        <Modal
          title="新增频道"
          onClose={() => setCreating(false)}
          onSubmit={submitChannel}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setCreating(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!form.title.trim()}
                onClick={submitChannel}
              >
                创建
              </button>
            </>
          }
        >
          <label className="field">
            <span>频道名称</span>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="field">
            </label>
            <label className="field">
              <span>媒体库</span>
              <select className="input" value={form.library} onChange={(e) => setForm({ ...form, library: Number(e.target.value) })}>
                {(library.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>简介</span>
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
        </Modal>
      ) : null}

      {addingSource && channel ? (
        <Modal
          title={`新增源 · ${channel.title}`}
          onClose={() => setAddingSource(false)}
          onSubmit={submitSource}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setAddingSource(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!source.name.trim() || !source.path_url.trim()}
                onClick={submitSource}
              >
                添加
              </button>
            </>
          }
        >
          <label className="field">
            <span>源名称</span>
            <input className="input" value={source.name} onChange={(e) => setSource({ ...source, name: e.target.value })} placeholder="三网直达 1080p" autoFocus />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
            <label className="field">
              <span>类型</span>
              <select className="input" value={source.path_type} onChange={(e) => setSource({ ...source, path_type: e.target.value })}>
                <option value="m3u8">m3u8</option>
              </select>
            </label>
            <label className="field">
              <span>地址</span>
              <input className="input" value={source.path_url} onChange={(e) => setSource({ ...source, path_url: e.target.value })} placeholder="http://…" />
            </label>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
