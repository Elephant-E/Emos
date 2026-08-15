<template>
  <div>
    <div class="cloud-buttons" style="margin-bottom: 1rem;">
      <button class="cloud-btn" @click="goBack"><i class="fas fa-chevron-left"></i></button>
    </div>

    <template v-if="isLoading && !sellerInfo">
      <SellerInfoCard name="" description="" cover-url="" />
      <SellerStats :stats="skeletonStats" />
      <ProductGrid :products="[]" :is-loading="true" />
    </template>

    <template v-else-if="sellerInfo">
      <SellerInfoCard :name="sellerInfo.name" :description="sellerInfo.description || ''" :cover-url="sellerInfo.cover_url || ''">
        <template #action>
          <button class="share-btn" @click="copyShopUrl" title="复制店铺链接"><i class="fas fa-share-alt"></i></button>
        </template>
      </SellerInfoCard>

      <SellerStats :stats="sellerStats" />

      <div class="filter-bar" style="margin-bottom: 1.5rem; flex-wrap: wrap;">
        <SegmentedControl
          :tabs="categoryTabs"
          v-model="currentCategoryId"
          full
        />
        <div class="search-sort-group">
          <div class="search-container">
            <i class="fas fa-search search-icon"></i>
            <input type="text" class="search-input" v-model="searchQuery" placeholder="搜索店内商品...">
          </div>
          <div class="cloud-buttons">
            <button class="cloud-btn" ref="sortBtnRef" @click="toggleSortMenu" title="排序">
              <i class="fas fa-sort"></i>
            </button>
          </div>
        </div>
      </div>

      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showSortMenu" class="dropdown-overlay" @click="showSortMenu = false">
            <div class="dropdown-menu" :style="sortMenuStyle" @click.stop>
              <button
                v-for="opt in sortOptions"
                :key="opt.value"
                :class="['dropdown-menu__item', { active: currentSort === opt.value }]"
                @click="currentSort = opt.value; showSortMenu = false"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </Transition>
      </Teleport>

      <ProductGrid
        :products="filteredProducts"
        :is-loading="isProductsLoading"
        @open-detail="openDetail"
        @add-to-cart="addToCart"
        style="margin-bottom: 2rem;"
      />
    </template>

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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import shopApi from '@/api/shopApi.js'
import { showToast } from '@/utils/toast.js'
import { animateValue } from '@/utils/format.js'
import { useShopCart } from '@/composables/useShopCart.js'
import { useProductDetail } from '@/composables/useProductDetail.js'
import ProductGrid from '@/components/shop/ProductGrid.vue'

import SellerInfoCard from '@/components/shop/SellerInfoCard.vue'
import SellerStats from '@/components/shop/SellerStats.vue'
import CartModal from '@/components/shop/CartModal.vue'
import ProductDetailModal from '@/components/shop/ProductDetailModal.vue'
import OrderRemarkModal from '@/components/shop/OrderRemarkModal.vue'
import CartFloatBtn from '@/components/shop/CartFloatBtn.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const router = useRouter()
const route = useRoute()

const sellerInfo = ref(null)
const products = ref([])
const categories = ref([])
const isLoading = ref(false)
const isProductsLoading = ref(false)
const totalItems = ref(0)
const searchQuery = ref('')
const currentSort = ref('default')
const currentCategoryId = ref('all')

const showSortMenu = ref(false)
const sortBtnRef = ref(null)
const sortMenuStyle = ref({})

const sortOptions = [
  { value: 'default', label: '默认排序' },
  { value: 'price-asc', label: '价格: 低到高' },
  { value: 'price-desc', label: '价格: 高到低' },
  { value: 'sales-desc', label: '销量: 高到低' },
  { value: 'sales-asc', label: '销量: 低到高' }
]

