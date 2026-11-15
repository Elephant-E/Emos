import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { ClearSearchButton, EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconPlus } from '@/components/icons'
import { Pager } from '@/components/Pager'
import { useLineList, useLineMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime } from '@/lib/format'

export interface LinesSearch {
  page: number
  page_size: number
  q: string
}

export function LinesView({ search, onSearch }: { search: LinesSearch; onSearch: (patch: Partial<LinesSearch>) => void }) {
  const lines = useLineList()
  const actions = useLineMutations()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', tagline: '' })

  const submitLine = () => {
    if (!form.name.trim() || !form.url.trim() || !form.tagline.trim() || actions.create.isPending) return
    actions.create.mutate(
      { name: form.name.trim(), url: form.url.trim(), tagline: form.tagline.trim() },
      {
        onSuccess: () => {
          toast('线路已创建', 'success')
          setCreating(false)
          setForm({ name: '', url: '', tagline: '' })
        },
      },
    )
  }

  const rows = (lines.data ?? []).filter((line) => {
    const q = search.q.trim().toLowerCase()
    if (!q) return true
    return line.name.toLowerCase().includes(q) || line.url.toLowerCase().includes(q) || (line.tagline ?? '').toLowerCase().includes(q)
  })
  const paged = rows.slice((search.page - 1) * search.page_size, search.page * search.page_size)

  return (
    <>
      <PageHeader
        crumb={['线路']}
        title="线路"
      />

      <div className="toolbar">
        <input
          className="input"
          type="search"
            aria-label="搜索名称、地址或简介"
          placeholder="搜索名称、地址或简介"
          value={search.q}
          onChange={(e) => onSearch({ q: e.target.value, page: 1 })}
        />
        <span className="spacer" />
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
          <IconPlus />
          新增线路
        </button>
      </div>

      {lines.error ? <ErrorBlock error={lines.error} onRetry={() => lines.refetch()} /> : null}
      {lines.isLoading ? <LoadingBlock rows={4} columns={4} /> : null}
      {lines.data && lines.data.length === 0 ? <EmptyBlock title="还没有线路" /> : null}
      {lines.data && lines.data.length > 0 && rows.length === 0 ? (
        <EmptyBlock
          title={`没有匹配「${search.q}」的线路`}
          action={<ClearSearchButton onClick={() => onSearch({ q: '', page: 1 })} />}
        />
      ) : null}
      {/* 页码越界：有数据但这一页是空的，仍要渲染空态与回第一页入口 */}
      {lines.data && rows.length > 0 && paged.length === 0 ? (
        <EmptyBlock
          title="这一页没有内容"
          hint={`共 ${rows.length} 条，当前在第 ${search.page} 页`}
          action={<button type="button" className="btn btn--ghost" onClick={() => onSearch({ page: 1 })}>回到第一页</button>}
        />
      ) : null}

      {paged.length > 0 ? (
        <div className="table-card">
          <table className="table table--auto">
            <thead>
              <tr>
                <th>名称</th>
                <th>地址</th>
                <th>简介</th>
                <th>创建时间</th>
                <th>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((line) => (
                <tr key={line.id}>
                  <td>
                    <div className="cell-title">
                      <span>
                        <span className="cell-title__name">{line.name}</span>
                        {line.is_self ? <span className="cell-title__code">我的</span> : null}
                      </span>
                    </div>
                  </td>
                  <td className="muted" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {line.url}
                  </td>
                  <td className="muted">{line.tagline ?? '—'}</td>
                  <td className="muted">{formatDateTime(line.created_at)}</td>
                  <td>
                    {line.is_self ? (
                      <button type="button"
                        className="btn btn--danger-text"
                        disabled={actions.remove.isPending}
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: `删除线路「${line.name}」？`,
                            message: '使用这条线路的客户端会立刻失效。',
                            hint: '建议先在客户端切到其它线路。',
                            confirmText: '删除',
                            danger: true,
                          })
                          if (!ok) return
                          actions.remove.mutate(line.id, { onSuccess: () => toast('已删除', 'success') })
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
        </div>
      ) : null}

      {/* 页码区独立于表格：越界时表格不渲染，但翻页与回第一页的入口要还在 */}
      {rows.length > 0 ? (
        <Pager
          total={rows.length}
          page={search.page}
          pageSize={search.page_size}
          sizes={[20, 50]}
          onPage={(page) => onSearch({ page })}
          onPageSize={(page_size) => onSearch({ page_size, page: 1 })}
        />
      ) : null}

      {creating ? (
        <Modal
          title="新增线路"
          onClose={() => setCreating(false)}
          onSubmit={submitLine}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)}>
                取消
              </button>
              <button type="button"
                className="btn btn--primary"
                disabled={!form.name.trim() || !form.url.trim() || !form.tagline.trim()}
                onClick={submitLine}
              >
                创建
              </button>
            </>
          }
        >
          <label className="field">
            <span>名称（建议用自己 ID）</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="@proxy" autoFocus />
          </label>
          <label className="field">
            <span>地址（不要带尾部斜杠）</span>
            <input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="http://proxy.local" />
          </label>
          <label className="field">
            <span>一句话简介（必填）</span>
            <input className="input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="三网绕路" />
          </label>
        </Modal>
      ) : null}
    </>
  )
}
