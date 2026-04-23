<template>
  <div>
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">商城中心</h1>
      <p class="page-subtitle">浏览精选好物，用萝卜兑换心仪商品</p>
    </div>

    <!-- 筛选与搜索栏 -->
    <div class="filter-bar" style="margin-bottom: 1.5rem;">
      <select class="sort-select" v-model="currentSort">
        <option value="default">默认排序</option>
        <option value="price-asc">价格: 低到高</option>
        <option value="price-desc">价格: 高到低</option>
        <option value="sales-asc">销量: 低到高</option>
        <option value="sales-desc">销量: 高到低</option>
      </select>
      
      <div class="search-container" style="max-width: none; margin-left: 0; flex: 1;">
        <i class="fas fa-search search-icon"></i>
        <input 
          type="text" 
          class="search-input" 
          v-model="searchQuery"
          placeholder="搜索商品名称或描述..."
        >
      </div>
    </div>

    <!-- 商品网格 -->
    <div class="product-grid" style="margin-bottom: 2rem;">
      <!-- 加载状态 - 使用骨架屏 -->
      <template v-if="isLoading">
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
      </template>
      
      <!-- 商品列表 -->
      <template v-else>
        <div 
          v-for="product in filteredProducts" 
          :key="product.product_id"
          class="product-card"
          @click="openDetail(product.product_id)"
        >
          <div class="product-cover">
            <!-- HOT标签 -->
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
            <!-- 第一行：价格 -->
            <div class="price-row">
              <span class="price-current"><i class="fas fa-carrot"></i> {{ product.price }}</span>
              <span v-if="product.price_origin && product.price_origin > product.price" class="price-origin">
                <i class="fas fa-carrot"></i> {{ product.price_origin }}
              </span>
            </div>
            <!-- 第二行：已售 + 库存和加购 -->
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
        
        <!-- 加载更多骨架屏 -->
        <template v-if="isLoadingMore">
          <div 
            v-for="i in pageSize" 
            :key="`loading-more-${i}`"
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
        
        <!-- 空状态 -->
        <div v-if="filteredProducts.length === 0 && !isLoadingMore" class="empty-state">
          <i class="fas fa-search"></i>
          <p>未找到匹配的商品</p>
        </div>
      </template>
    </div>

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
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import shopApi from '@/api/shopApi.js'
import orderApi from '@/api/orderApi.js'
import { showToast } from '@/utils/toast.js'
import { checkoutCart } from '@/utils/cartHelper.js'
import { useCartStore } from '@/stores/cart.js'

const router = useRouter()

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
const products = ref([])
const isLoading = ref(false)
const isLoadingMore = ref(false)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const hasMore = ref(true)

const searchQuery = ref('')
const currentSort = ref('default')
const showCartModal = ref(false)
const showDetailModal = ref(false)
const showOrderModal = ref(false)
const orderRemark = ref('')
const isOrderSubmitting = ref(false)
const currentProductId = ref(null)
const detailLoading = ref(false)
const currentProduct = ref(null)

// ================= 计算属性 =================
const filteredProducts = computed(() => {
  let filtered = products.value
  
  // 搜索（前端过滤）
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q)
    )
  }
  
  return filtered
})


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

const openDetail = async (id) => {
  currentProductId.value = id
  detailLoading.value = true
  showDetailModal.value = true
  
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
}

const openSellerDetail = (seller) => {
  // 跳转到店铺详情页
  router.push(`/shop/${seller.seller_id}`)
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

onMounted(async () => {
  await loadProducts()
})

// keep-alive 激活时 - 重新添加滚动监听
onActivated(() => {
  window.addEventListener('scroll', handleScroll)
})

// keep-alive 停用时 - 移除滚动监听（防止页面切换时触发）
onDeactivated(() => {
  window.removeEventListener('scroll', handleScroll)
})

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// ================= Watch 监听 =================
// 监听搜索关键词变化，防抖处理
let searchTimer = null
watch(searchQuery, (newVal) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    // 搜索时重置分页
    currentPage.value = 1
    hasMore.value = true
    loadProducts()
  }, 500)
})

// 监听排序变化
watch(currentSort, () => {
  // 排序时重置分页
  currentPage.value = 1
  hasMore.value = true
  loadProducts()
})

// 滚动加载更多
const handleScroll = () => {
  if (isLoading.value || isLoadingMore.value || !hasMore.value) return
  
  // 使用 window 滚动
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const scrollHeight = document.documentElement.scrollHeight
  
  // 距离底部 200px 时触发加载
  if (scrollTop + windowHeight >= scrollHeight - 200) {
    loadMore()
  }
}

