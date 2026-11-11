import { confirmDialog } from '@/ui/confirm'
import { promptDialog } from '@/ui/prompt'

/**
 * 删除前置确认。自己的资源只弹确认；别人的资源要填理由，作为接口的 reason。
 * 返回 null 表示取消，返回字符串表示可以继续（自己的删除给空串）。
 */
export async function confirmDelete({
  title,
  message,
  isSelf,
  owner,
}: {
  title: string
  message: string
  isSelf: boolean
  /** 上传者名字，用于说明「这是谁的」 */
  owner?: string | null
}): Promise<string | null> {
  if (isSelf) {
    const ok = await confirmDialog({
      title,
      message,
      confirmText: '删除',
      danger: true,
    })
    return ok ? '' : null
  }

  return promptDialog({
    title,
    message: owner ? `由 ${owner} 上传。${message}` : message,
    label: '理由',
    placeholder: '请说明删除原因',
    required: true,
    confirmText: '删除',
  })
}
