import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { TagInput } from '@/components/TagInput'
import { ImagePicker } from '@/components/ImagePicker'

export interface WatchlistFormValues {
  name: string
  description: string
  is_public: boolean
  point: number
  tags: string[]
  image_poster_url: string | null
  /** 片单里没有内容时，是否仍然展示（后端必填，可存 false） */
  is_show_empty: boolean
}

const EMPTY: WatchlistFormValues = {
  name: '',
  description: '',
  is_public: true,
  point: 0,
  tags: [],
  image_poster_url: null,
  is_show_empty: true,
}

/**
 * 新建与编辑共用同一个表单。
 * 后端的 POST /api/watch 本来就是「有 id 即更新，无 id 即新建」，
 * 前端不该拆成两套。
 */
export function WatchlistForm({
  initial,
  submitLabel,
  pending,
  onClose,
  onSubmit,
}: {
  /** 传入即为编辑模式 */
  initial?: WatchlistFormValues | null
  submitLabel: string
  pending?: boolean
  onClose: () => void
  onSubmit: (values: WatchlistFormValues) => void
}) {
  const [form, setForm] = useState<WatchlistFormValues>(initial ?? EMPTY)
  const valid = form.name.trim().length >= 2

  return (
    <Modal
      title={initial ? '编辑片单' : '新建片单'}
      onClose={onClose}
      onSubmit={() => {
        // 焦点在标签输入框里时，回车属于「确认标签」，不该提交整个表单
        if (document.activeElement?.closest('.tag-input')) return
        if (valid && !pending) onSubmit({ ...form, name: form.name.trim() })
      }}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn--primary"
            type="submit"
            disabled={!valid || pending}
            onClick={() => valid && !pending && onSubmit({ ...form, name: form.name.trim() })}
          >
            {submitLabel}
          </button>
        </>
      }
    >
      <label className="field">
        <span>名称</span>
        <input
          className="input"
          value={form.name}
          maxLength={100}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
      </label>
      <label className="field">
        <span>简介</span>
        <textarea
          className="input"
          maxLength={10000}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
      <ImagePicker
        label="封面"
        value={form.image_poster_url}
        onChange={(url) => setForm({ ...form, image_poster_url: url })}
      />
      <label className="field">
        <span>标签</span>
        <TagInput value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
      </label>
      <label className="field">
        <span>订阅所需胡萝卜（0 为免费，最高 50000）</span>
        <input
          className="input tnum"
          type="number"
          min={0}
          max={50000}
          value={form.point}
          onChange={(e) => setForm({ ...form, point: Math.min(50000, Math.max(0, Number(e.target.value) || 0)) })}
        />
      </label>
      <div style={{ display: 'flex', gap: 24 }}>
        <label className="switch">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
          />
          公开片单
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={form.is_show_empty}
            onChange={(e) => setForm({ ...form, is_show_empty: e.target.checked })}
          />
          内容为空时仍展示
        </label>
      </div>
    </Modal>
  )
}
