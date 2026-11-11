import type { KeyboardEvent } from 'react'

/**
 * 让整行可点：鼠标点、键盘 Enter / Space 都能进，并带上 role 与 tabIndex。
 *
 * 表格行的可点写法在八个地方各写了一遍，其中片单列表那处只有 onClick，
 * 没有 tabIndex / role / 键盘处理 —— 键盘用户进不去。
 * 光标样式由 CSS 的 `.table tbody tr[role='link']` 负责，不用再写内联。
 *
 * 用法：`<tr key={id} {...rowLink(() => open(id))}>`
 */
export function rowLink(onActivate: () => void, enabled = true, role: 'link' | 'button' = 'link') {
  if (!enabled) return {}
  return {
    tabIndex: 0,
    role,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onActivate()
    },
  }
}
