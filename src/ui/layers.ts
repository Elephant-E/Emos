/**
 * 浮层栈：普通弹窗、确认框、输入框都在同一个栈里。
 * 只有最上面那层响应 Esc 与点遮罩，判断只有一处。
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
