import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'

export interface MediaTarget {
  mediaId: string
  name: string
  isSelf: boolean
  owner?: string | null
}

/**
 * 编辑资源：改名字，另有三个动作（同步元数据 / 移到其他位置 / 删除）。
 * 名称用弹窗内 state，保存时才回传；「移到其他位置」不关这个弹窗，关掉移动弹窗后要能回来。
 */
export function MediaEditModal({
  media,
  onClose,
  onRename,
  onSyncMetadata,
  onMove,
  onDelete,
  pending = false,
}: {
  media: MediaTarget
  onClose: () => void
  onRename: (next: MediaTarget) => void
  onSyncMetadata: () => void
  onMove: (current: MediaTarget) => void
  onDelete: () => void
  pending?: boolean
}) {
  const [name, setName] = useState(media.name)
  return (
    <Modal
      title="编辑资源"
      onClose={onClose}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => onRename({ ...media, name })}
          confirmText="保存"
          pending={pending}
          disabled={!name.trim()}
        />
      }
    >
      <label className="field">
        <span>资源名</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="pick-tabs">
        <button type="button" className="btn btn--ghost" onClick={onSyncMetadata}>
          同步元数据
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => onMove({ ...media, name })}>
          移到其他位置
        </button>
        <button type="button" className="btn btn--danger" style={{ marginLeft: 'auto' }} onClick={onDelete}>
          删除
        </button>
      </div>
    </Modal>
  )
}
