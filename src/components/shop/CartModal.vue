<script setup>
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  visible: Boolean,
  cart: { type: Array, default: () => [] },
  totalCartQty: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 }
})

const emit = defineEmits(['close', 'updateCartQty', 'clearCart', 'checkout'])
</script>

<template>
  <BaseModal :visible="visible" title="购物车" @close="emit('close')">
    <div v-if="cart.length === 0" class="empty-cart">
      <i class="fas fa-shopping-bag"></i>
      <p>购物车空空如也</p>
    </div>
    <div v-else class="cart-list">
      <div v-for="item in cart" :key="item.id" class="cart-item">
        <div class="cart-item-img">
          <div v-if="!item.img" class="cart-image-placeholder"><i class="fas fa-image"></i></div>
          <img v-else :src="item.img" :alt="item.name" loading="lazy">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">{{ item.name }}</div>
          <div class="cart-item-bottom">
            <div class="cart-item-price"><i class="fas fa-carrot"></i> {{ item.price * item.qty }}</div>
            <input v-model="item.remark" class="cart-item-remark" placeholder="添加备注..." maxlength="100">
          </div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" @click="emit('updateCartQty', item.id, -1)"><i class="fas fa-minus"></i></button>
          <span class="qty-val">{{ item.qty }}</span>
          <button class="qty-btn" @click="emit('updateCartQty', item.id, 1)"><i class="fas fa-plus"></i></button>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="emit('clearCart')">清空</button>
      <button class="modal-btn primary" @click="emit('checkout')" :disabled="cart.length === 0">
        结算 ({{ totalPrice }})
      </button>
    </template>
  </BaseModal>
</template>