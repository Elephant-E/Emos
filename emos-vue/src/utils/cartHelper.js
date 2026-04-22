import { showToast } from '@/utils/toast.js'
import api from '@/api/index.js'

/**
 * 购物车结算逻辑
 * 遍历购物车中的所有商品，分别调用下单API
 * @param {Array} cart - 购物车数组
 * @param {Function} clearCart - 清空购物车函数
 * @param {Function} closeCart - 关闭购物车模态框函数
 * @returns {Promise<Object>} 结算结果
 */
export async function checkoutCart(cart, clearCart, closeCart) {
  if (cart.length === 0) {
    showToast('购物车为空', 'warning')
    return { success: false, message: '购物车为空' }
  }

  try {
    showToast('正在提交订单...', 'info')
    
    // 遍历购物车中的所有商品，分别调用下单 API
    const results = []
    for (const item of cart) {
      try {
        const res = await api.post('/api/shop/order/user/create', {
          product_id: item.id,
          buy_number: item.qty,
          remark: item.remark || null
        })
        results.push({ success: true, item })
      } catch (error) {
        console.error(`商品 ${item.name} 下单失败:`, error)
        results.push({ success: false, item, error })
      }
    }
    
    // 统计结果
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    if (failCount === 0) {
      showToast(`成功下单 ${successCount} 个商品！`, 'success')
      clearCart()
      closeCart()
      return { success: true, message: `成功下单 ${successCount} 个商品` }
    } else if (successCount > 0) {
      showToast(`部分下单成功：${successCount} 成功，${failCount} 失败`, 'warning')
      // 返回失败的商品列表，由调用者处理
      const failedItems = results.filter(r => !r.success).map(r => r.item)
      return { 
        success: false, 
        partialSuccess: true,
        message: `部分下单成功：${successCount} 成功，${failCount} 失败`,
        failedItems 
      }
    } else {
      showToast('下单失败，请重试', 'error')
      return { success: false, message: '下单失败' }
    }
  } catch (error) {
    console.error('结算失败:', error)
    showToast('结算失败，请重试', 'error')
    return { success: false, message: '结算失败' }
  }
}

/**
 * 格式化购物车商品价格
 * @param {number} price - 单价
 * @param {number} qty - 数量
 * @returns {string} 格式化后的价格字符串
 */
export function formatCartPrice(price, qty) {
  return price * qty
}

/**
 * 验证购物车商品备注长度
 * @param {string} remark - 备注内容
 * @returns {boolean} 是否有效
 */
export function validateRemark(remark) {
  if (!remark) return true
  return remark.length <= 100
}
