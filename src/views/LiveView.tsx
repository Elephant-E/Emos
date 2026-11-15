import { useEffect, useState } from 'react'
import { liveApi } from '@/api/endpoints'
import { ListSection } from '@/components/ListSection'
import { RecordRow } from '@/components/RecordRow'
import { ModalFooter } from '@/components/ModalFooter'
import { ImagePicker } from '@/components/ImagePicker'
import { Tabs } from '@/components/Tabs'
import { CardHead } from '@/components/CardHead'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconPlus } from '@/components/icons'
import { useLiveLibrary, useLiveMedia, useLiveMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatRelative } from '@/lib/format'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

export interface LiveSearch {
  library: number
  channel: number
}

/** path_type 实测有 m3u8 与 guanfang 两种（文档写「目前固定 m3u8」已过期） */
const PATH_TYPE_LABEL: Record<string, string> = {
  m3u8: 'm3u8',
  guanfang: '官方源',
}

export function LiveView({ search, onSearch }: { search: LiveSearch; onSearch: (patch: Partial<LiveSearch>) => void }) {
  const library = useLiveLibrary()
  // 两端都滚动加载
  const infinite = usePagedInfinite(
    (page) => liveApi.list({ page, page_size: 15, library_id: search.library || undefined }),
    { resetKey: `${search.library}` },
  )
  const [mediaPage, setMediaPage] = useState(1)
  // 换频道时源列表回到第一页，不然会停在上一个频道的页码上
  useEffect(() => setMediaPage(1), [search.channel])
  const media = useLiveMedia(search.channel, mediaPage)
  const actions = useLiveMutations()

  // 新增与编辑共用一个表单；id 为空即新增。image_poster 存图库 file_id，image_url 只用于预览
  const [form, setForm] = useState<{
    id: number | null
    title: string
    library: number
    description: string
    tagline: string
    image_poster: string | null
    image_url: string | null
    /** 官方频道（code 非空）的封面不可改 */
    lockedCover: boolean
  } | null>(null)
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
    if (!form || !form.title.trim() || actions.saveChannel.isPending) return
    actions.saveChannel.mutate(
      {
        id: form.id,
        live_library_id: form.library,
        title: form.title.trim(),
        description: form.description.trim() || null,
        tagline: form.tagline.trim() || null,
        // 官方频道的封面只读；编辑时 list 响应不返回 image_poster（只有 url），
        // 拿不到原值就整字段不提交，避免整体覆盖把封面清空
        ...(form.lockedCover || form.image_poster == null ? {} : { image_poster: form.image_poster }),
      },
      {
        onSuccess: () => {
          toast('频道已创建', 'success')
          setForm(null)
        },
      },
    )
  }

  const liveItems = infinite.items
  const channel = liveItems.find((item) => item.id === search.channel)

  const renderSources = () => {
    if (!channel) return null
    return (
    <div className="sources">
<article className="card">
            <CardHead
              title={
                <>
                  直播源
                  <span className="muted tnum-sm" style={{ marginLeft: 'var(--sp-2)', letterSpacing: 0 }}>{media.data?.total ?? 0}</span>
                </>
              }
            >
              {channel.is_can_edit ? (
                <button type="button" className="btn btn--quiet" onClick={() => { setSource({ name: '', path_type: 'm3u8', path_url: '' }); setAddingSource(true) }}>
                  新增源
                </button>
              ) : null}
            </CardHead>

            {media.error ? <ErrorBlock bare error={media.error} onRetry={() => media.refetch()} /> : null}
            {media.isLoading ? <LoadingBlock bare rows={3} columns={3} /> : null}
            {!media.error && media.data && media.data.items.length === 0 ? <EmptyBlock bare title="这个频道还没有源" hint="支持 m3u8" /> : null}

            {media.data && media.data.items.length > 0 ? (
              <RecordRow
                rows={media.data.items}
                idKey={(row) => row.media_id}
                title={(row) => row.name}
                meta={(row) => (
                  <>
                    <span>{PATH_TYPE_LABEL[row.path_type] ?? row.path_type}</span>
                    <span className={`badge ${row.status === 'normal' ? 'badge--ok' : 'badge--warn'}`}>
                      <i />
                      {row.status === 'normal' ? '正常' : row.status === 'error' ? '异常' : String(row.status ?? '—')}
                    </span>
                    <span>{row.pseudonym ?? '未知上传者'}</span>
                  </>
                )}
                facts={(row) => <span className="ellipsis">{row.path_url}</span>}
                actions={(row) =>
                  row.is_can_edit ? (
                    <button
                      type="button"
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
                  ) : null
                }
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
      />

      <div className="toolbar">
        <Tabs
          items={[{ key: 0, label: '全部' }, ...(library.data ?? []).map((item) => ({ key: item.id, label: item.title }))]}
          value={search.library}
          onChange={(libraryId) => onSearch({ library: libraryId, channel: 0 })}
          label="媒体库"
        />
        <span className="spacer" />
        <button type="button"
          className="btn btn--primary"
          onClick={() =>
            setForm({
              id: null,
              title: '',
              library: search.library || library.data?.[0]?.id || 100,
              description: '',
              tagline: '',
              image_poster: null,
              image_url: null,
              lockedCover: false,
            })
          }
        >
          <IconPlus />
          新增频道
        </button>
      </div>

      {library.error ? (
        <p className="card-note">媒体库列表读取失败：{library.error instanceof Error ? library.error.message : ''}</p>
      ) : null}
      <ListSection
        isLoading={infinite.loading && infinite.items.length === 0}
        error={infinite.error}
        onRetry={() => infinite.retry()}
        items={liveItems}
        cardList
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        scope={`${search.library}-${search.channel}`}
        loadingRows={6}
        loadingKind="rows"
        emptyTitle="这个媒体库还没有频道"
      >
          <RecordRow
            rows={liveItems}
            idKey={(item) => item.id}
            onOpen={(item) => onSearch({ channel: item.id === search.channel ? 0 : item.id })}
            posterShape="square"
            poster={(item) => item.image_poster_url}
            title={(item) => item.title}
            meta={(item) => (
              <>
                {item.code ? <span className="chip">官方</span> : null}
                <span>{item.tagline ?? '无宣传词'}</span>
                <span>{library.data?.find((l) => l.id === item.live_library_id)?.title ?? `#${item.live_library_id}`}</span>
                <span>{item.media_count} 个源</span>
                <span>{formatRelative(item.updated_at)}</span>
              </>
            )}
            extra={(item) => (item.id === search.channel ? renderSources() : null)}
            actions={(item) =>
              item.is_can_edit ? (
                <>
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={(e) => {
                      e.stopPropagation()
                      setForm({
                        id: item.id,
                        title: item.title,
                        library: item.live_library_id ?? search.library ?? 100,
                        description: item.description ?? '',
                        tagline: item.tagline ?? '',
                        image_poster: null,
                        image_url: item.image_poster_url,
                        lockedCover: Boolean(item.code),
                      })
                    }}
                  >
                    编辑
                  </button>
                  {item.code ? (
                    <button type="button" className="btn btn--quiet" disabled title="官方频道不可删除">
                      删除
                    </button>
                  ) : (
                    <button
                      type="button"
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
                        actions.removeChannel.mutate(item.id, { onSuccess: () => toast('频道已删除', 'success') })
                      }}
                    >
                      删除
                    </button>
                  )}
                </>
              ) : null
            }
          />
      </ListSection>

      {form ? (
        <Modal
          title={form.id ? `编辑频道 · ${form.title}` : '新增频道'}
          onClose={() => setForm(null)}
          onSubmit={submitChannel}
          footer={
            <ModalFooter
              onCancel={() => setForm(null)}
              onConfirm={submitChannel}
              confirmText={form.id ? '保存' : '创建'}
              pending={actions.saveChannel.isPending}
              disabled={!form.title.trim()}
            />
          }
        >
          {form.lockedCover ? (
            <>
              <ImagePicker label="频道封面" value={form.image_url} readonly onChange={() => {}} />
              <p className="card-note">官方频道的封面不可修改</p>
            </>
          ) : (
            <ImagePicker
              label="频道封面"
              value={form.image_url}
              onChange={(url, fileId) => setForm((prev) => (prev ? { ...prev, image_url: url, image_poster: fileId ?? null } : prev))}
            />
          )}
          <label className="field">
            <span>频道名称</span>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
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
          <label className="field">
            <span>宣传词</span>
            <input className="input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="三网直达 1080p" />
          </label>
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
            <ModalFooter
              onCancel={() => setAddingSource(false)}
              onConfirm={submitSource}
              confirmText="添加"
              disabled={!source.name.trim() || !source.path_url.trim()}
            />
          }
        >
          <label className="field">
            <span>源名称</span>
            <input className="input" value={source.name} onChange={(e) => setSource({ ...source, name: e.target.value })} placeholder="三网直达 1080p" autoFocus />
          </label>
          <div className="field-row field-row--wide">
            <label className="field">
              <span>类型</span>
              <select className="input" value={source.path_type} onChange={(e) => setSource({ ...source, path_type: e.target.value })}>
                <option value="m3u8">m3u8</option>
                <option value="guanfang">官方源</option>
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
