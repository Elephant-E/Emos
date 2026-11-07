import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { IconPlus } from '@/components/icons'
import { Pager } from '@/components/Pager'
import { useLineList, useLineMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime } from '@/lib/format'

export function LinesView() {
  const lines = useLineList()
  const actions = useLineMutations()
  const [creating, setCreating] = useState(false)
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [form, setForm] = useState({ name: '', url: '', tagline: '' })

  const rows = (lines.data ?? []).filter((line) => {
    const q = term.trim().toLowerCase()
    if (!q) return true
    return line.name.toLowerCase().includes(q) || line.url.toLowerCase().includes(q) || (line.tagline ?? '').toLowerCase().includes(q)
  })
  const paged = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <PageHeader
        crumb={['线路']}
        title="线路"
        tools={
          <span className="stamp">
            <i />
            反代线路
          </span>
        }
      />

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="搜索名称、地址或简介"
          value={term}
          onChange={(e) => { setTerm(e.target.value); setPage(1) }}
        />
        <span className="spacer" />
        <button className="btn btn--primary" onClick={() => setCreating(true)}>
          <IconPlus />
          新增线路
        </button>
      </div>

      {lines.error ? <ErrorBlock error={lines.error as Error & { status?: number }} onRetry={() => lines.refetch()} /> : null}
      {lines.isLoading ? <LoadingBlock rows={4} columns={4} /> : null}
      {lines.data && lines.data.length === 0 ? <EmptyBlock title="还没有线路" /> : null}
      {lines.data && lines.data.length > 0 && rows.length === 0 ? <EmptyBlock title={`没有匹配「${term}」的线路`} /> : null}

      {paged.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '24%' }}>名称</th>
                <th>地址</th>
                <th style={{ width: '18%' }}>简介</th>
                <th style={{ width: '18%' }}>创建时间</th>
                <th style={{ width: '12%', textAlign: 'right' }}>
                  操作
                  <span className="th-hint">他人创建只读</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((line) => (
                <tr key={line.id}>
                  <td>
                    <div className="cell-title">
                      <span className="thumb">{line.name.slice(0, 1)}</span>
                      <span>
                        <span className="cell-title__name">{line.name}</span>
                        <span className="cell-title__code">#{line.id}{line.is_self ? ' · 我的' : ''}</span>
                      </span>
                    </div>
                  </td>
                  <td className="muted" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {line.url}
                  </td>
                  <td className="muted">{line.tagline ?? '—'}</td>
                  <td className="muted">{formatDateTime(line.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {line.is_self ? (
                      <button
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
                    ) : (
                      <span className="muted">只读</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            total={rows.length}
            page={page}
            pageSize={pageSize}
            sizes={[20, 50]}
            onPage={setPage}
            onPageSize={(size) => { setPageSize(size); setPage(1) }}
          />
        </div>
      ) : null}

      {creating ? (
        <Modal
          title="新增线路"
          hint="地址不要带尾部斜杠；名称建议用自己的 ID。"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setCreating(false)}>
                取消
              </button>
              <button
                className="btn btn--primary"
                disabled={!form.name.trim() || !form.url.trim()}
                onClick={() =>
                  actions.create.mutate(
                    { name: form.name.trim(), url: form.url.trim(), tagline: form.tagline.trim() || undefined },
                    {
                      onSuccess: () => {
                        toast('线路已创建', 'success')
                        setCreating(false)
                        setForm({ name: '', url: '', tagline: '' })
                      },
                    },
                  )
                }
              >
                创建
              </button>
            </>
          }
        >
          <label className="field">
            <span>名称</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="@proxy" autoFocus />
          </label>
          <label className="field">
            <span>地址</span>
            <input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="http://proxy.local" />
          </label>
          <label className="field">
            <span>一句话简介</span>
            <input className="input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="三网绕路" />
          </label>
        </Modal>
      ) : null}
    </>
  )
}
