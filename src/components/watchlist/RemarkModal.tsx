import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'

/** 影片备注（只有自己看得到）：备注用弹窗内 state，保存时回传；`sort` 由调用方在保存时读当前列表值。 */
export function RemarkModal({
  title,
  current,
  pending,
  onClose,
  onSave,
}: {
  title: string
  current: string
  pending: boolean
  onClose: () => void
  onSave: (remark: string) => void
}) {
  const [remark, setRemark] = useState(current)
  return (
    <Modal
      title={`备注 · ${title}`}
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => onSave(remark.trim())}
          confirmText="保存"
          pending={pending}
        />
      }
    >
      <label className="field">
        <span>备注（只有自己看得到）</span>
        <textarea
          className="input"
          style={{ minHeight: 90 }}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          autoFocus
        />
      </label>
    </Modal>
  )
}
