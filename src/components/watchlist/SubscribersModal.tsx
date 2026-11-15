import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Pager } from '@/components/Pager'
import { UserCell } from '@/components/UserCell'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/StateBlock'
import { formatThousand } from '@/lib/format'
import { useWatchSubscribers } from '@/api/queries'

/** 订阅用户名单：分页 15 条，页状态与查询都收在这一个弹窗里 */
export function SubscribersModal({
  watchId,
  watchName,
  onClose,
}: {
  watchId: number
  watchName: string
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const subs = useWatchSubscribers(watchId, page, true)

  return (
    <Modal
      title={`订阅用户 · ${watchName}`}
      width={520}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          关闭
        </button>
      }
    >
      {subs.error ? <ErrorBlock bare error={subs.error} onRetry={() => subs.refetch()} /> : null}
      {subs.isLoading ? <LoadingBlock bare rows={4} columns={4} /> : null}
      {(subs.data?.items.length ?? 0) === 0 && !subs.isLoading && !subs.error ? (
        <EmptyBlock bare title="还没有人订阅" />
      ) : null}
      {(subs.data?.items.length ?? 0) > 0 ? (
        <table className="table table--inset">
          <thead>
            <tr>
              <th className="th-thumb">用户</th>
              <th className="num" style={{ width: 90 }}>付费</th>
              <th style={{ width: 110 }}>到期</th>
            </tr>
          </thead>
          <tbody>
            {(subs.data?.items ?? []).map((row, index) => (
              <tr key={`${row.username}-${index}`}>
                <td>
                  <UserCell name={row.username} avatar={row.avatar} />
                </td>
                <td className="num muted">{row.carrot ? formatThousand(row.carrot) : '—'}</td>
                <td className="muted">{row.expiration_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {subs.data ? <Pager total={subs.data.total} page={page} pageSize={subs.data.page_size} onPage={setPage} /> : null}
    </Modal>
  )
}
