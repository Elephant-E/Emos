import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'

interface SubtitleTarget {
  id: string
  title: string
  isSelf: boolean
  owner?: string | null
}

/** 编辑字幕：改标题、删字幕；标题用弹窗内 state，保存时回传。 */
export function SubtitleEditModal({
  subtitle,
  onClose,
  onSave,
  onDelete,
  pending = false,
}: {
  subtitle: SubtitleTarget
  onClose: () => void
  onSave: (next: SubtitleTarget) => void
  onDelete: () => void
  pending?: boolean
}) {
  const [title, setTitle] = useState(subtitle.title)
  return (
    <Modal
      title="编辑字幕"
      onClose={onClose}
      onSubmit={() => onSave({ ...subtitle, title })}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => onSave({ ...subtitle, title })}
          confirmText="保存"
          pending={pending}
          disabled={!title.trim()}
        />
      }
    >
      <label className="field">
        <span>字幕标题</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <button type="button" className="btn btn--ghost" onClick={onDelete}>
        删除字幕
      </button>
    </Modal>
  )
}
