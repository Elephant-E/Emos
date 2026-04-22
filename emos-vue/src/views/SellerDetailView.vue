<template>
  <div>
    <!-- 页面头部 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <i class="fas fa-chevron-left"></i>
      </button>
      <h1 class="page-title">店铺详情</h1>
    </div>

    <!-- 初始加载状态 - 骨架屏 -->
    <template v-if="isLoading && !sellerInfo">
      <div class="seller-header skeleton-seller-header bento-card">
        <div class="skeleton-avatar" style="width: 80px; height: 80px;"></div>
        <div class="seller-info-section">
          <div class="skeleton-text" style="width: 60%; height: 24px; margin-bottom: 8px;"></div>
          <div class="skeleton-text-sm" style="width: 80%;"></div>
        </div>
      </div>
      
      <div class="seller-stats skeleton-stats bento-card">
        <div class="stat-item">
          <div class="skeleton-stat-value"></div>
          <div class="skeleton-stat-label"></div>
        </div>
        <div class="stat-item">
          <div class="skeleton-stat-value"></div>
          <div class="skeleton-stat-label"></div>
        </div>
        <div class="stat-item">
          <div class="skeleton-stat-value"></div>
          <div class="skeleton-stat-label"></div>
        </div>
      </div>

      <div class="product-grid">
        <div 
          v-for="i in 6" 
          :key="`skeleton-${i}`"
          class="product-card skeleton-card"
        >
          <div class="product-cover skeleton-cover"></div>
          <div class="product-info">
            <div class="skeleton-text" style="width: 70%; height: 18px; margin-bottom: 8px;"></div>
            <div class="skeleton-text-sm" style="width: 90%; margin-bottom: 12px;"></div>
            <div class="price-row">
              <div class="skeleton-text" style="width: 40%; height: 20px;"></div>
            </div>
            <div class="info-row">
              <div class="skeleton-text-sm" style="width: 30%;"></div>
              <div class="stock-actions">
                <div class="skeleton-badge"></div>
                <div class="skeleton-button" style="width: 24px; height: 24px; border-radius: 50%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 店铺内容 -->
    <template v-else-if="sellerInfo">
      <!-- 店铺头部信息 -->
      <div class="seller-header bento-card">
        <div class="seller-avatar-large">
          <div v-if="!sellerInfo.cover_url" class="seller-avatar-placeholder-large">
            <i class="fas fa-store"></i>
          </div>
          <img v-else :src="sellerInfo.cover_url" :alt="sellerInfo.name" loading="lazy">
        </div>
        <div class="seller-info-section">
          <h2 class="seller-name-large">{{ sellerInfo.name }}</h2>
          <p v-if="sellerInfo.description" class="seller-description">{{ sellerInfo.description }}</p>
        </div>
        <button class="share-btn" @click="copyShopUrl" title="复制店铺链接">
          <i class="fas fa-share-alt"></i>
        </button>
      </div>

      <!-- 店铺统计 -->
      <div class="seller-stats bento-card">
        <div class="stat-item">
          <div class="stat-value">{{ stats.productCount }}</div>
          <div class="stat-label">商品</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalSales }}</div>
          <div class="stat-label">总销量</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.rating }}</div>
          <div class="stat-label">评分</div>
        </div>
      </div>

      <!-- 分类筛选栏 -->
      <div class="filter-bar" style="margin-bottom: 1rem; padding: 0 0.5rem;">
        <div class="filter-group">
          <button 
            :class="['filter-chip', { active: !currentCategoryId }]"
            @click="selectCategory(null)"
          >
            全部
          </button>
          <button 
            v-for="category in categories"
            :key="category.category_id"
            :class="['filter-chip', { active: currentCategoryId === category.category_id }]"
            @click="selectCategory(category.category_id)"
          >
            {{ category.name }}
          </button>
        </div>
      </div>

      <!-- 筛选与搜索栏 -->
      <div class="filter-bar" style="margin-bottom: 1.5rem; padding: 0 0.5rem;">
        <select class="sort-select" v-model="currentSort">
          <option value="default">默认排序</option>
          <option value="price-asc">价格: 低到高</option>
          <option value="price-desc">价格: 高到低</option>
          <option value="sales-desc">销量: 高到低</option>
          <option value="sales-asc">销量: 低到高</option>
        </select>
        
        <div class="search-container" style="max-width: none; margin-left: 0; flex: 1;">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            class="search-input" 
            v-model="searchQuery"
            placeholder="搜索店内商品..."
          >
        </div>
      </div>

      <!-- 商品网格 -->
      <div class="product-grid">
        <!-- 加载商品骨架屏（非初始加载） -->
        <template v-if="isLoading && sellerInfo">
          <div 
            v-for="i in 6" 
            :key="`loading-${i}`"
            class="product-card skeleton-card"
          >
            <div class="product-cover skeleton-cover"></div>
            <div class="product-info">
              <div class="skeleton-text" style="width: 70%; height: 18px; margin-bottom: 8px;"></div>
              <div class="skeleton-text-sm" style="width: 90%; margin-bottom: 12px;"></div>
              <div class="price-row">
                <div class="skeleton-text" style="width: 40%; height: 20px;"></div>
              </div>
              <div class="info-row">
                <div class="skeleton-text-sm" style="width: 30%;"></div>
                <div class="stock-actions">
                  <div class="skeleton-badge"></div>
                  <div class="skeleton-button" style="width: 24px; height: 24px; border-radius: 50%;"></div>
                </div>
              </div>
            </div>
          </div>
        </template>
        
        <!-- 商品列表 -->
        <template v-else>
        <div 
          v-for="product in filteredProducts" 
          :key="product.product_id"
          class="product-card"
          @click="openProductDetail(product.product_id)"
        >
          <div class="product-cover">
            <span v-if="product.sales >= 100" class="product-badge">HOT</span>
            <div v-if="!product.cover_url || product.cover_url === null" class="image-placeholder">
              <i class="fas fa-image"></i>
            </div>
            <img 
              v-else
              :src="product.cover_url" 
              :alt="product.name" 
              loading="lazy"
            >
          </div>
          <div class="product-info">
            <div class="product-name">{{ product.name }}</div>
            <div v-if="product.description" class="product-desc">{{ product.description }}</div>
            <div class="price-row">
              <span class="price-current"><i class="fas fa-carrot"></i> {{ product.price }}</span>
              <span v-if="product.price_origin && product.price_origin > product.price" class="price-origin">
                <i class="fas fa-carrot"></i> {{ product.price_origin }}
              </span>
            </div>
            <div class="info-row">
              <div v-if="product.sales !== undefined && product.sales !== null" class="sales-info">
                已售 {{ product.sales }}
              </div>
              <div class="stock-actions">
                <span :class="['stock-badge', getStockClass(product.stock)]">
                  {{ getStockText(product.stock) }}
                </span>
                <button 
                  v-if="product.stock > 0"
                  class="add-cart-btn" 
                  @click.stop="addToCart(product.product_id, 1)"
                >
                  <i class="fas fa-plus"></i>
                  <span 
                    v-if="getCartQty(product.product_id) > 0"
                    class="cart-badge"
                  >
                    {{ getCartQty(product.product_id) }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </template>
        
        <!-- 空状态 -->
        <div v-if="filteredProducts.length === 0 && !isLoading" class="empty-state">
          <i class="fas fa-search"></i>
          <p>未找到匹配的商品</p>
        </div>
      </div>
    </template>

    <!-- 浮动购物车按钮 -->
    <div v-if="totalCartQty > 0" class="cart-float-btn" @click="openCart">
      <i class="fas fa-shopping-cart"></i>
      <span class="cart-badge">{{ totalCartQty }}</span>
    </div>

    <!-- 购物车模态框 -->
    <div 
      :class="['modal-overlay', { show: showCartModal }]"
      @click.self="closeCart"
    >
      <div class="modal-content lg">
        <div class="modal-header">
          <span class="modal-title">购物车 ({{ totalCartQty }})</span>
          <button class="modal-close" @click="closeCart">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" id="cartListBody">
          <div v-if="cart.length === 0" class="empty-cart">
            <i class="fas fa-shopping-bag"></i>
            <p>购物车空空如也</p>
          </div>
          <div v-else class="cart-list">
            <div 
              v-for="item in cart" 
              :key="item.id"
              class="cart-item"
            >
              <div class="cart-item-img">
                <div v-if="!item.img || item.img === null" class="cart-image-placeholder">
                  <i class="fas fa-image"></i>
                </div>
                <img v-else
                  :src="item.img" 
                  :alt="item.name"
                 loading="lazy">
              </div>
              <div class="cart-item-info">
                <div class="cart-item-name">{{ item.name }}</div>
                <div class="cart-item-bottom">
                  <div class="cart-item-price">
                    <i class="fas fa-carrot"></i> {{ item.price * item.qty }}
                  </div>
                  <!-- 备注输入 -->
                  <input 
                    v-model="item.remark"
                    class="cart-item-remark"
                    placeholder="添加备注..."
                    maxlength="100"
                  >
                </div>
              </div>
              <div class="cart-item-qty">
                <button class="qty-btn" @click="updateCartQty(item.id, -1)">
                  <i class="fas fa-minus"></i>
                </button>
                <span class="qty-val">{{ item.qty }}</span>
                <button class="qty-btn" @click="updateCartQty(item.id, 1)">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="clearCart">清空</button>
          <button 
            class="modal-btn primary" 
            @click="checkout"
            :disabled="cart.length === 0"
          >
            结算 ({{ totalPrice }})
          </button>
        </div>
      </div>
    </div>

    <!-- 商品详情模态框 -->
    <div 
      :class="['modal-overlay', { show: showDetailModal }]"
      @click.self="closeDetail"
    >
      <div class="modal-content lg">
        <div class="modal-header">
          <span class="modal-title">商品详情</span>
          <button class="modal-close" @click="closeDetail">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- 加载状态 - 骨架屏 -->
          <div v-if="detailLoading" class="detail-skeleton">
            <div class="skeleton-item" style="width: 100%; aspect-ratio: 16/9; border-radius: 16px; margin-bottom: 1rem;"></div>
            <div class="skeleton-text" style="width: 70%; height: 24px; margin-bottom: 0.8rem;"></div>
            <div class="skeleton-text" style="width: 100%; height: 16px; margin-bottom: 0.5rem;"></div>
            <div class="skeleton-text" style="width: 90%; height: 16px; margin-bottom: 1.5rem;"></div>
            
            <div class="skeleton-text" style="width: 40%; height: 28px; margin-bottom: 1rem;"></div>
            
            <div class="skeleton-list-item" style="padding: 0.8rem; border-radius: 12px; border: 0.5px solid var(--border);">
              <div class="skeleton-circle" style="width: 40px; height: 40px; margin-right: 0.8rem;"></div>
              <div style="flex: 1;">
                <div class="skeleton-text" style="width: 60%; height: 16px; margin-bottom: 0.4rem;"></div>
                <div class="skeleton-text-sm" style="width: 80%; height: 12px;"></div>
              </div>
            </div>
          </div>
          
          <!-- 实际内容 -->
          <template v-else-if="currentProduct">
            <div class="detail-image">
              <div v-if="!currentProduct.cover_url || currentProduct.cover_url === null" class="detail-image-placeholder">
                <i class="fas fa-image"></i>
              </div>
              <img v-else
                :src="currentProduct.cover_url" 
                :alt="currentProduct.name"
               loading="lazy">
            </div>
            <h2 class="detail-title">{{ currentProduct.name }}</h2>
            <p v-if="currentProduct.description" class="detail-desc">{{ currentProduct.description }}</p>
            
            <div class="detail-meta">
              <div class="detail-price-section">
                <div class="detail-price">
                  <i class="fas fa-carrot"></i> {{ currentProduct.price }}
                  <span v-if="currentProduct.price_origin && currentProduct.price_origin > currentProduct.price" class="detail-price-origin">
                    <i class="fas fa-carrot"></i> {{ currentProduct.price_origin }}
                  </span>
                </div>
                <!-- 商家信息卡片 -->
                <div v-if="currentProduct.seller" class="seller-card" @click="openSellerDetail(currentProduct.seller)">
                  <div class="seller-avatar">
                    <div v-if="!currentProduct.seller.cover_url" class="seller-avatar-placeholder">
                      <i class="fas fa-store"></i>
                    </div>
                    <img v-else :src="currentProduct.seller.cover_url" :alt="currentProduct.seller.name" loading="lazy">
                  </div>
                  <div class="seller-info">
                    <div class="seller-name">{{ currentProduct.seller.name }}</div>
                    <div v-if="currentProduct.seller.description" class="seller-desc">{{ currentProduct.seller.description }}</div>
                  </div>
                  <i class="fas fa-chevron-right seller-arrow"></i>
                </div>
              </div>
            </div>
            
            <!-- 兑换方式 -->
            <div v-if="currentProduct.exchange_way" class="detail-tip">
              <i class="fas fa-info-circle"></i>
              兑换方式：{{ currentProduct.exchange_way }}
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="addToCartFromDetail">加入购物车</button>
          <button class="modal-btn primary" @click="buyNow">立即下单</button>
        </div>
      </div>
    </div>

    <!-- 下单备注模态框 -->
    <div 
      :class="['modal-overlay', { show: showOrderModal }]"
      @click.self="closeOrderModal"
    >
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">订单备注</span>
          <button class="modal-close" @click="closeOrderModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">备注信息（选填）</label>
            <textarea 
              v-model="orderRemark"
              class="form-textarea"
              placeholder="请输入备注信息，最多100字..."
              maxlength="100"
              rows="4"
            ></textarea>
            <div class="form-hint">{{ orderRemark.length }}/100</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="closeOrderModal">取消</button>
          <button class="modal-btn primary" @click="confirmOrder" :disabled="isOrderSubmitting">
            <span v-if="!isOrderSubmitting">确认下单</span>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import shopApi from '@/api/shopApi.js'
import orderApi from '@/api/orderApi.js'
import { showToast } from '@/utils/toast.js'
import { checkoutCart } from '@/utils/cartHelper.js'
import { useCartStore } from '@/stores/cart.js'
import { animateValue } from '@/utils/format.js'

const router = useRouter()
const route = useRoute()

// 使用全局购物车store
const cartStore = useCartStore()
const { 
  cart,
  totalCartQty,
  totalPrice
} = storeToRefs(cartStore)

// 解构方法和辅助函数
const { 
  addToCart: storeAddToCart, 
  updateCartQty, 
  removeFromCart, 
  clearCart,
  getStockClass,
  getStockText,
  getCartQty
} = cartStore

// 包装addToCart以兼容原有调用方式
const addToCart = (productId, qty = 1) => {
  const product = products.value.find(p => p.product_id === productId)
  if (product) {
    storeAddToCart(product, qty)
  }
}

// ================= 数据 =================
const sellerInfo = ref(null)
const products = ref([])
const categories = ref([])
const isLoading = ref(false)

// 商品总数（用于显示）
const totalItems = ref(0)

// 搜索、排序和分类
const searchQuery = ref('')
const currentSort = ref('default')
const currentCategoryId = ref(null)

// 购物车模态框状态
const showCartModal = ref(false)

// 商品详情模态框状态
const showDetailModal = ref(false)
const currentProductId = ref(null)
const currentProduct = ref(null)
const detailLoading = ref(false)

// 下单备注模态框状态
const showOrderModal = ref(false)
const orderRemark = ref('')
const isOrderSubmitting = ref(false)

// 统计数据（独立于分类筛选）
const allProductCount = ref(0)
const allTotalSales = ref(0)
const animatedProductCount = ref(0)
const animatedTotalSales = ref(0)

// 当前显示的统计数据（用于模板）
const stats = computed(() => ({
  productCount: animatedProductCount.value,
  totalSales: animatedTotalSales.value,
  rating: '-' // TODO: 从 API 获取真实评分
}))

// ================= 计算属性 =================
// 店铺链接
const shopUrl = computed(() => {
  const sellerId = route.params.id
  return `${window.location.origin}/shop/${sellerId}`
})

const filteredProducts = computed(() => {
  let filtered = [...products.value]
  
  // 分类过滤
  if (currentCategoryId.value) {
    filtered = filtered.filter(p => p.category_id === currentCategoryId.value)
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q)
    )
  }
  
  // 排序
  const sortMap = {
    'default': (a, b) => (a.sort || 0) - (b.sort || 0),
    'price-asc': (a, b) => (a.price || 0) - (b.price || 0),
    'price-desc': (a, b) => (b.price || 0) - (a.price || 0),
    'sales-desc': (a, b) => (b.sales || 0) - (a.sales || 0),
    'sales-asc': (a, b) => (a.sales || 0) - (b.sales || 0)
  }
  
  const sortFn = sortMap[currentSort.value] || sortMap['default']
  filtered.sort(sortFn)
  
  return filtered
})

