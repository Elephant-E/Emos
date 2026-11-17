import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { isTopLayer, newLayerId, popLayer, pushLayer } from '@/ui/layers'
import { useFocusTrap } from '@/ui/focus'

export function Modal({
  title,
  hint,
  children,
  footer,
  note,
  onClose,
  onSubmit,
  width = 460,
}: {
  title: string
  hint?: string
  children: ReactNode
  footer?: ReactNode
  /** 底栏之上的固定说明（如表单还差哪些字段）：不随内容滚动，短视口也能看到 */
  note?: ReactNode
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

  // 焦点进入 / Tab 循环 / 关闭后归还，与确认框共用一套实现
  useFocusTrap(boxRef, idRef)

  // 键盘处理单独一个 effect；回调放进 ref、依赖为空，避免随渲染重挂监听
  const handlers = useRef({ onClose, onSubmit })
  handlers.current = { onClose, onSubmit }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const { onClose: close, onSubmit: submit } = handlers.current
      // 输入类控件里的回车属于输入本身，不触发整表单提交；
      // 焦点在按钮/链接上时回车是那个控件自己的激活动作，也不能被表单提交顶掉
      if (event.key === 'Enter' && submit && !target?.closest('textarea, .tag-field')) {
        if (!isTopLayer(idRef.current)) return
        if (target?.closest('button, a, [role="button"], [role="link"]')) return
        // 回车必须和底栏主按钮同一条路径：按钮被禁用（pending / 校验不过）时回车也不能提交，
        // 否则每个调用点都得自己再判一次，漏一个就是重复提交
        const dialog = target?.closest('.modal')
        const primary = dialog?.querySelector<HTMLButtonElement>('.modal__foot .btn--primary, .modal__foot .btn--danger')
        if (primary?.disabled) return
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
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return createPortal(
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
          <button type="button" className="btn btn--icon" onClick={onClose} aria-label="关闭">
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
          {note ? <div className="modal__note">{note}</div> : null}
          {footer ? <div className="modal__foot">{footer}</div> : null}
        </form>
      </div>
    </div>,
    document.body,
  )
}
