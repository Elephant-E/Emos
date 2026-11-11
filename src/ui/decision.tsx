import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { isTopLayer, newLayerId, popLayer, pushLayer } from './layers'

/**
 * 决策框的焦点管理，做法与 components/Modal.tsx 一致：
 * 打开时把焦点交给框内第一个可交互元素，Tab 在框内循环，
 * 关闭时把焦点还给打开之前那个元素（不然焦点会掉回 body）。
 *
 * 框内自己做 autoFocus 时（取消/确定按钮、prompt 的输入框），
 * 这里只补 Tab 循环，不抢它的焦点。
 */
function useFocusTrap(boxRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const box = boxRef.current
    const focusables = () =>
      Array.from(
        box?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )

    // 下一帧再确认一次：兄弟组件的 effect 可能刚把焦点放进框里（比如 prompt 的输入框）
    if (!box?.contains(document.activeElement)) {
      requestAnimationFrame(() => {
        if (box?.contains(document.activeElement)) return
        focusables()[0]?.focus()
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [boxRef])
}

/**
 * 决策框外壳：遮罩 + 圆角卡片 + 头部 + 说明 + 底部两个按钮。
 *
 * 确认框（confirmDialog）和输入框（promptDialog）两个宿主长得一样，
 * 只有中间那块不同 —— 一个没有内容，一个是输入框。
 */
export function DecisionShell({
  title,
  danger,
  role = 'alertdialog',
  message,
  hint,
  children,
  cancelText = '取消',
  confirmText = '确定',
  confirmDisabled,
  dangerConfirm,
  cancelAutoFocus,
  confirmAutoFocus,
  onCancel,
  onConfirm,
}: {
  title: string
  danger?: boolean
  role?: 'alertdialog' | 'dialog'
  message?: string
  hint?: string
  children?: ReactNode
  cancelText?: string
  confirmText?: string
  confirmDisabled?: boolean
  dangerConfirm?: boolean
  cancelAutoFocus?: boolean
  confirmAutoFocus?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const idRef = useRef(newLayerId('decision'))
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = idRef.current
    pushLayer(id)
    return () => popLayer(id)
  }, [])

  useFocusTrap(boxRef)

  return (
    <div
      className="modal-overlay modal-overlay--decision"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        if (!isTopLayer(idRef.current)) return
        onCancel()
      }}
    >
      <div className="confirm" ref={boxRef} role={role} aria-modal="true" aria-label={title}>
        <div className="confirm__head">
          <span className={`confirm__dot${danger ? ' confirm__dot--danger' : ''}`} />
          <h2 className="confirm__title">{title}</h2>
        </div>

        {message ? <p className="confirm__msg">{message}</p> : null}
        {hint ? <p className="confirm__hint">{hint}</p> : null}
        {children}

        <div className="confirm__foot">
          <button
            className="btn btn--ghost"
            data-confirm-action="cancel"
            autoFocus={cancelAutoFocus}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={dangerConfirm ? 'btn btn--danger' : 'btn btn--primary'}
            disabled={confirmDisabled}
            autoFocus={confirmAutoFocus}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 决策框的键盘处理。它叠在弹层之上，Esc 必须只关它自己
 * （stopImmediatePropagation 挡住底层的 Modal 监听）。
 */
export function useDecisionKeys(active: boolean, onEscape: () => void, onEnter?: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation()
        onEscape()
        return
      }
      if (event.key !== 'Enter' || !onEnter) return
      const focused = document.activeElement as HTMLElement | null
      if (focused?.dataset.confirmAction === 'cancel') return
      event.preventDefault()
      onEnter()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
}
