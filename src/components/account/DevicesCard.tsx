import { CardHead } from '@/components/CardHead'
import { CardTable } from '@/components/CardTable'
import { RecordRow } from '@/components/RecordRow'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { formatDateTime } from '@/lib/format'
import { useAccountMutations, useVideoDevices } from '@/api/queries'

/** 设备名来自客户端上报，可能是 URL 编码（如 Apple%20TV） */
function decodeDeviceName(raw?: string | null): string {
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/**
 * 已登录设备：逐台下线，或一次全部下线（含当前这台）。
 * 设备列表只在这张卡里用到，查询与 mutation 一并收进来。
 */
export function DevicesCard() {
  const devices = useVideoDevices()
  const actions = useAccountMutations()

  return (
    <article className="card">
      <CardHead title="已登录设备">
        {devices.data && devices.data.length > 0 ? (
          <button
            type="button"
            className="btn btn--quiet"
            disabled={actions.logoutDevice.isPending}
            onClick={async () => {
              const ok = await confirmDialog({
                title: '让所有设备下线？',
                message: '包括你正在用的这一台，之后需要在播放器里重新登录。',
                confirmText: '全部下线',
                danger: true,
              })
              if (!ok) return
              actions.logoutDevice.mutate(null, { onSuccess: () => toast('已全部下线', 'success') })
            }}
          >
            全部下线
          </button>
        ) : null}
      </CardHead>
      <CardTable
        loading={devices.isLoading}
        error={devices.error}
        onRetry={() => devices.refetch()}
        empty="没有登录中的设备"
        count={devices.data?.length ?? 0}
        loadingCols={3}
      >
        <RecordRow
          rows={devices.data ?? []}
          idKey={(device) => device.device_id}
          title={(device) => decodeDeviceName(device.device_name) || '未命名设备'}
          meta={(device) => (
            <span>
              {device.device_client} {device.device_version}
            </span>
          )}
          facts={(device) => (
            <span>{device.last_used_at ? formatDateTime(device.last_used_at) : '从未使用'}</span>
          )}
          actions={(device) => (
            <button
              type="button"
              className="btn btn--quiet"
              disabled={actions.logoutDevice.isPending}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: `让 ${device.device_name || '这台设备'} 下线？`,
                  message: '该设备需要重新登录才能继续播放。',
                  confirmText: '下线',
                  danger: true,
                })
                if (!ok) return
                actions.logoutDevice.mutate(device.device_id, { onSuccess: () => toast('已下线', 'success') })
              }}
            >
              下线
            </button>
          )}
        />
      </CardTable>
    </article>
  )
}
