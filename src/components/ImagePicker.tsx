import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/Modal'
import { uploadApi } from '@/api/endpoints'
import { uploadImage } from '@/lib/uploader'
import { toast } from '@/ui/toast'
import { IconPlus } from '@/components/icons'

/**
 * 图床选择器。
 *
 * 图片是「传一次、到处引用」的东西，所以做成一个可复用的选择器而不是
 * 独立页面：传上去进图库，需要的地方选一张，拿到的是直链。
 * 和资源上传（视频/字幕要绑到某部影片某一集）是两件事。
 */
export function ImagePicker({
  value,
  onChange,
  label = '图片',
  width = 120,
  height = 120,
}: {
  value?: string | null
  onChange: (url: string | null) => void
  label?: string
  width?: number | string
  height?: number | string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 用 div 不用 label：里面是按钮，套在 label 里点击会被 label 捕获两次 */}
      <div className="field">
        <span>{label}</span>
        {value ? (
          <div className="image-picker__slot" style={{ width, height }}>
            <img src={value} alt="" />
            <div className="image-picker__actions">
              <button type="button" className="btn btn--quiet" onClick={() => setOpen(true)}>
                更换
              </button>
              <button type="button" className="btn btn--quiet" onClick={() => onChange(null)}>
                移除
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="image-picker__empty"
            style={{ width, height }}
            onClick={() => setOpen(true)}
          >
            <IconPlus size={16} />
            <span>选择{label}</span>
          </button>
        )}
      </div>

      {open ? (
        <ImagePickerModal
          onClose={() => setOpen(false)}
          onPick={(url) => {
            onChange(url)
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

function ImagePickerModal({ onClose, onPick }: { onClose: () => void; onPick: (url: string) => void }) {
  const qc = useQueryClient()
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
  const [removing, setRemoving] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const images = useQuery({
    queryKey: ['upload', 'images', term] as const,
    queryFn: () => uploadApi.images({ name: term || undefined }),
  })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fileId = await uploadImage(file, (ratio) => setUploading(ratio))
      return fileId
    },
    onSuccess: () => {
      setUploading(0)
      toast('图片已上传', 'success')
      qc.invalidateQueries({ queryKey: ['upload', 'images'] })
    },
    onError: (error) => {
      setUploading(0)
      toast(error instanceof Error ? error.message : '上传失败', 'error')
    },
  })

  const remove = useMutation({
    mutationFn: (fileId: string) => uploadApi.removeImage(fileId),
    onSuccess: () => {
      setRemoving(null)
      toast('图片已删除', 'success')
      qc.invalidateQueries({ queryKey: ['upload', 'images'] })
    },
    onError: (error) => {
      setRemoving(null)
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    },
  })

  return (
    <Modal
      title="选择图片"
      width={720}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? `上传中 ${Math.round(uploading * 100)}%` : '上传图片'}
          </button>
          <button className="btn btn--primary" onClick={() => selected && onPick(selected)} disabled={!selected}>
            使用这张
          </button>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload.mutate(file)
          e.target.value = ''
        }}
      />

      <input
        className="input"
        type="search"
        placeholder="搜索文件名"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      {images.isLoading ? <p className="muted">读取图库…</p> : null}
      {images.data && images.data.items.length === 0 ? (
        <p className="muted">{term ? `没有找到「${term}」` : '图库还是空的'}</p>
      ) : null}

      <div className="image-picker__grid">
        {(images.data?.items ?? []).map((img) => (
          <div key={img.file_id} className={`image-picker__cell${selected === img.url ? ' is-picked' : ''}`}>
            <button type="button" className="image-picker__thumb" onClick={() => setSelected(img.url)}>
              <img src={img.url} alt={img.file_name} loading="lazy" />
            </button>
            <button
              type="button"
              className="image-picker__del"
              aria-label={`删除 ${img.file_name}`}
              disabled={removing === img.file_id}
              onClick={() => {
                setRemoving(img.file_id)
                remove.mutate(img.file_id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
