import { useState } from 'react'
import { ListSection } from '@/components/ListSection'
import { SearchField } from '@/components/SearchField'
import { RecordRow } from '@/components/RecordRow'
import { PageHeader } from '@/components/PageHeader'
import { ClearSearchButton } from '@/components/StateBlock'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { IconPlus } from '@/components/icons'
import type { LineItem } from '@/api/types'
import { useLineList, useLineMutations } from '@/api/queries'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime } from '@/lib/format'

export interface LinesSearch {
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

  return (
    <>
      <PageHeader
        crumb={['线路']}
        title="线路"
      />

      <div className="toolbar">
        <SearchField
          label="搜索名称、地址或简介"
          placeholder="搜索名称、地址或简介"
          value={search.q}
          onCommit={(next) => onSearch({ q: next })}
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
        items={rows}
        // 线路一次取全，直接列出
        loadingRows={5}
        loadingKind="rows"
        loadingPoster="none"
        loadingLines={3}
        loadingActions={1}
        emptyTitle={(lines.data?.length ?? 0) === 0 ? '还没有线路' : `没有匹配「${search.q}」的线路`}
        emptyAction={
          (lines.data?.length ?? 0) > 0 ? <ClearSearchButton onClick={() => onSearch({ q: '' })} /> : undefined
        }
      >
        <RecordRow<LineItem>
            rows={rows}
            idKey={(line) => line.id}
            /* 后端在创建者缺失时会把名字拼成「xxx by NaN」，显示前剥掉这一段 */
            title={(line) => line.name.replace(/\s*by\s*NaN\s*$/i, '')}
            meta={(line) => (
              <>
                <span className="ellipsis">{line.url}</span>
                {line.is_self ? <span className="mark-mine">我的</span> : null}
              </>
            )}
            facts={(line) => (
              <>
                <span>{line.tagline ?? '—'}</span>
                <span>{formatDateTime(line.created_at)} 创建</span>
              </>
            )}
            actions={(line) =>
              line.is_self ? (
                <button
                  type="button"
                  className="btn btn--danger-text"
                  disabled={actions.remove.isPending}
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: `删除线路「${line.name}」？`,
                      message: '使用这条线路的客户端会立刻失效。',
                      hint: '建议先在客户端切到其他线路。',
                      confirmText: '删除',
                      danger: true,
                    })
                    if (!ok) return
                    actions.remove.mutate(line.id, { onSuccess: () => toast('已删除', 'success') })
                  }}
                >
                  删除
                </button>
              ) : null
            }
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
            <span>
              名称<span className="field__req">*</span>
            </span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="建议用自己的 ID，例如 @proxy"
              aria-required
              autoFocus
            />
          </label>
          <label className="field">
            <span>
              地址<span className="field__req">*</span>
            </span>
            <input
              className="input"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="http://proxy.local（不要带尾部斜杠）"
              aria-required
            />
          </label>
          <label className="field">
            <span>
              一句话简介<span className="field__req">*</span>
            </span>
            <input
              className="input"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="三网绕路"
              aria-required
            />
          </label>
          {/* 按钮禁用时说明还差什么，避免「点不动又不知道为什么」 */}
          <p className="form-hint">
            {!form.name.trim() || !form.url.trim() || !form.tagline.trim()
              ? `还差：${[!form.name.trim() && '名称', !form.url.trim() && '地址', !form.tagline.trim() && '简介'].filter(Boolean).join('、')}`
              : ''}
          </p>
        </Modal>
      ) : null}
    </>
  )
}
