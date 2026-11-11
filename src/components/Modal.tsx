import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { isTopLayer, newLayerId, popLayer, pushLayer } from '@/ui/layers'

/** 弹层内可聚焦元素；焦点陷阱与「首个可聚焦项」两处共用 */
export function focusablesOf(root: HTMLElement | null): HTMLElement[] {
  return Array.from(
    root?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  )
}

export function Modal({
  title,
  hint,
  children,
  footer,
  onClose,
  onSubmit,
  width = 460,
}: {
  title: string
  hint?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  /** 传了它，弹层内按回车等于提交 */
  onSubmit?: () => void
  width?: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(newLayerId('modal'))

  useEffect(() => {
    const id = idRef.current
    pushLayer(id)
    return () => popLayer(id)
  }, [])

  /**
   * 焦点只在挂载/卸载时处理。
   *
   * 这里不能用 [onClose, onSubmit] 做依赖：调用点几乎都传内联箭头函数，
   * 每次渲染都是新引用，effect 会在弹窗内每敲一个字就重跑一遍 ——
   * 清理函数把焦点还给「上一次 effect 开始时」的元素（通常是 autoFocus 的
   * 第一个输入框），于是第二个字段只能输进一个字符，后续按键全落到名称上。
   */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const box = boxRef.current
    // 如果弹窗内部没有自动聚焦的元素，把焦点交给第一个可聚焦项
    if (!box?.contains(document.activeElement)) {
      requestAnimationFrame(() => focusablesOf(box)[0]?.focus())
    }
    return () => previous?.focus?.()
  }, [])

  // 键盘处理单独一个 effect；回调放进 ref，依赖为空，避免上面那类重跑
  const handlers = useRef({ onClose, onSubmit })
  handlers.current = { onClose, onSubmit }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const { onClose: close, onSubmit: submit } = handlers.current
      // 输入类控件里的回车属于输入本身，不该触发整表单提交
      if (event.key === 'Enter' && submit && !target?.closest('textarea, .tag-field')) {
        event.preventDefault()
        submit()
        return
      }
      if (event.key === 'Escape') {
        // 叠着的时候只关最上面那层（确认框/输入框也在同一个栈里）
        if (!isTopLayer(idRef.current)) return
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const list = focusablesOf(boxRef.current)
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        if (!isTopLayer(idRef.current)) return
        onClose()
      }}
    >
      <div className="modal" ref={boxRef} style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit?.()
          }}
        >
          <div className="modal__body">
            {children}
            {hint ? <p className="modal__hint">{hint}</p> : null}
          </div>
          {footer ? <div className="modal__foot">{footer}</div> : null}
        </form>
      </div>
    </div>
  )
}
