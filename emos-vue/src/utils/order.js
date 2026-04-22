/**
 * 订单工具函数 - 公共订单状态判断和筛选逻辑
 */

/**
 * 订单筛选项配置（通用）
 */
export const ORDER_FILTER_CHIPS = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'unpaid' },
  { label: '待发货', value: 'paid' },
  { label: '已发货', value: 'delivered' },
  { label: '已取消', value: 'cancel' },
  { label: '已关闭', value: 'close' }
]

/**
 * 订单状态映射文本
 */
const STATUS_TEXT_MAP = {
  unpaid: '待支付',
  paid: '待发货',
  delivered: '已发货',
  cancel: '已取消',
  close: '已关闭'
}

/**
 * 订单状态映射描述
 */
const STATUS_DESC_MAP = {
  unpaid: '请尽快完成支付',
  paid: '商家正在准备商品',
  delivered: '商品已发出，请注意查收',
  cancel: '订单已取消',
  close: '订单已关闭'
}

/**
 * 获取订单状态（根据 status_pay 和 time_delivery 综合判断）
 * @param {Object} order - 订单对象
 * @returns {string} 订单状态：unpaid | paid | delivered | cancel | close
 */
export function getOrderStatus(order) {
  if (!order) return 'close'
  
  // 已支付且有发货时间 -> 已发货
  if (order.status_pay === 'paid' && order.time_delivery) {
    return 'delivered'
  }
  
  // 其他情况直接使用 status_pay 的值
  // unpaid -> 待支付, paid -> 待发货, cancel -> 已取消, close -> 已关闭
  return order.status_pay || 'close'
}

/**
 * 获取订单状态样式类名
 * @param {Object} order - 订单对象
 * @returns {string} CSS 类名
 */
export function getOrderStatusClass(order) {
  const status = getOrderStatus(order)
  return status
}

/**
 * 获取订单状态文本
 * @param {Object} order - 订单对象
 * @returns {string} 状态文本
 */
export function getOrderStatusText(order) {
  const status = getOrderStatus(order)
  return STATUS_TEXT_MAP[status] || status
}

/**
 * 获取订单状态描述
 * @param {Object} order - 订单对象
 * @returns {string} 状态描述
 */
export function getOrderStatusDesc(order) {
  const status = getOrderStatus(order)
  return STATUS_DESC_MAP[status] || ''
}

/**
 * 过滤订单列表
 * @param {Array} orders - 订单数组
 * @param {string} currentFilter - 当前筛选条件
 * @param {string} searchQuery - 搜索关键词
 * @returns {Array} 过滤后的订单数组
 */
export function filterOrders(orders, currentFilter, searchQuery) {
  return orders.filter(order => {
    // 过滤掉无效订单
    if (!order) return false
    
    // 根据 status_pay 和 time_delivery 综合判断订单状态
    const orderStatus = getOrderStatus(order)
    const statusMatch = currentFilter === 'all' || orderStatus === currentFilter
    const searchMatch = !searchQuery || 
      order.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_title.toLowerCase().includes(searchQuery.toLowerCase())
    
    return statusMatch && searchMatch
  })
}

/**
 * 获取订单状态颜色（用于模态框）
 * @param {string} status - 订单状态
 * @returns {string} CSS 颜色值
 */
export function getOrderStatusColor(status) {
  const colorMap = {
    unpaid: 'var(--warning)',
    paid: 'var(--accent)',
    delivered: 'var(--success)',
    cancel: 'var(--text-tertiary)',
    close: 'var(--text-tertiary)'
  }
  return colorMap[status] || 'var(--text-secondary)'
}

/**
 * 获取订单状态背景色（用于模态框）
 * @param {string} status - 订单状态
 * @returns {string} CSS 背景色值
 */
export function getOrderStatusBgColor(status) {
  const bgMap = {
    unpaid: 'color-mix(in srgb, var(--warning) 8%, transparent)',
    paid: 'color-mix(in srgb, var(--accent) 8%, transparent)',
    delivered: 'color-mix(in srgb, var(--success) 8%, transparent)',
    cancel: 'var(--bg-input)',
    close: 'var(--bg-input)'
  }
  return bgMap[status] || 'var(--bg-input)'
}

/**
 * 获取订单状态边框颜色（用于模态框）
 * @param {string} status - 订单状态
 * @returns {string} CSS 边框颜色值
 */
export function getOrderStatusBorderColor(status) {
  const borderMap = {
    unpaid: 'color-mix(in srgb, var(--warning) 25%, transparent)',
    paid: 'color-mix(in srgb, var(--accent) 25%, transparent)',
    delivered: 'color-mix(in srgb, var(--success) 25%, transparent)',
    cancel: 'var(--border)',
    close: 'var(--border)'
  }
  return borderMap[status] || 'var(--border)'
}

/**
 * 获取订单状态图标（用于模态框）
 * @param {string} status - 订单状态
 * @returns {string} Font Awesome 图标类名
 */
export function getOrderStatusIcon(status) {
  const iconMap = {
    unpaid: 'fas fa-clock',
    paid: 'fas fa-box',
    delivered: 'fas fa-truck',
    cancel: 'fas fa-ban',
    close: 'fas fa-times-circle'
  }
  return iconMap[status] || 'fas fa-question-circle'
}