const toggleSortMenu = () => {
  if (showSortMenu.value) { showSortMenu.value = false; return }
  if (sortBtnRef.value) {
    const rect = sortBtnRef.value.getBoundingClientRect()
    sortMenuStyle.value = { top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px` }
  }
  showSortMenu.value = true
}

const categoryTabs = computed(() => [
  { label: '全部', value: 'all' },
  ...categories.value.map(c => ({ label: c.name, value: String(c.category_id) }))
])

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

const allProductCount = ref(0)
const allTotalSales = ref(0)
const animatedProductCount = ref(0)
const animatedTotalSales = ref(0)

const skeletonStats = computed(() => [
  { value: '', label: '商品' },
  { value: '', label: '总销量' },
  { value: '', label: '评分' }
])

const sellerStats = computed(() => [
  { value: animatedProductCount.value, label: '商品' },
  { value: animatedTotalSales.value, label: '总销量' },
  { value: '-', label: '评分' }
])

const shopUrl = computed(() => `${window.location.origin}/shop/${route.params.id}`)

const filteredProducts = computed(() => {
  let filtered = [...products.value]
  if (currentCategoryId.value !== 'all') filtered = filtered.filter(p => String(p.category_id) === currentCategoryId.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q))
  }
  const sortMap = {
    'default': (a, b) => (a.sort || 0) - (b.sort || 0),
    'price-asc': (a, b) => (a.price || 0) - (b.price || 0),
    'price-desc': (a, b) => (b.price || 0) - (a.price || 0),
    'sales-desc': (a, b) => (b.sales || 0) - (a.sales || 0),
    'sales-asc': (a, b) => (a.sales || 0) - (b.sales || 0)
  }
  filtered.sort(sortMap[currentSort.value] || sortMap['default'])
  return filtered
})

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/shop')
}

const copyShopUrl = async () => {
  try {
    await navigator.clipboard.writeText(shopUrl.value)
    showToast('链接已复制', 'success')
  } catch (error) {
    showToast('复制失败', 'error')
  }
}

const playStatsAnimation = () => {
  animateValue(0, allProductCount.value, 800, (v) => { animatedProductCount.value = Math.round(v) })
  animateValue(0, allTotalSales.value, 800, (v) => { animatedTotalSales.value = Math.round(v) })
}

const loadAllProductsStats = async () => {
  const sellerId = route.params.id
  try {
    const res = await shopApi.getProductList({ seller_id: sellerId, page: 1, page_size: 1, is_up: 1, sort_by: 'sort', sort_order: 'asc' })
    if (res?.total !== undefined) {
      allProductCount.value = res.total
      if (res.total <= 100) {
        const allRes = await shopApi.getProductList({ seller_id: sellerId, page: 1, page_size: res.total, is_up: 1, sort_by: 'sort', sort_order: 'asc' })
        if (allRes?.items) allTotalSales.value = allRes.items.reduce((sum, p) => sum + (p.sales || 0), 0)
      }
    }
  } catch (error) {
    showToast('加载统计失败', 'error')
  }
}

const loadCategories = async () => {
  try {
    const res = await shopApi.getCategoryList({ seller_id: route.params.id })
    if (Array.isArray(res)) categories.value = res
  } catch (error) {
    showToast('加载分类失败', 'error')
  }
}

const loadProducts = async (showLoading = true) => {
  try {
    if (showLoading) isProductsLoading.value = true
    const res = await shopApi.getProductList({ seller_id: route.params.id, page: 1, page_size: 1000, is_up: 1, sort_by: 'sort', sort_order: 'asc' })
    if (res?.items) {
      products.value = res.items
      totalItems.value = res.total || products.value.length
    }
  } catch (error) {
    showToast('加载商品失败', 'error')
  } finally {
    isProductsLoading.value = false
  }
}

const loadSellerInfo = async () => {
  try {
    isLoading.value = true
    isProductsLoading.value = true
    const res = await shopApi.getSellerBase({ seller_id: route.params.id })
    if (res) sellerInfo.value = res
    await loadAllProductsStats()
    await loadCategories()
    await loadProducts(false)
    playStatsAnimation()
  } catch (error) {
    showToast('加载店铺信息失败', 'error')
  } finally {
    isLoading.value = false
  }
}

let searchTimer = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {}, 300)
})

onMounted(() => loadSellerInfo())
onUnmounted(() => { if (searchTimer) clearTimeout(searchTimer) })
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


.filter-bar :deep(.segmented-control--full) {
  margin: 0;
}

.share-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--grouped-bg);
  border: none;
  color: var(--system-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  z-index: 10;
}

.share-btn:active {
  opacity: 0.7;
}

@media (max-width: 768px) {
  .seller-info-card {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }
}
</style>
