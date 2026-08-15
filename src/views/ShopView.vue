<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">商城中心</h1>
    </div>

    <ProductFilterBar v-model:sort="currentSort" v-model:search="searchQuery" search-placeholder="搜索商品名称或描述..." />

    <ProductGrid
      :products="filteredProducts"
      :is-loading="isLoading"
      :is-loading-more="isLoadingMore"
      @open-detail="openDetail"
      @add-to-cart="addToCart"
      style="margin-bottom: 2rem;"
    />

    <CartFloatBtn :qty="totalCartQty" @click="openCart" />

    <CartModal
      :visible="showCartModal"
      :cart="cart"
      :total-cart-qty="totalCartQty"
      :total-price="totalPrice"
      @close="closeCart"
      @update-cart-qty="updateCartQty"
      @clear-cart="clearCart"
      @checkout="checkout"
    />

    <ProductDetailModal
      :visible="showDetailModal"
      :loading="detailLoading"
      :product="currentProduct"
      @close="closeDetail"
      @add-to-cart="addToCartFromDetail"
      @buy-now="buyNow(currentProductId)"
      @open-seller="handleOpenSeller"
    />

    <OrderRemarkModal
      :visible="showOrderModal"
      :remark="orderRemark"
      :submitting="isOrderSubmitting"
      @close="closeOrderModal"
      @confirm="confirmOrderWrapper"
      @update:remark="orderRemark = $event"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import shopApi from '@/api/shopApi.js'
import { showToast } from '@/utils/toast.js'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll.js'
import { useShopCart } from '@/composables/useShopCart.js'
import { useProductDetail } from '@/composables/useProductDetail.js'
import ProductGrid from '@/components/shop/ProductGrid.vue'
import ProductFilterBar from '@/components/shop/ProductFilterBar.vue'
import CartModal from '@/components/shop/CartModal.vue'
import ProductDetailModal from '@/components/shop/ProductDetailModal.vue'
import OrderRemarkModal from '@/components/shop/OrderRemarkModal.vue'
import CartFloatBtn from '@/components/shop/CartFloatBtn.vue'

const products = ref([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const searchQuery = ref('')
const currentSort = ref('default')

const {
  cart, totalCartQty, totalPrice,
  updateCartQty, clearCart,
  addToCart, openCart, closeCart, checkout,
  showCartModal, showOrderModal, orderRemark, isOrderSubmitting,
  buyNow, closeOrderModal, confirmOrder, openSellerDetail
} = useShopCart(products)

const {
  showDetailModal, currentProductId, currentProduct, detailLoading,
  openDetail, closeDetail
} = useProductDetail()

const addToCartFromDetail = () => {
  if (currentProductId.value) {
    addToCart(currentProductId.value, 1)
    closeDetail()
  }
}

const confirmOrderWrapper = async () => {
  const ok = await confirmOrder(currentProductId.value)
  if (ok) closeDetail()
}

const handleOpenSeller = (seller) => {
  closeDetail()
  openSellerDetail(seller)
}

const filteredProducts = computed(() => products.value)

const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const hasMore = ref(true)
let loadSeq = 0 // 竞态保护：只接受最新一次请求的响应

onMounted(() => loadProducts())

useInfiniteScroll({
  loadMore: () => loadMore(),
  shouldLoad: () => !isLoading.value && !isLoadingMore.value && hasMore.value,
  getContainer: () => document.getElementById('scrollable-page'),
})

let searchTimer = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; hasMore.value = true; loadProducts() }, 500)
})

watch(currentSort, () => { currentPage.value = 1; hasMore.value = true; loadProducts() })

const loadProducts = async (isLoadMore = false) => {
  const seq = ++loadSeq
  try {
    if (isLoadMore) { isLoadingMore.value = true }
    else { isLoading.value = true; currentPage.value = 1; products.value = [] }
    const params = { is_up: 1, page: currentPage.value, page_size: pageSize.value }
    if (searchQuery.value) params.name = searchQuery.value
    const sortMap = {
      'default': { sort_by: 'sort', sort_order: 'asc' },
      'price-asc': { sort_by: 'price', sort_order: 'asc' },
      'price-desc': { sort_by: 'price', sort_order: 'desc' },
      'sales-asc': { sort_by: 'sales', sort_order: 'asc' },
      'sales-desc': { sort_by: 'sales', sort_order: 'desc' }
    }
    const sortConfig = sortMap[currentSort.value] || sortMap['default']
    params.sort_by = sortConfig.sort_by
    params.sort_order = sortConfig.sort_order
    const res = await shopApi.getProductList(params)
    if (seq !== loadSeq) return // 有更新的请求，丢弃本次过期响应
    if (res?.items) {
      products.value = isLoadMore ? [...products.value, ...res.items] : res.items
      totalItems.value = res.total || 0
      hasMore.value = products.value.length < totalItems.value
    }
  } catch (error) {
    if (seq === loadSeq) showToast('加载商品失败', 'error')
  } finally {
    if (seq === loadSeq) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  currentPage.value++
  await loadProducts(true)
}
</script>
