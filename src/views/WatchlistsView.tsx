import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListSection } from '@/components/ListSection'
import { RecordGrid } from '@/components/RecordGrid'
import { InlineSortInput } from '@/components/InlineSortInput'
import { Tabs } from '@/components/Tabs'
import { PageHeader } from '@/components/PageHeader'
import { WatchlistForm } from '@/components/WatchlistForm'
import type { WatchlistFormValues } from '@/components/WatchlistForm'
import { ClearSearchButton } from '@/components/StateBlock'
import { IconPlus } from '@/components/icons'
import { watchApi } from '@/api/endpoints'
import { qk, useSession } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { useDebounced } from '@/lib/useDebounced'
import { usePagedInfinite } from '@/lib/usePagedInfinite'

export interface WatchSearch {
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

  useDebounced(term, (next) => onSearch({ q: next }), { current: search.q })
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
        <Tabs items={TABS} value={search.scope} onChange={(scope) => onSearch({ scope })} label="范围" />
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
        bare
        loadingRows={5}
        loadingCols={4}
        emptyTitle={emptyTitle(search.q, search.scope)}
        emptyAction={
          search.q ? (
            <ClearSearchButton onClick={() => onSearch({ q: '' })} />
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              新建片单
            </button>
          )
        }
      >
          <RecordGrid
            rows={items}
            idKey={(watch) => watch.id}
            shape="wide"
            onOpen={(watch) =>
              navigate({ to: '/watchlists/$watchId', params: { watchId: String(watch.id) }, search: { page_size: 20, q: '' } })
            }
            poster={(watch) => watch.image_poster_url}
            title={(watch) => watch.name}
            meta={(watch) => (
              <>
                <span>{watch.is_public ? '公开' : '私密'}</span>
                {watch.updated_at ? <span>{watch.updated_at.slice(0, 4)}</span> : null}
              </>
            )}
            actions={(watch) => (
              <>
                {/* 订阅的片单要能调顺序：卡片底部给一个行内输入 */}
                {search.scope === 'subscribed' ? (
                  <InlineSortInput
                    value={watch.user_sort}
                    label={`${watch.name} 的排序`}
                    onCommit={(sort) => sortWatch.mutate({ watchId: watch.id, sort })}
                  />
                ) : null}
                {watch.is_self ? (
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
                ) : null}
              </>
            )}
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