// ================= 方法 =================
const goBack = () => {
  router.back()
}

// 复制链接
const copyShopUrl = async () => {
  try {
    await navigator.clipboard.writeText(shopUrl.value)
    showToast('链接已复制', 'success')
  } catch (error) {
    console.error('复制失败:', error)
    showToast('复制失败', 'error')
  }
}

// 购物车相关方法
const openCart = () => {
  showCartModal.value = true
}

const closeCart = () => {
  showCartModal.value = false
}

const checkout = async () => {
  const result = await checkoutCart(cart.value, clearCart, closeCart)
  
  // 处理部分成功的情况
  if (result.partialSuccess && result.failedItems) {
    cart.value = result.failedItems
  }
}

const openProductDetail = async (id) => {
  currentProductId.value = id
  showDetailModal.value = true
  detailLoading.value = true
  
  try {
    const res = await shopApi.getProductInfo(id)
    if (res) {
      currentProduct.value = {
        ...res,
        cover_url: res.cover_url || null
      }
    }
  } catch (error) {
    console.error('加载商品详情失败:', error)
    showToast('加载商品详情失败', 'error')
  } finally {
    detailLoading.value = false
  }
}

const closeDetail = () => {
  showDetailModal.value = false
  currentProductId.value = null
  currentProduct.value = null
}

