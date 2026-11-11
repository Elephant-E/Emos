import { useEffect, useRef, type ReactNode } from 'react'
import { isTopLayer, newLayerId, popLayer, pushLayer } from './layers'

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
  useEffect(() => {
    const id = idRef.current
    pushLayer(id)
    return () => popLayer(id)
  }, [])

  return (
    <div
      className="modal-overlay modal-overlay--decision"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        if (!isTopLayer(idRef.current)) return
        onCancel()
      }}
    >
      <div className="confirm" role={role} aria-modal="true" aria-label={title}>
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
