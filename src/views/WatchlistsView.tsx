import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListSection } from '@/components/ListSection'
import { RecordList } from '@/components/RecordList'
import { InlineSortInput } from '@/components/InlineSortInput'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { WatchlistForm } from '@/components/WatchlistForm'
import type { WatchlistFormValues } from '@/components/WatchlistForm'
import { Poster } from '@/components/Poster'
import { ClearSearchButton } from '@/components/StateBlock'
import { IconPlus } from '@/components/icons'
import { watchApi } from '@/api/endpoints'
import { qk, useSession } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useDebounced } from '@/lib/useDebounced'
import { formatRelative, formatThousand } from '@/lib/format'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

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
  const watchParams = {
    page_size: search.page_size,
    // 不传 type：上游只认 video，传 music 直接 422
    name: search.q || undefined,
    ...(search.scope === 'self' ? { is_self: true } : {}),
    ...(search.scope === 'subscribed' ? { is_subscribe: true } : {}),
  }
  // 两端都走滚动加载
  const infinite = usePagedInfinite(
    (page) => watchApi.list({ ...watchParams, page }),
    { resetKey: `${search.scope}|${search.q}|${search.page_size}` },
  )
  const items = infinite.items

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

      <ListSection
        isLoading={infinite.loading && infinite.items.length === 0}
        error={infinite.error}
        onRetry={() => infinite.retry()}
        items={items}
        total={infinite.total}
        infinite={{ hasMore: infinite.hasMore, loading: infinite.loadingMore, onLoadMore: infinite.loadMore }}
        idKey={(w) => w.id}
        scope={`${search.scope}-${search.q}`}
        cardList
        loadingRows={5}
        loadingCols={4}
        emptyTitle={emptyTitle(search.q, search.scope)}
        emptyAction={
          search.q ? (
            <ClearSearchButton onClick={() => onSearch({ q: '', page: 1 })} />
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              新建片单
            </button>
          )
        }
      >
          <RecordList
            rows={items}
            idKey={(watch) => watch.id}
            onOpen={(watch) =>
              navigate({ to: '/watchlists/$watchId', params: { watchId: String(watch.id) }, search: { page: 1, page_size: 20, q: '' } })
            }
            className="table table--auto table--thumb-wide"
            columns={[
              {
                key: 'name',
                label: '片单',
                thClass: 'th-thumb',
                mobile: 'primary',
                render: (watch) => (
                  <div className="cell-title">
                    <Poster src={watch.image_poster_url} name={String(watch.name ?? '?')} shape="wide" />
                    <span>
                      <span className="cell-title__name">
                        {watch.name}
                        {watch.carrot > 0 ? (
                          <span className="badge badge--wait" style={{ marginLeft: 'var(--sp-2)' }}>
                            <i />
                            {watch.carrot} 胡萝卜
                          </span>
                        ) : null}
                        {watch.is_subscribe ? (
                          <span className="badge badge--run" style={{ marginLeft: 'var(--sp-2)' }}>
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
                ),
              },
              {
                key: 'public',
                label: '可见性',
                mobile: 'inline',
                mobileLabel: null,
                render: (watch) => (
                  <span className={`badge ${watch.is_public ? 'badge--ok' : 'badge--off'}`}>
                    <i />
                    {watch.is_public ? '公开' : '私密'}
                  </span>
                ),
              },
              {
                key: 'videos',
                label: '影片',
                thClass: 'num',
                mobile: 'inline',
                render: (watch) => <>{formatThousand(watch.video_count)} 部</>,
              },
              {
                key: 'subs',
                label: '订阅',
                thClass: 'num',
                mobile: 'inline',
                render: (watch) => <>{formatThousand(watch.subscribe_count)} 人订阅</>,
              },
              {
                key: 'updated',
                label: '更新',
                thClass: 'num',
                mobile: 'inline',
                mobileLabel: null,
                render: (watch) => <span className="muted">{formatRelative(watch.updated_at)}</span>,
              },
              ...(search.scope === 'subscribed'
                ? [
                    {
                      key: 'sort',
                      label: '排序',
                      thClass: 'num',
                      mobile: 'block' as const,
                      render: (watch: (typeof items)[number]) => (
                        <InlineSortInput
                          value={watch.user_sort}
                          label={`${watch.name} 的排序`}
                          onCommit={(sort) => sortWatch.mutate({ watchId: watch.id, sort })}
                        />
                      ),
                    },
                  ]
                : []),
              {
                key: 'action',
                label: '操作',
                thWidth: '1%',
                mobile: 'block',
                mobileAlign: 'end',
                render: (watch) =>
                  watch.is_self ? (
                    <button
                      type="button"
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
                  ) : null,
              },
            ]}
          />
      </ListSection>

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
