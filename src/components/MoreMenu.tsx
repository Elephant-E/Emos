import { useEffect, useRef, useState } from 'react'
import { IconMore } from './icons'
import { isTopLayer, newLayerId, popLayer, pushLayer } from '@/ui/layers'

export interface MoreMenuItem {
  label: string
  onSelect: () => void
  /** 不可撤销的动作（删除、清空）用这个，面板里标红 */
  danger?: boolean
  disabled?: boolean
}

/**
 * 页头「更多操作」：把次要动作与危险动作收进一个面板，
 * 让页头只留主操作。Esc 或点面板外关闭；打开时登记为一个浮层，
 * 与弹窗共用 isTopLayer 判断（弹窗在上面时不抢 Esc）。
 */
export function MoreMenu({ items, label = '更多操作' }: { items: MoreMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const idRef = useRef(newLayerId('more'))
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const id = idRef.current
    pushLayer(id)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (!isTopLayer(id)) return
      event.stopPropagation()
      setOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      popLayer(id)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div className="more" ref={boxRef}>
      <button
        type="button"
        className="btn btn--quiet more__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMore />
      </button>
      {open ? (
        <div className="more__panel" role="menu" aria-label={label}>
          {items.map((item) => (
            <button
              type="button"
              key={item.label}
              role="menuitem"
              className={`more__item${item.danger ? ' more__item--danger' : ''}`}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
