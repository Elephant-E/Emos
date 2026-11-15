import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'
import { TagInput } from '@/components/TagInput'
import { toast } from '@/ui/toast'
import { useWatchMutations } from '@/api/queries'

/** 设置维护者：输入用户 ID 回车添加，清空全部即取消维护者 */
export function MaintainerModal({
  watchId,
  current,
  onClose,
}: {
  watchId: number
  current: string[]
  onClose: () => void
}) {
  const [ids, setIds] = useState<string[]>(current)
  const { setMaintainers } = useWatchMutations(watchId)

  return (
    <Modal
      title="设置维护者"
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() =>
            setMaintainers.mutate(ids, {
              onSuccess: () => {
                toast('已保存', 'success')
                onClose()
              },
            })
          }
          confirmText="保存"
          pending={setMaintainers.isPending}
        />
      }
    >
      <div className="field">
        <span>维护者用户 ID</span>
        <TagInput
          value={ids}
          onChange={setIds}
          placeholder="输入用户 ID 后回车，全部清空即取消维护者"
          autoFocus
        />
      </div>
    </Modal>
  )
}
