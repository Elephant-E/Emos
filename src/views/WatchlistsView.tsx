import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { WatchlistForm } from '@/components/WatchlistForm'
import type { WatchlistFormValues } from '@/components/WatchlistForm'
import { Poster } from '@/components/Poster'
import { ClearSearchButton, EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { IconPlus } from '@/components/icons'
import { watchApi } from '@/api/endpoints'
import { useSession, useWatchPage } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatRelative, formatThousand } from '@/lib/format'
import { Pager } from '@/components/Pager'

export interface WatchSearch {
  page: number
  page_size: number
  scope: 'all' | 'self' | 'subscribed'
  type: 'video' | 'music'
  q: string
}

const TABS: Array<{ key: WatchSearch['scope']; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'self', label: '我创建的' },
  { key: 'subscribed', label: '我订阅的' },
]

export function WatchlistsView({ search, onSearch }: { search: WatchSearch; onSearch: (patch: Partial<WatchSearch>) => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [term, setTerm] = useState(search.q)
  useEffect(() => setTerm(search.q), [search.q])

  // 输入即搜：停手 350ms 推进 URL
  useEffect(() => {
    const next = term.trim()
    if (next === search.q) return
    const timer = setTimeout(() => onSearch({ q: next, page: 1 }), 350)
    return () => clearTimeout(timer)
  }, [term, search.q])
  const [removing, setRemoving] = useState(false)
  const session = useSession()
  const { data, isLoading, error, refetch } = useWatchPage({
    page: search.page,
    page_size: search.page_size,
    type: search.type,
    name: search.q || undefined,
    ...(search.scope === 'self' ? { is_self: true } : {}),
    ...(search.scope === 'subscribed' ? { is_subscribe: true } : {}),
  })

  const create = useMutation({
    mutationFn: (values: WatchlistFormValues) =>
      watchApi.createOrUpdate({
        type: values.type,
        name: values.name,
        description: values.description.trim() || undefined,
        is_public: values.is_public,
        point: values.point,
        tags: values.tags,
        image_poster_url: values.image_poster_url,
        // 后端要求该字段必填，缺省会 422 is show empty 不能为空
        is_show_empty: values.is_show_empty,
      }),
    onSuccess: () => {
      toast('片单已创建', 'success')
      setCreating(false)
      qc.invalidateQueries({ queryKey: ['watches'] })
      qc.invalidateQueries({ queryKey: ['session'] })
    },
  })


  return (
    <>
      <PageHeader
        crumb={['片单', TABS.find((t) => t.key === search.scope)?.label ?? '全部']}
        title="片单"
        tools={
          <span className="head-note">片单槽位剩余 {session.data ? session.data.slot_remaining : '—'}</span>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="范围">
          {TABS.map((tab) => (
            <button key={tab.key} className="tab" role="tab" aria-selected={search.scope === tab.key} onClick={() => onSearch({ scope: tab.key, page: 1 })}>
              {tab.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          type="search"
          placeholder="搜索片单名"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <div className="seg" role="group" aria-label="片单类型">
          <button aria-pressed={search.type === 'video'} onClick={() => onSearch({ type: 'video', page: 1 })}>
            影视
          </button>
          <button aria-pressed={search.type === 'music'} onClick={() => onSearch({ type: 'music', page: 1 })}>
            音乐
          </button>
        </div>
        <button className="btn btn--primary" onClick={() => setCreating(true)}>
          <IconPlus />
          新建片单
        </button>
      </div>

      {error ? <ErrorBlock error={error as Error & { status?: number }} onRetry={() => refetch()} /> : null}
      {!error && isLoading ? <LoadingBlock rows={5} columns={4} /> : null}

      {!error && !isLoading && data && data.items.length === 0 ? (
        <EmptyBlock
          action={
            search.q ? (
              <ClearSearchButton onClick={() => onSearch({ q: '', page: 1 })} />
            ) : (
              <button className="btn btn--primary" onClick={() => setCreating(true)}>
                新建片单
              </button>
            )
          }
          title={
            search.q
              ? `没有找到「${search.q}」`
              : search.scope === 'self'
                ? '还没有自己建的片单'
                : search.scope === 'subscribed'
                  ? '还没有订阅任何片单'
                  : '还没有片单'
          }
        />
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <div className="table-card content-in" key={`${data.items.length}-${data.items[0]?.id}-${data.total}`}>
          <table className="table table--fixed">
            <thead>
              <tr>
                <th style={{ width: '41%' }} className="th-thumb">片单</th>
                <th style={{ width: '13%' }}>可见性</th>
                <th className="num" style={{ width: '11%' }}>影片</th>
                <th className="num" style={{ width: '11%' }}>订阅</th>
                <th className="num" style={{ width: '12%' }}>更新</th>
                <th style={{ width: '88px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((watch) => (
                <tr
                  key={watch.id}
                  onClick={() => navigate({ to: '/watchlists/$watchId', params: { watchId: String(watch.id) }, search: { page: 1, page_size: 20, q: '' } })}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="cell-title">
                      {watch.image_poster_url ? (
                        <Poster src={watch.image_poster_url} name={String(watch.name ?? "?")} />
                      ) : (
                        <span className="thumb">{watch.name.slice(0, 1)}</span>
                      )}
                      <span>
                        <span className="cell-title__name">
                          {watch.name}
                          {watch.carrot > 0 ? (
                            <span className="badge badge--wait" style={{ marginLeft: 8 }}>
                              <i />
                              {watch.carrot} 胡萝卜
                            </span>
                          ) : null}
                          {watch.is_subscribe ? (
                            <span className="badge badge--run" style={{ marginLeft: 8 }}>
                              <i />
                              已订阅
                            </span>
                          ) : null}
                        </span>
                        <span className="cell-title__code">
                          {watch.is_self ? '我创建的' : watch.author?.username ?? '—'}
                          {watch.tags?.length ? ` · ${watch.tags.join(' / ')}` : ''}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${watch.is_public ? 'badge--ok' : 'badge--off'}`}>
                      <i />
                      {watch.is_public ? '公开' : '私密'}
                    </span>
                  </td>
                  <td className="num">{formatThousand(watch.video_count)}</td>
                  <td className="num">{formatThousand(watch.subscribe_count)}</td>
                  <td className="num muted">{formatRelative(watch.updated_at)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {watch.is_self ? (
                      <button
                        className="btn btn--danger-text"
                        disabled={removing}
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: `删除片单「${watch.name}」？`,
                            message: `${watch.video_count} 部影片会一起从片单移除，影片本身不受影响。`,
                            hint: '片单删除后无法恢复，槽位会释放。',
                            confirmText: '删除',
                            danger: true,
                          })
                          if (!ok) return
                          setRemoving(true)
                          try {
                            await watchApi.remove(watch.id)
                            // 删除会返还槽位
                            void qc.invalidateQueries({ queryKey: ['watches'] })
                            void qc.invalidateQueries({ queryKey: ['session'] })
                            toast('片单已删除', 'success')
                            void refetch()
                          } catch (error) {
                            toast(error instanceof Error ? error.message : '删除失败', 'error')
                          } finally {
                            setRemoving(false)
                          }
                        }}
                      >
                        删除
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager total={data.total} page={search.page} pageSize={search.page_size} onPage={(page) => onSearch({ page })} />
        </div>
      ) : null}

      {creating ? (
        <WatchlistForm
          defaultType={search.type}
          submitLabel="创建"
          pending={create.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => create.mutate(values)}
        />
      ) : null}
    </>
  )
}
