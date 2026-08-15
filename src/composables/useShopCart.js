import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart.js'
import shopApi from '@/api/shopApi.js'
import orderApi from '@/api/orderApi.js'
import { showToast } from '@/utils/toast.js'
import { checkoutCart } from '@/utils/cartHelper.js'

export function useShopCart(productsRef) {
  const router = useRouter()
  const cartStore = useCartStore()
  const { cart, totalCartQty, totalPrice } = storeToRefs(cartStore)
  const { storeAddToCart, updateCartQty, removeFromCart, clearCart, getStockClass, getStockText, getCartQty } = cartStore

  const showCartModal = ref(false)
  const showOrderModal = ref(false)
  const orderRemark = ref('')
  const isOrderSubmitting = ref(false)

  const addToCart = (productId, qty = 1) => {
    const product = productsRef.value.find(p => p.product_id === productId)
    if (product) storeAddToCart(product, qty)
  }

  const openCart = () => { showCartModal.value = true }
  const closeCart = () => { showCartModal.value = false }

  const checkout = async () => {
    const result = await checkoutCart(cart.value, clearCart, closeCart)
    if (result.partialSuccess && result.failedItems) {
      cart.value = result.failedItems
    }
  }

  const buyNow = (productId) => {
    orderRemark.value = ''
    showOrderModal.value = true
  }

  const closeOrderModal = () => {
    showOrderModal.value = false
    orderRemark.value = ''
  }

  const confirmOrder = async (productId) => {
    if (isOrderSubmitting.value) return
    isOrderSubmitting.value = true
    try {
      const res = await orderApi.createOrder({
        product_id: productId,
        buy_number: 1,
        remark: orderRemark.value || null
      })
      if (res) {
        showToast('下单成功！', 'success')
        closeOrderModal()
        return true
      }
    } catch (error) {
      showToast('下单失败，请重试', 'error')
    } finally {
      isOrderSubmitting.value = false
    }
    return false
  }

  const openSellerDetail = (seller) => {
    router.push(`/shop/${seller.seller_id}`)
  }

  return {
    cart, totalCartQty, totalPrice,
    updateCartQty, removeFromCart, clearCart, getStockClass, getStockText, getCartQty,
    addToCart, openCart, closeCart, checkout,
    showCartModal, showOrderModal, orderRemark, isOrderSubmitting,
    buyNow, closeOrderModal, confirmOrder, openSellerDetail
  }
}