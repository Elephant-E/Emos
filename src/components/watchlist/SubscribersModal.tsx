import { Modal } from '@/components/Modal'
import { RecordRow } from '@/components/RecordRow'
import { EmptyBlock, ErrorBlock, LoadingRows } from '@/components/StateBlock'
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
  const subs = useWatchSubscribers(watchId, 1, true)

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
      {subs.error ? <ErrorBlock error={subs.error} onRetry={() => subs.refetch()} /> : null}
      {subs.isLoading ? <LoadingRows count={4} single poster="square" lines={2} actions={0} /> : null}
      {(subs.data?.items ?? []).length === 0 && !subs.isLoading && !subs.error ? (
        <EmptyBlock title="还没有人订阅" />
      ) : null}
      {(subs.data?.items ?? []).length > 0 ? (
        <>
          <p className="meta-sm" style={{ marginBottom: 'var(--sp-2)' }}>
            共 {subs.data?.total ?? subs.data?.items.length ?? 0} 人
            {(subs.data?.total ?? 0) > (subs.data?.items.length ?? 0)
              ? `，当前显示前 ${subs.data?.items.length ?? 0} 人`
              : ''}
          </p>
          <RecordRow
          rows={subs.data?.items ?? []}
          idKey={(row) => `${row.username}-${row.created_at}`}
          single
          posterShape="square"
          poster={(row) => row.avatar}
          title={(row) => row.username}
          facts={(row) => (
            <>
              <span>{row.carrot ? `${formatThousand(row.carrot)} 付费` : '免费订阅'}</span>
              <span>{row.expiration_date ? `${row.expiration_date} 到期` : '长期有效'}</span>
            </>
          )}
          />
        </>
      ) : null}
    </Modal>
  )
}
