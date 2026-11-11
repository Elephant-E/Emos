import { PAGE_SIZES } from '@/lib/search'
import { useEffect, useState } from 'react'
import { IconLeft, IconRight } from './icons'

interface PagerProps {
  total: number
  page: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize?: (size: number) => void
  sizes?: readonly number[]
}

export function Pager({ total, page, pageSize, onPage, onPageSize, sizes = PAGE_SIZES }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const [jump, setJump] = useState(String(page))

  useEffect(() => setJump(String(page)), [page])

  const submit = () => {
    const next = Math.min(totalPages, Math.max(1, Number(jump) || 1))
    if (next !== page) onPage(next)
    else setJump(String(page))
  }

  return (
    <div className="table-foot">
      <span>
        共 {total.toLocaleString('zh-CN')} 条 · 第 {page} / {totalPages} 页
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onPageSize ? (
          <select
            className="input"
            style={{ height: 28, minWidth: 0, width: 78, fontSize: 12.5 }}
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            aria-label="每页条数"
          >
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size} / 页
              </option>
            ))}
          </select>
        ) : null}

        <div className="pager">
          <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="上一页">
            <IconLeft size={16} strokeWidth={1.9} />
          </button>
          <span className="pager__current" aria-current="page">{page}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="下一页">
            <IconRight size={16} strokeWidth={1.9} />
          </button>
        </div>

        {totalPages > 5 ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="muted text-xs">跳至</span>
            <input
              className="input"
              style={{ height: 28, width: 56, textAlign: 'center', fontSize: 12.5, minWidth: 0 }}
              value={jump}
              onChange={(e) => setJump(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              onBlur={submit}
              aria-label="跳转页码"
              inputMode="numeric"
            />
            <span className="muted text-xs">
              页
            </span>
          </span>
        ) : null}
      </div>
    </div>
  )
}
