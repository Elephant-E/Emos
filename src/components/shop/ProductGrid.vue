<script setup>
import { useCartStore } from '@/stores/cart.js'

const props = defineProps({
  products: { type: Array, default: () => [] },
  isLoading: Boolean,
  isLoadingMore: Boolean,
  skeletonCount: { type: Number, default: 6 },
  emptyText: { type: String, default: '未找到匹配的商品' },
  showSales: { type: Boolean, default: true },
  showCartBtn: { type: Boolean, default: true }
})

const emit = defineEmits(['openDetail', 'addToCart'])

const cartStore = useCartStore()

const getStockClass = (stock) => {
  if (stock <= 0) return 'out'
  if (stock <= 5) return 'low'
  return ''
}

const getStockText = (stock) => {
  if (stock <= 0) return '售罄'
  if (stock <= 5) return `仅剩${stock}`
  return '有货'
}

const getCartQty = (productId) => cartStore.getCartQty(productId)
</script>

<template>
  <div class="product-grid">
    <template v-if="isLoading">
      <div v-for="i in skeletonCount" :key="`skeleton-${i}`" class="product-card skeleton-card">
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

    <template v-else>
      <div
        v-for="product in products"
        :key="product.product_id"
        class="product-card"
        @click="emit('openDetail', product.product_id)"
      >
        <div class="product-cover">
          <div v-if="product.sales >= 100" class="cloud-buttons" style="position:absolute;top:12px;left:12px;z-index:2;">
            <span class="cloud-btn" style="width:auto;height:auto;padding:0.2rem 0.5rem;font:var(--callout-emphasized);border-radius:1000px;">HOT</span>
          </div>
          <div v-if="!product.cover_url" class="image-placeholder">
            <i class="fas fa-image"></i>
          </div>
          <img v-else :src="product.cover_url" :alt="product.name" loading="lazy">
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
            <div v-if="showSales && product.sales !== undefined && product.sales !== null" class="sales-info">
              已售 {{ product.sales }}
            </div>
            <div class="stock-actions">
              <span :class="['stock-badge', getStockClass(product.stock)]">
                {{ getStockText(product.stock) }}
              </span>
              <button
                v-if="showCartBtn && product.stock > 0"
                class="add-cart-btn"
                @click.stop="emit('addToCart', product.product_id)"
              >
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <template v-if="isLoadingMore">
        <div v-for="i in 6" :key="`loading-more-${i}`" class="product-card skeleton-card">
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

      <div v-if="products.length === 0 && !isLoadingMore" class="empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-search"></i>
        <p>{{ emptyText }}</p>
      </div>
    </template>
  </div>
</template>