const addToCartFromDetail = () => {
  if (currentProductId.value) {
    addToCart(currentProductId.value, 1)
    closeDetail()
  }
}

const buyNow = () => {
  if (!currentProductId.value) return
  orderRemark.value = ''
  showOrderModal.value = true
}

const closeOrderModal = () => {
  showOrderModal.value = false
  orderRemark.value = ''
}

const confirmOrder = async () => {
  if (isOrderSubmitting.value) return
  isOrderSubmitting.value = true
  
  try {
    const res = await orderApi.createOrder({
      product_id: currentProductId.value,
      buy_number: 1,
      remark: orderRemark.value || null
    })
    
    if (res) {
      showToast('下单成功！', 'success')
      closeOrderModal()
      closeDetail()
      // 可以选择跳转到订单页面
      // router.push('/order')
    }
  } catch (error) {
    console.error('下单失败:', error)
    showToast('下单失败，请重试', 'error')
  } finally {
    isOrderSubmitting.value = false
  }
}

const openSellerDetail = (seller) => {
  // 跳转到其他店铺详情页
  router.push(`/shop/${seller.seller_id}`)
}

// 播放数字动画
const playStatsAnimation = () => {
  animateValue(0, allProductCount.value, 800, (value) => {
    animatedProductCount.value = Math.round(value)
  })
  
  animateValue(0, allTotalSales.value, 800, (value) => {
    animatedTotalSales.value = Math.round(value)
  })
}

