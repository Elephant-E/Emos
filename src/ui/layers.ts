/**
 * 浮层栈：普通弹窗、确认框、输入框都在同一个栈里。
 *
 * 之前只有 Modal 自己维护一份栈，确认框/输入框另有一套 `isConfirmOpen()`
 * 之类的判断 —— 漏掉哪个就出现「关掉输入框把下面的弹窗一起关掉」。
 * 谁在最上面谁响应 Esc 和点遮罩，判断只有一处。
 */
const layers: string[] = []

export function pushLayer(id: string) {
  layers.push(id)
}

export function popLayer(id: string) {
  const index = layers.lastIndexOf(id)
  if (index >= 0) layers.splice(index, 1)
}

export function isTopLayer(id: string): boolean {
  return layers[layers.length - 1] === id
}

export function newLayerId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}`
}
