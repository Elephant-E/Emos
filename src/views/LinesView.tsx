import { useState } from 'react'
import { ListSection } from '@/components/ListSection'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { RecordList } from '@/components/RecordList'
import { PageHeader } from '@/components/PageHeader'
import { ClearSearchButton } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { IconPlus } from '@/components/icons'
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
  const compact = useMediaQuery('(max-width: 600px)')
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

      <ListSection
        isLoading={lines.isLoading}
        error={lines.error}
        onRetry={() => lines.refetch()}
        items={compact ? rows : paged}
        total={rows.length}
        page={search.page}
        pageSize={search.page_size}
        onPage={(page) => onSearch({ page })}
        onPageSize={(page_size) => onSearch({ page_size, page: 1 })}
        cardList
        // 线路是「一次取全 + 前端分页」，手机端不需要分页器，直接滑
        infinite={{ hasMore: false, loading: false, onLoadMore: () => {} }}
        sizes={[20, 50]}
        idKey={(line) => line.id}
        loadingRows={4}
        loadingCols={4}
        emptyTitle={(lines.data?.length ?? 0) === 0 ? '还没有线路' : `没有匹配「${search.q}」的线路`}
        emptyAction={
          (lines.data?.length ?? 0) > 0 ? <ClearSearchButton onClick={() => onSearch({ q: '', page: 1 })} /> : undefined
        }
      >
        <RecordList
            rows={paged}
            idKey={(line) => line.id}
            className="table table--auto"
            columns={[
              {
                key: 'name',
                label: '名称',
                mobile: 'primary',
                render: (line) => (
                  <div className="cell-title">
                    <span>
                      <span className="cell-title__name">{line.name}</span>
                      {line.is_self ? <span className="cell-title__code">我的</span> : null}
                    </span>
                  </div>
                ),
              },
              {
                key: 'url',
                label: '地址',
                mobile: 'row',
                render: (line) => <span className="muted ellipsis">{line.url}</span>,
              },
              {
                key: 'tagline',
                label: '简介',
                mobile: 'row',
                render: (line) => <span className="muted">{line.tagline ?? '—'}</span>,
              },
              {
                key: 'created',
                label: '创建时间',
                mobile: 'hidden',
                render: (line) => <span className="muted">{formatDateTime(line.created_at)}</span>,
              },
              {
                key: 'actions',
                label: '操作',
                mobile: 'block',
                mobileAlign: 'end',
                render: (line) =>
                  line.is_self ? (
                    <button
                      type="button"
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
                  ) : null,
              },
            ]}
          />
      </ListSection>


      {creating ? (
        <Modal
          title="新增线路"
          onClose={() => setCreating(false)}
          onSubmit={submitLine}
          footer={
            <ModalFooter
              onCancel={() => setCreating(false)}
              onConfirm={() => void submitLine()}
              confirmText="创建"
              disabled={!form.name.trim() || !form.url.trim() || !form.tagline.trim()}
            />
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