// ================= API 方法 =================
const loadProducts = async (isLoadMore = false) => {
  try {
    // 如果是加载更多，设置loading状态
    if (isLoadMore) {
      isLoadingMore.value = true
    } else {
      isLoading.value = true
      // 重置分页
      currentPage.value = 1
      products.value = []
    }
    
    // 构建查询参数
    const params = {
      is_up: 1,
      page: currentPage.value,
      page_size: pageSize.value
    }
    
    // 如果有搜索关键词
    if (searchQuery.value) {
      params.name = searchQuery.value
    }
    
    // 排序参数
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
    if (res && res.items) {
      const newItems = res.items.map(item => ({
        ...item
      }))
      
      // 如果是加载更多，追加数据；否则替换数据
      if (isLoadMore) {
        products.value = [...products.value, ...newItems]
      } else {
        products.value = newItems
      }
      
      // 更新总数和是否有更多
      totalItems.value = res.total || 0
      hasMore.value = products.value.length < totalItems.value
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    showToast('加载商品失败', 'error')
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// 加载更多
const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  
  currentPage.value++
  await loadProducts(true)
}
</script>

<style scoped>

/* 商品网格 */
.product-grid {
  margin-bottom: 2rem;
}

.product-card {
  background: var(--bg-elevated);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  overflow: hidden;
  transition: transform 0.3s var(--spring), box-shadow 0.3s var(--spring), border-color 0.3s var(--ease);
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}

.product-card:active {
  transform: scale(0.99);
}

.product-cover {
  aspect-ratio: 4/3;
  background: var(--bg-surface);
  position: relative;
  overflow: hidden;
}

.product-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s var(--spring);
}

.product-card:hover .product-cover img {
  transform: scale(1.06);
}

/* HOT标签 */
.product-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: var(--warning);
  color: #000;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(255, 159, 10, 0.4);
  z-index: 2;
}

/* 图片占位符 */
.image-placeholder,
.detail-image-placeholder,
.cart-image-placeholder {
  width: 100%;
  height: 100%;
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 2rem;
  opacity: 0.5;
}

.cart-image-placeholder {
  font-size: 1.2rem;
}

.detail-image-placeholder {
  font-size: 3rem;
}

.product-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.product-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.8rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border);
}

.price-current {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent);
}

.price-current i {
  font-size: 0.75rem;
  opacity: 0.8;
}

.price-origin {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  text-decoration: line-through;
  opacity: 0.6;
}

.price-origin i {
  font-size: 0.65rem;
}

/* 信息行：已售 + 库存操作 */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sales-info {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.stock-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  background: var(--bg-input);
  color: var(--text-secondary);
  height: 24px;
  display: flex;
  align-items: center;
}

.stock-badge.low {
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 15%, transparent);
}

.stock-badge.out {
  color: var(--text-tertiary);
  text-decoration: line-through;
}

/* 库存和操作按钮容器 */
.stock-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 加购按钮 - 圆形 */
.add-cart-btn {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  border: 0.5px solid var(--accent);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--spring);
  font-size: 0.75rem;
  padding: 0;
  outline: none;
}

.add-cart-btn:hover {
  background: var(--accent-hover, var(--accent));
  border-color: var(--accent-hover, var(--accent));
  transform: scale(1.05);
}

.add-cart-btn:active {
  transform: scale(0.95);
}

/* 空状态 */
.empty-state {
  grid-column: 1/-1;
  text-align: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

/* 加载状态 */
.loading-state {
  grid-column: 1/-1;
  text-align: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.loading-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

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

/* 商品详情 */
.detail-image {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-title {
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
}

.detail-desc {
  color: var(--text-secondary);
  margin-bottom: 1rem;
  line-height: 1.6;
}

.detail-meta {
  margin-bottom: 1rem;
}

.detail-price-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-price i {
  font-size: 1.1rem;
}

.detail-price-origin {
  font-size: 1rem;
  color: var(--text-tertiary);
  text-decoration: line-through;
  opacity: 0.6;
}

.detail-price-origin i {
  font-size: 0.85rem;
}

/* 商家信息卡片 */
.seller-card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  background: var(--bg-input);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s var(--spring);
  border: 0.5px solid var(--border);
}

.seller-card:hover {
  background: var(--bg-elevated);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.seller-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.seller-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.seller-avatar-placeholder {
  color: var(--text-tertiary);
  font-size: 1.2rem;
}

.seller-info {
  flex: 1;
  min-width: 0;
}

.seller-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seller-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seller-arrow {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  flex-shrink: 0;
}

.detail-tip {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.detail-tip i {
  margin-right: 0.5rem;
  opacity: 0.6;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .shop-view {
    padding: 0 16px;
  }
  
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem;
  }
  
  .product-info {
    padding: 0.8rem;
  }
  
  .product-name {
    font-size: 0.9rem;
  }
  
  .price-current {
    font-size: 1rem;
  }
  
  .cart-float-btn {
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
  }
}
</style>
