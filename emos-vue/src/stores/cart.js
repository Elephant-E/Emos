import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { showToast } from '@/utils/toast.js'

export const useCartStore = defineStore('cart', () => {
  // 状态
  const cart = ref([])

  // 计算属性
  const totalCartQty = computed(() => {
    return cart.value.reduce((sum, item) => sum + item.qty, 0)
  })

  const totalPrice = computed(() => {
    return cart.value.reduce((sum, item) => sum + (item.price * item.qty), 0)
  })

  // 方法
  function getCartQty(productId) {
    const item = cart.value.find(c => c.id === productId)
    return item ? item.qty : 0
  }

  function getStockClass(stock) {
    if (stock === 0) return 'out'
    if (stock < 5) return 'low'
    return ''
  }

  function getStockText(stock) {
    if (stock === 0) return '缺货'
    if (stock < 5) return `仅剩${stock}件`
    return '有货'
  }

  function addToCart(product, qty = 1) {
    if (!product || product.stock === 0) {
      showToast('商品已售罄', 'error')
      return
    }
    
    const existing = cart.value.find(c => c.id === product.product_id)
    if (existing) {
      if (existing.qty >= product.stock) {
        showToast('已达库存上限', 'warning')
        return
      }
      existing.qty += qty
    } else {
      cart.value.push({
        id: product.product_id,
        name: product.name,
        price: product.price,
        img: product.cover_url || null,
        qty: qty,
        remark: '' // 添加备注字段
      })
    }
    
    showToast(`已添加 ${qty} 件到购物车`, 'success')
  }

  function updateCartQty(id, delta) {
    const item = cart.value.find(c => c.id === id)
    if (!item) return
    
    const newQty = item.qty + delta
    if (newQty <= 0) {
      removeFromCart(id)
      return
    }
    
    // 这里需要传入product来检查库存，暂时不检查
    item.qty = newQty
  }

  function removeFromCart(id) {
    const index = cart.value.findIndex(c => c.id === id)
    if (index > -1) {
      cart.value.splice(index, 1)
      showToast('已从购物车移除', 'info')
    }
  }

  function clearCart() {
    if (cart.value.length === 0) return
    cart.value = []
    showToast('购物车已清空', 'info')
  }

  function updateCartRemark(id, remark) {
    const item = cart.value.find(c => c.id === id)
    if (item) {
      item.remark = remark
    }
  }

  return {
    cart,
    totalCartQty,
    totalPrice,
    getCartQty,
    getStockClass,
    getStockText,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    updateCartRemark
  }
})
