import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/Modal'
import { uploadApi } from '@/api/endpoints'
import { uploadImage } from '@/lib/uploader'
import { toast } from '@/ui/toast'
import { confirmDialog } from '@/ui/confirm'
import { IconPlus } from '@/components/icons'

/**
 * 图床选择器：上传进图库，需要的地方选一张，返回直链。
 * 与资源上传（视频/字幕要绑到某部影片某一集）是两件事。
 */
export function ImagePicker({
  value,
  onChange,
  label = '图片',
  width = 120,
  height = 120,
  readonly = false,
}: {
  value?: string | null
  /** 第二个参数是图库 file_id：直播封面这类接口收文件 id 而不是直链 */
  onChange: (url: string | null, fileId?: string | null) => void
  label?: string
  width?: number | string
  height?: number | string
  /** 只展示不给改（官方频道封面这类）：外观与可编辑态一致，只是没有按钮 */
  readonly?: boolean
}) {
  const [open, setOpen] = useState(false)

  if (readonly) {
    return (
      <div className="field">
        <span>{label}</span>
        <div className="image-picker__slot" style={{ width, height }}>
          {value ? <img src={value} alt="" /> : null}
        </div>
      </div>
    )
  }

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
          onPick={(url, fileId) => {
            onChange(url, fileId)
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

/**
 * 多张图（基金凭证这类）：仍然用同一个图库弹窗与同一套 slot 样式，
 * 各页面不要再自己拼一套「图片列表 + 上传按钮」。
 */
export function ImagePickerMulti({
  value,
  onChange,
  label = '图片',
  width = 120,
  height = 90,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  label?: string
  width?: number | string
  height?: number | string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="field">
        <span>{label}</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          {value.map((url) => (
            <div key={url} className="image-picker__slot" style={{ width, height }}>
              <img src={url} alt="" />
              <div className="image-picker__actions">
                <button type="button" className="btn btn--quiet" onClick={() => onChange(value.filter((item) => item !== url))}>
                  移除
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="image-picker__empty" style={{ width, height }} onClick={() => setOpen(true)}>
            <IconPlus size={16} />
            <span>添加</span>
          </button>
        </div>
      </div>

      {open ? (
        <ImagePickerModal
          onClose={() => setOpen(false)}
          onPick={(url) => {
            onChange(value.includes(url) ? value : [...value, url])
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

function ImagePickerModal({ onClose, onPick }: { onClose: () => void; onPick: (url: string, fileId: string) => void }) {
  const qc = useQueryClient()
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<{ url: string; fileId: string } | null>(null)
  const [uploading, setUploading] = useState(0)
  const [removing, setRemoving] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 图库接口每页固定 15 条（传别的值会被压回 15），必须翻页才能拿到旧图
  const images = useInfiniteQuery({
    queryKey: ['upload', 'images', term] as const,
    queryFn: ({ pageParam }) => uploadApi.images({ name: term || undefined, page: pageParam, page_size: 15 }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const loaded = last.page * last.page_size
      return loaded < last.total ? last.page + 1 : undefined
    },
  })
  const imageRows = images.data?.pages.flatMap((page) => page.items) ?? []

  // 滚到底自动取下一页。观察器随「还能不能取」与条数重建：
  // 只建一次的话，首次渲染时哨兵已在视口内会立刻触发一次，之后不再变化就不再回调
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadedCount = images.data?.pages.reduce((sum, page) => sum + page.items.length, 0) ?? 0
  const canFetchMore = Boolean(images.hasNextPage) && !images.isFetchingNextPage
  const fetchNext = images.fetchNextPage
  useEffect(() => {
    if (!canFetchMore) return
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNext()
      },
      { rootMargin: '120px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [canFetchMore, loadedCount, fetchNext])

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
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? `上传中 ${Math.round(uploading * 100)}%` : '上传图片'}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => selected && onPick(selected.url, selected.fileId)} disabled={!selected}>
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
            aria-label="搜索文件名"
        placeholder="搜索文件名"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      {images.isLoading ? <p className="muted">读取图库…</p> : null}
      {images.data && imageRows.length === 0 ? (
        <p className="muted">{term ? `没有找到「${term}」` : '图库还是空的'}</p>
      ) : null}

      <div className="image-picker__grid">
        {imageRows.map((img) => (
          <div key={img.file_id} className={`image-picker__cell${selected?.url === img.url ? ' is-picked' : ''}`}>
            <button type="button" className="image-picker__thumb" onClick={() => setSelected({ url: img.url, fileId: img.file_id })}>
              <img src={img.url} alt={img.file_name} loading="lazy" />
            </button>
            <button
              type="button"
              className="image-picker__del"
              aria-label={`删除 ${img.file_name}`}
              disabled={removing === img.file_id}
              onClick={() => {
                // 图片可能已被商品或片单引用，删掉后那些位置会变成裂图，且不可撤销
                void (async () => {
                  const ok = await confirmDialog({
                    title: '删除这张图？',
                    message: img.file_name,
                    hint: '删除后，引用它的位置会显示为空白。',
                    confirmText: '删除',
                    danger: true,
                  })
                  if (!ok) return
                  setRemoving(img.file_id)
                  remove.mutate(img.file_id)
                })()
              }}
            >
              ×
            </button>
          </div>
        ))}
        <div ref={sentinelRef} className="image-picker__sentinel" />
      </div>

      {images.isFetchingNextPage ? <p className="muted">读取更多…</p> : null}
      {!images.hasNextPage && imageRows.length > 0 ? (
        <p className="muted tnum-sm">共 {images.data?.pages[0]?.total ?? imageRows.length} 张</p>
      ) : null}
    </Modal>
  )
}
