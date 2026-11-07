import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Poster } from '@/components/Poster'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
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
  const [removing, setRemoving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', is_public: true, point: 0, tags: '' })

  const session = useSession()
  const { data, isLoading, isPlaceholderData, error, refetch } = useWatchPage({
    page: search.page,
    page_size: search.page_size,
    type: search.type,
    ...(search.scope === 'self' ? { is_self: true } : {}),
    ...(search.scope === 'subscribed' ? { is_subscribe: true } : {}),
  })

  const create = useMutation({
    mutationFn: () =>
      watchApi.createOrUpdate({
        type: search.type,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        is_public: form.is_public,
        point: form.point,
        tags: form.tags.split(/[,，\s]+/).filter(Boolean),
        // 后端要求该字段必填，缺省会 422 is show empty 不能为空
        is_show_empty: true,
      }),
    onSuccess: () => {
      toast('片单已创建', 'success')
      setCreating(false)
      setForm({ name: '', description: '', is_public: true, point: 0, tags: '' })
      qc.invalidateQueries({ queryKey: ['watches'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : '创建失败', 'error'),
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
        <span className="spacer" />
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
          title="还没有片单"
          action={<button className="btn btn--primary" onClick={() => setCreating(true)}>新建片单</button>}
        />
      ) : null}

      {!error && !isLoading && data && data.items.length > 0 ? (
        <div className={`table-card content-in${isPlaceholderData ? ' is-stale' : ''}`} key={`${data.items.length}-${data.items[0]?.id}-${data.total}`}>
          <table className="table table--fixed">
            <thead>
              <tr>
                <th style={{ width: '41%' }}>片单</th>
                <th style={{ width: '13%' }}>可见性</th>
                <th className="num" style={{ width: '11%' }}>影片</th>
                <th className="num" style={{ width: '11%' }}>订阅</th>
                <th className="num" style={{ width: '12%' }}>更新</th>
                <th style={{ width: '88px', textAlign: 'right' }}>操作</th>
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
                          {watch.is_subscribe ? (
                            <span className="badge badge--run" style={{ marginLeft: 8 }}>
                              <i />
                              已订阅
                            </span>
                          ) : null}
                        </span>
                        <span className="cell-title__code">
                          {watch.is_self ? '我创建的' : watch.author?.username ?? '—'}
                          {watch.tags.length ? ` · ${watch.tags.join(' / ')}` : ''}
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
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
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
        <Modal
          title="新建片单"
          onClose={() => setCreating(false)}
          onSubmit={() => {
            if (form.name.trim().length >= 2 && !create.isPending) create.mutate()
          }}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setCreating(false)}>
                取消
              </button>
              <button className="btn btn--primary" type="submit" disabled={form.name.trim().length < 2 || create.isPending}>
                创建
              </button>
            </>
          }
        >
          <label className="field">
            <span>名称</span>
            <input className="input" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </label>
          <label className="field">
            <span>简介</span>
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="field">
            <span>标签（逗号或空格分隔）</span>
            <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </label>
          <label className="switch">
            <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
            公开片单
          </label>
        </Modal>
      ) : null}
    </>
  )
}
