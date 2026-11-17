/** 浮层栈：普通弹窗、确认框、输入框都在同一个栈里，只有最上层响应 Esc 与点遮罩。 */
const layers: string[] = []

export function pushLayer(id: string) {
  layers.push(id)
}

export function popLayer(id: string) {
  const index = layers.lastIndexOf(id)
  if (index >= 0) layers.splice(index, 1)
}

/** 当前是否有浮层开着：菜单类组件靠它判断「这次点击是不是给上面那层的」 */
export function hasLayer(): boolean {
  return layers.length > 0
}

export function isTopLayer(id: string): boolean {
  return layers[layers.length - 1] === id
}

export function newLayerId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}`
}