// 加载所有商品统计数据（不受分类筛选影响）
const loadAllProductsStats = async () => {
  const sellerId = route.params.id
  
  try {
    // 获取所有商品的总数
    const res = await shopApi.getProductList({
      seller_id: sellerId,
      page: 1,
      page_size: 1, // 只需要总数，不需要具体数据
      is_up: 1,
      sort_by: 'sort',
      sort_order: 'asc'
    })
    
    if (res && res.total !== undefined) {
      allProductCount.value = res.total
      
      // 如果商品数量不多，可以一次性获取所有商品来计算总销量
      if (res.total <= 100) {
        const allRes = await shopApi.getProductList({
          seller_id: sellerId,
          page: 1,
          page_size: res.total,
          is_up: 1,
          sort_by: 'sort',
          sort_order: 'asc'
        })
        
        if (allRes && allRes.items) {
          allTotalSales.value = allRes.items.reduce((sum, p) => sum + (p.sales || 0), 0)
        }
      } else {
        // 如果商品太多，暂时使用0，等待后端提供统计接口
        allTotalSales.value = 0
      }
    }
  } catch (error) {
    console.error('加载商品统计失败:', error)
  }
}

const selectCategory = (categoryId) => {
  currentCategoryId.value = categoryId
  // 本地筛选，不需要重新加载
}

