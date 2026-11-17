import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { isTopLayer, newLayerId, popLayer, pushLayer } from './layers'
import { useFocusTrap } from './focus'

/** 决策框外壳：遮罩 + 卡片 + 头部 + 说明 + 底部两个按钮；confirmDialog 与 promptDialog 共用，区别只在中间内容。 */
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

  useFocusTrap(boxRef, idRef)
  useDecisionKeys(idRef, onCancel, () => {
    if (confirmDisabled) return
    onConfirm()
  })
  const titleId = useRef(newLayerId('confirm-title')).current

  // 挂到 body：决策框可能在任意弹层里触发，就地渲染会被弹层的层叠上下文压住
  return createPortal(
    <div
      className="modal-overlay modal-overlay--decision"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        if (!isTopLayer(idRef.current)) return
        onCancel()
      }}
    >
      <div className="confirm" ref={boxRef} role={role} aria-modal="true" aria-labelledby={titleId}>
        <div className="confirm__head">
          <span className={`confirm__dot${danger ? ' confirm__dot--danger' : ''}`} />
          <h2 className="confirm__title" id={titleId}>{title}</h2>
        </div>

        {message ? <p className="confirm__msg">{message}</p> : null}
        {hint ? <p className="confirm__hint">{hint}</p> : null}
        {children}

        <div className="confirm__foot">
          <button type="button"
            className="btn btn--ghost"
            data-confirm-action="cancel"
            autoFocus={cancelAutoFocus}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button type="button"
            className={dangerConfirm ? 'btn btn--danger' : 'btn btn--primary'}
            disabled={confirmDisabled}
            autoFocus={confirmAutoFocus}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** 决策框的键盘处理：Esc 只关最上层，回车等于确认（焦点在取消上时不算） */
function useDecisionKeys(
  idRef: { current: string },
  onEscape: () => void,
  onConfirm: () => void,
) {
  const handlers = useRef({ onEscape, onConfirm })
  handlers.current = { onEscape, onConfirm }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isTopLayer(idRef.current)) return
      if (event.key === 'Escape') {
        event.stopImmediatePropagation()
        handlers.current.onEscape()
        return
      }
      if (event.key !== 'Enter') return
      const focused = document.activeElement as HTMLElement | null
      if (focused?.dataset.confirmAction === 'cancel') return
      event.preventDefault()
      handlers.current.onConfirm()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [idRef])
}
