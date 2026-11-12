import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { isTopLayer, newLayerId, popLayer, pushLayer } from './layers'
import { focusablesOf } from '@/components/Modal'

/**
 * 决策框的焦点管理，做法与 components/Modal.tsx 一致：打开时聚焦框内第一个可交互元素，
 * Tab 在框内循环，关闭时把焦点还给打开前的元素（否则焦点掉回 body）；框内已有 autoFocus 时不抢焦点。
 */
function useFocusTrap(boxRef: RefObject<HTMLElement>, idRef: { current: string }) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const box = boxRef.current
    const focusables = () => focusablesOf(box)

    // 下一帧再确认一次：兄弟组件的 effect 可能刚把焦点放进框里（比如 prompt 的输入框）
    if (!box?.contains(document.activeElement)) {
      requestAnimationFrame(() => {
        if (box?.contains(document.activeElement)) return
        focusables()[0]?.focus()
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      // 弹窗叠弹窗时只让最上层处理，否则两个陷阱同时抢 Tab
      if (!isTopLayer(idRef.current)) return
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
  }, [boxRef, idRef])
}

/**
 * 决策框外壳：遮罩 + 卡片 + 头部 + 说明 + 底部两个按钮。
 * confirmDialog 与 promptDialog 共用，区别只在中间内容。
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

  useFocusTrap(boxRef, idRef)
  useDecisionKeys(idRef, onCancel, () => {
    if (confirmDisabled) return
    onConfirm()
  })
  const titleId = useRef(newLayerId('confirm-title')).current

  return (
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
    </div>
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