// ================= API 方法 =================
const loadSellerInfo = async () => {
  const sellerId = route.params.id
  
  try {
    isLoading.value = true
    
    const res = await shopApi.getSellerBase({ seller_id: sellerId })
    if (res) {
      sellerInfo.value = res
    }
    
    // 先加载所有商品统计数据（不受分类影响）
    await loadAllProductsStats()
    
    // 然后加载分类和商品列表
    await loadCategories()
    await loadProducts()
    
    // 最后播放统计数字动画
    playStatsAnimation()
  } catch (error) {
    console.error('加载店铺信息失败:', error)
    showToast('加载店铺信息失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const loadCategories = async () => {
  const sellerId = route.params.id
  
  try {
    const res = await shopApi.getCategoryList({ seller_id: sellerId })
    if (res && Array.isArray(res)) {
      categories.value = res
    }
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

const loadProducts = async () => {
  const sellerId = route.params.id
  
  try {
    isLoading.value = true
    
    // 一次性获取所有商品（本地筛选和排序）
    const params = {
      seller_id: sellerId,
      page: 1,
      page_size: 1000, // 获取足够多的商品
      is_up: 1,
      sort_by: 'sort',
      sort_order: 'asc'
    }
    
    const res = await shopApi.getProductList(params)
    if (res && res.items) {
      products.value = res.items.map(item => ({
        ...item
      }))
      
      totalItems.value = res.total || products.value.length
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    showToast('加载商品失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// ================= Watch 监听 =================
// 搜索防抖（本地筛选，不需要调用 API）
let searchTimer = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    // 本地筛选，自动响应
  }, 300)
})

// ================= 生命周期 =================
onMounted(() => {
  loadSellerInfo()
})

onUnmounted(() => {
  // 清理定时器
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
/* 页面头部 - 使用公共样式 */
.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-input);
  border: 0.5px solid var(--border);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--spring);
}

.back-btn:hover {
  background: var(--bg-elevated);
  transform: scale(1.05);
}

/* 分享按钮 - 固定在右上角 */
.share-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-input);
  border: 0.5px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--spring);
  font-size: 0.9rem;
  z-index: 10;
}

