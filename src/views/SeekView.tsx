import { PageHeader } from '@/components/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { IconLeft, IconPlus, IconRight } from '@/components/icons'
import { useSeeks } from '@/api/queries'
import { formatRelative, ZONE_COLOR, ZONE_LABEL } from '@/lib/format'

export interface SeekSearch {
  page: number
  page_size: number
  status: string
}

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '待认领' },
  { key: 'claimed', label: '已认领' },
  { key: 'done', label: '已完成' },
]

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: '待认领', cls: 'badge--wait' },
  claimed: { label: '已认领', cls: 'badge--run' },
  done: { label: '已完成', cls: 'badge--ok' },
  closed: { label: '已关闭', cls: 'badge--off' },
}

export function SeekView({ search, onSearch }: { search: SeekSearch; onSearch: (patch: Partial<SeekSearch>) => void }) {
  const { data, isLoading, error, refetch, isFetching } = useSeeks({
    page: search.page,
    page_size: search.page_size,
    status: search.status,
  })
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <>
      <PageHeader
        crumb={['求片', TABS.find((t) => t.key === search.status)?.label ?? '全部']}
        title="求片"
        hint={data ? `${data.total} 条` : undefined}
        tools={
          <span className="stamp">
            <i />
            {isFetching ? '拉取中' : '每 30 秒自动刷新'}
          </span>
        }
      />

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="状态">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className="tab"
              role="tab"
              aria-selected={search.status === tab.key}
              onClick={() => onSearch({ status: tab.key, page: 1 })}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button className="btn btn--primary">
          <IconPlus />
          发起求片
        </button>
      </div>

      {error ? <ErrorBlock error={error} onRetry={() => refetch()} /> : null}
      {!error && isLoading ? <LoadingBlock rows={6} columns={4} /> : null}

      {!error && !isLoading && data && data.data.length === 0 ? (
        <EmptyBlock title="这个状态下没有求片" hint="换个状态看看，或者发起一条新的求片。" />
      ) : null}

      {!error && !isLoading && data && data.data.length > 0 ? (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>求片</th>
                <th style={{ width: '14%' }}>类型</th>
                <th style={{ width: '14%' }}>状态</th>
                <th className="num" style={{ width: '12%' }}>
                  胡萝卜
                </th>
                <th className="num" style={{ width: '12%' }}>
                  催片
                </th>
                <th className="num" style={{ width: '14%' }}>
                  提交时间
                </th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((item) => {
                const st = STATUS[item.status] ?? STATUS.open
                return (
                  <tr key={item.seek_id}>
                    <td>
                      <div className="cell-title">
                        <span className="thumb" aria-hidden="true">
                          {item.title.slice(0, 1)}
                        </span>
                        <span>
                          <span className="cell-title__name">{item.title}</span>
                          <span className="cell-title__code">
                            {item.seek_id}
                            {item.claim_user ? ` · 认领人 ${item.claim_user.username}` : ''}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="zone">
                        <span className="rail__dot" style={{ color: ZONE_COLOR[item.type ?? 'movie'] }} />
                        {ZONE_LABEL[item.type ?? 'movie']}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${st.cls}`}>
                        <i />
                        {st.label}
                      </span>
                    </td>
                    <td className="num">{item.carrot ?? 0}</td>
                    <td className="num">{item.urge_count ?? 0}</td>
                    <td className="num muted">{formatRelative(item.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="table-foot">
            <span>
              共 {data.total} 条 · 第 {search.page} / {totalPages} 页
            </span>
            <div className="pager">
              <button disabled={search.page <= 1} onClick={() => onSearch({ page: search.page - 1 })} aria-label="上一页">
                <IconLeft />
              </button>
              <button aria-current="page">{search.page}</button>
              <button disabled={search.page >= totalPages} onClick={() => onSearch({ page: search.page + 1 })} aria-label="下一页">
                <IconRight />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
