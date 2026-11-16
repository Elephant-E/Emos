import { useEffect, type RefObject } from 'react'
import { isTopLayer } from './layers'

/** 弹层内可聚焦元素：焦点陷阱与「首个可聚焦项」两处共用 */
export function focusablesOf(root: HTMLElement | null): HTMLElement[] {
  return Array.from(
    root?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  )
}

/**
 * 弹层的焦点管理：打开时聚焦框内第一个可交互元素，Tab 在框内循环，
 * 关闭时把焦点还给打开前的元素（否则焦点会掉回 body）。
 *
 * 框内已有 autoFocus 时不抢焦点（下一帧再确认一次，兄弟组件的 effect 可能刚把焦点放进来）。
 * 叠着多层时只有最上层响应 Tab，否则两个陷阱会互相抢。
 *
 * 依赖留空：调用点的 onClose/onSubmit 普遍是内联函数，挂上去会让 effect 每次渲染重跑，
 * 清理函数把焦点还回去。
 */
export function useFocusTrap(boxRef: RefObject<HTMLElement>, idRef: { current: string }) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const box = boxRef.current
    const focusables = () => focusablesOf(box)

    if (!box?.contains(document.activeElement)) {
      requestAnimationFrame(() => {
        if (box?.contains(document.activeElement)) return
        focusables()[0]?.focus()
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
