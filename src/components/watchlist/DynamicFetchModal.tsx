import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ModalFooter } from '@/components/ModalFooter'

/** 动态抓取：填 URL 即按该地址定期同步内容，留空关闭；地址用弹窗内 state，保存时才回传（失败时输入不丢）。 */
export function DynamicFetchModal({
  current,
  onClose,
  onSave,
  pending = false,
}: {
  current?: string | null
  onClose: () => void
  onSave: (url: string | null) => void
  pending?: boolean
}) {
  const [url, setUrl] = useState(current ?? '')
  return (
    <Modal
      title="动态抓取"
      onClose={onClose}
      onSubmit={() => onSave(url.trim() ? url.trim() : null)}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => onSave(url.trim() ? url.trim() : null)}
          confirmText="保存"
          pending={pending}
        />
      }
    >
      <label className="field">
        <span>抓取地址（留空关闭）</span>
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" autoFocus />
      </label>
      <p className="state__hint">
        填了地址后，片单会按该地址定期同步内容；清空即关闭。
      </p>
    </Modal>
  )
}