.share-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  transform: scale(1.05);
}

.share-btn:active {
  transform: scale(0.95);
}



/* 筛选栏 - 复用公共样式 */
.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.search-container {
  flex: 1;
  position: relative;
  max-width: 400px;
}

/* 商品网格和卡片 - 完全复用ShopView样式，不重复定义 */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .seller-header {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }
  
  .search-container {
    max-width: none;
    width: 100%;
  }
  
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .product-grid {
    grid-template-columns: 1fr;
  }
}

/* ================= 分享模态框特有样式 ================= */
.share-modal {
  max-width: 460px;
}

.share-image-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.share-image-container canvas {
  max-width: 100%;
  height: auto;
  border-radius: 16px;
  box-shadow: var(--shadow-md);
}

/* 操作按钮 */
.share-actions {
  display: flex;
  gap: 0.8rem;
}

.action-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s var(--spring);
  border: 0.5px solid var(--border);
  background: var(--bg-input);
  color: var(--text-primary);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.action-btn:active {
  transform: translateY(0);
}

.action-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.action-btn.primary:hover {
  background: var(--accent-hover, var(--accent));
  box-shadow: 0 4px 12px rgba(var(--accent-rgb, 0, 122, 255), 0.3);
}

.action-btn i {
  font-size: 1rem;
}

/* ================= 购物车样式 ================= */
.empty-cart {
  text-align: center;
  padding: 2rem 0;
  color: var(--text-secondary);
}

.empty-cart i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
  display: block;
}

/* 购物车列表 */
.cart-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 0;
  border-bottom: 1px solid var(--border);
}

.cart-item:last-child {
  border-bottom: none;
}

.cart-item-img {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--bg-surface);
  overflow: hidden;
  flex-shrink: 0;
}

.cart-item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-item-bottom {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.cart-item-price {
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.cart-item-remark {
  flex: 1;
  min-width: 0;
  padding: 0.3rem 0.5rem;
  background: var(--bg-input);
  border: 0.5px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.75rem;
  outline: none;
  transition: all 0.2s;
}

.cart-item-remark:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 10%, transparent);
}

.cart-item-remark::placeholder {
  color: var(--text-tertiary);
}

.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0.3rem;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.qty-btn:hover {
  background: var(--accent);
  color: #fff;
}

.qty-btn:active {
  transform: scale(0.9);
}

.qty-val {
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

/* 浮动购物车按钮 */
.cart-float-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 900;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s var(--spring);
  box-shadow: 0 8px 24px rgba(0,122,255,0.4);
  font-size: 1.2rem;
}

.cart-float-btn:hover {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 10px 32px rgba(0,122,255,0.5);
}

.cart-float-btn:active {
  transform: scale(0.95);
}

.cart-float-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--danger);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 12px;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--bg-primary);
}

.cart-float-badge.show {
  display: flex;
}
</style>
