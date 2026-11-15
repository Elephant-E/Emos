import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListCard } from '@/components/ListCard'
import { InlineSortInput } from '@/components/InlineSortInput'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { WatchlistForm } from '@/components/WatchlistForm'
import type { WatchlistFormValues } from '@/components/WatchlistForm'
import { Poster } from '@/components/Poster'
import { ClearSearchButton, EmptyBlock, ErrorBlock, LoadingBlock, OutOfRangeBlock } from '@/components/StateBlock'
import { IconPlus } from '@/components/icons'
import { watchApi } from '@/api/endpoints'
import { qk, useSession, useWatchPage } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { rowLink } from '@/lib/rowLink'
import { useDebounced } from '@/lib/useDebounced'
import { formatRelative, formatThousand } from '@/lib/format'
import { Pager } from '@/components/Pager'

export interface WatchSearch {
  page: number
  page_size: number
  scope: 'all' | 'self' | 'subscribed'
  q: string
}

const TABS: Array<{ key: WatchSearch['scope']; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'self', label: '我创建的' },
  { key: 'subscribed', label: '我订阅的' },
]

/** 空态标题：搜索没命中优先，其次按范围 */
function emptyTitle(q: string, scope: WatchSearch['scope']): string {
  if (q) return `没有找到「${q}」`
  if (scope === 'self') return '还没有自己建的片单'
  if (scope === 'subscribed') return '还没有订阅任何片单'
  return '还没有片单'
}

export function WatchlistsView({ search, onSearch }: { search: WatchSearch; onSearch: (patch: Partial<WatchSearch>) => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [term, setTerm] = useState(search.q)
  useEffect(() => setTerm(search.q), [search.q])

  useDebounced(term, (next) => onSearch({ q: next, page: 1 }), { current: search.q })
  const session = useSession()
  const { data, isLoading, error, refetch } = useWatchPage({
    page: search.page,
    page_size: search.page_size,
    // 不传 type：上游只认 video，传 music 直接 422
    name: search.q || undefined,
    ...(search.scope === 'self' ? { is_self: true } : {}),
    ...(search.scope === 'subscribed' ? { is_subscribe: true } : {}),
  })

  const remove = useMutation({
    mutationFn: (watchId: number) => watchApi.remove(watchId),
    onSuccess: () => {
      toast('片单已删除', 'success')
      // 删除会返还槽位
      qc.invalidateQueries({ queryKey: qk.watches })
      qc.invalidateQueries({ queryKey: qk.session })
    },
  })

  // 排序值只影响「我的片单」在列表里的位置，改完刷新列表即可
  const sortWatch = useMutation({
    mutationFn: ({ watchId, sort }: { watchId: number; sort: number }) => watchApi.sort(watchId, sort),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.watches }),
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
      qc.invalidateQueries({ queryKey: qk.watches })
      qc.invalidateQueries({ queryKey: qk.session })
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
        <Tabs items={TABS} value={search.scope} onChange={(scope) => onSearch({ scope, page: 1 })} label="范围" />
        <span className="spacer" />
        <input
          className="input"
          type="search"
            aria-label="搜索片单名"
          placeholder="搜索片单名"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
          <IconPlus />
          新建片单
        </button>
      </div>

      {error ? <ErrorBlock error={error} onRetry={() => refetch()} /> : null}
      {!error && isLoading ? <LoadingBlock rows={5} columns={4} /> : null}

      {!error && !isLoading && data && data.items.length === 0 && search.page > 1 ? (
        <OutOfRangeBlock onFirstPage={() => onSearch({ page: 1 })} />
      ) : null}

      {!error && !isLoading && data && data.items.length === 0 && search.page === 1 ? (
        <EmptyBlock
          action={
            search.q ? (
              <ClearSearchButton onClick={() => onSearch({ q: '', page: 1 })} />
            ) : (
              <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
                新建片单
              </button>
            )
          }
          title={emptyTitle(search.q, search.scope)}
        />
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <ListCard items={data.items} total={data.total} idKey={(v) => v.id}>
          <table className="table table--auto table--thumb-wide">
            <thead>
              <tr>
                <th className="th-thumb">片单</th>
                <th>可见性</th>
                <th className="num">影片</th>
                <th className="num">订阅</th>
                <th className="num">更新</th>
                {search.scope === 'subscribed' ? <th className="num">排序</th> : null}
                <th style={{ width: '1%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((watch) => (
                <tr
                  key={watch.id}
                  {...rowLink(() =>
                    navigate({ to: '/watchlists/$watchId', params: { watchId: String(watch.id) }, search: { page: 1, page_size: 20, q: '' } }),
                  )}
                >
                  <td>
                    <div className="cell-title">
                      <Poster src={watch.image_poster_url} name={String(watch.name ?? "?")} shape="wide" />
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
                  {search.scope === 'subscribed' ? (
                    <td className="num cell--input" onClick={(e) => e.stopPropagation()}>
                      <InlineSortInput
                        value={watch.user_sort}
                        label={`${watch.name} 的排序`}
                        stopRowClick
                        onCommit={(sort) => sortWatch.mutate({ watchId: watch.id, sort })}
                      />
                    </td>
                  ) : null}
                  <td onClick={(e) => e.stopPropagation()}>
                    {watch.is_self ? (
                      <button type="button"
                        className="btn btn--danger-text"
                        disabled={remove.isPending}
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: `删除片单「${watch.name}」？`,
                            message: `${watch.video_count} 部影片会一起从片单移除，影片本身不受影响。`,
                            hint: '片单删除后无法恢复，槽位会释放。',
                            confirmText: '删除',
                            danger: true,
                          })
                          if (!ok) return
                          remove.mutate(watch.id)
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
          <Pager
            total={data.total}
            page={search.page}
            pageSize={search.page_size}
            onPage={(page) => onSearch({ page })}
            onPageSize={(page_size) => onSearch({ page_size, page: 1 })}
          />
        </ListCard>
      ) : null}

      {creating ? (
        <WatchlistForm
          defaultType="video"
          submitLabel="创建"
          pending={create.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => create.mutate(values)}
        />
      ) : null}
    </>
  )
}
