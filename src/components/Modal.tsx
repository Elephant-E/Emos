import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { isConfirmOpen } from '@/ui/confirm'

/**
 * 弹层可以叠：例如「编辑资源」上再开「移动资源」。
 * 只有最上层响应 Esc 和点击遮罩，下层的等它关掉再继续。
 */
const modalStack: string[] = []
function pushModal(id: string) {
  modalStack.push(id)
}
function popModal(id: string) {
  const i = modalStack.lastIndexOf(id)
  if (i >= 0) modalStack.splice(i, 1)
}
function isTopModal(id: string) {
  return modalStack[modalStack.length - 1] === id
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
  const idRef = useRef(`modal-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const id = idRef.current
    pushModal(id)
    return () => popModal(id)
  }, [])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const box = boxRef.current
    const focusables = () =>
      Array.from(
        box?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )

    // 如果弹窗内部没有自动聚焦的元素，把焦点交给第一个可聚焦项
    if (!box?.contains(document.activeElement)) {
      requestAnimationFrame(() => focusables()[0]?.focus())
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      // 输入类控件里的回车属于输入本身，不该触发整表单提交
      if (event.key === 'Enter' && onSubmit && !target?.closest('textarea, .tag-field')) {
        event.preventDefault()
        onSubmit()
        return
      }
      if (event.key === 'Escape') {
        // 叠着的时候只关最上面那层
        if (!isTopModal(idRef.current)) return
        event.stopPropagation()
        // 确认框叠在弹层之上，此时 Esc 只应关掉确认框
        if (isConfirmOpen()) return
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const list = focusables()
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
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [onClose, onSubmit])

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        if (!isTopModal(idRef.current)) return
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
