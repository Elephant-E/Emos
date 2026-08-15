<script setup>
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  visible: Boolean,
  loading: Boolean,
  product: { type: Object, default: null }
})

const emit = defineEmits(['close', 'addToCart', 'buyNow', 'openSeller'])
</script>

<template>
  <BaseModal :visible="visible" title="商品详情" @close="emit('close')">
    <div v-if="loading" class="detail-skeleton">
      <div class="skeleton-item" style="width: 100%; aspect-ratio: 16/9; border-radius: 20px; margin-bottom: 1rem;"></div>
      <div class="skeleton-text" style="width: 70%; height: 24px; margin-bottom: 0.8rem;"></div>
      <div class="skeleton-text" style="width: 100%; height: 16px; margin-bottom: 0.5rem;"></div>
      <div class="skeleton-text" style="width: 90%; height: 16px; margin-bottom: 1.5rem;"></div>
      <div class="skeleton-text" style="width: 40%; height: 28px; margin-bottom: 1rem;"></div>
      <div class="skeleton-list-item" style="padding: 0.8rem; border-radius: 12px;">
        <div class="skeleton-circle" style="width: 40px; height: 40px; margin-right: 0.8rem;"></div>
        <div style="flex: 1;">
          <div class="skeleton-text" style="width: 60%; height: 16px; margin-bottom: 0.4rem;"></div>
          <div class="skeleton-text-sm" style="width: 80%; height: 12px;"></div>
        </div>
      </div>
    </div>

    <template v-else-if="product">
      <div class="detail-image">
        <div v-if="!product.cover_url" class="detail-image-placeholder"><i class="fas fa-image"></i></div>
        <img v-else :src="product.cover_url" :alt="product.name" loading="lazy">
      </div>
      <h2 class="detail-title">{{ product.name }}</h2>
      <p v-if="product.description" class="detail-desc">{{ product.description }}</p>
      <div class="detail-meta">
        <div class="detail-price-section">
          <div class="detail-price">
            <i class="fas fa-carrot"></i> {{ product.price }}
            <span v-if="product.price_origin && product.price_origin > product.price" class="detail-price-origin">
              <i class="fas fa-carrot"></i> {{ product.price_origin }}
            </span>
          </div>
          <div v-if="product.seller" class="seller-card" @click="emit('openSeller', product.seller)">
            <div class="seller-avatar">
              <div v-if="!product.seller.cover_url" class="seller-avatar-placeholder"><i class="fas fa-store"></i></div>
              <img v-else :src="product.seller.cover_url" :alt="product.seller.name" loading="lazy">
            </div>
            <div class="seller-info">
              <div class="seller-name">{{ product.seller.name }}</div>
              <div v-if="product.seller.description" class="seller-desc">{{ product.seller.description }}</div>
            </div>
            <i class="fas fa-chevron-right seller-arrow"></i>
          </div>
        </div>
      </div>
      <div v-if="product.exchange_way" class="detail-tip">
        <i class="fas fa-info-circle"></i>
        兑换方式：{{ product.exchange_way }}
      </div>
    </template>
    <template #footer>
      <button class="modal-btn secondary" @click="emit('addToCart')">加入购物车</button>
      <button class="modal-btn primary" @click="emit('buyNow')">立即下单</button>
    </template>
  </BaseModal>
</template>