<script setup>
defineProps({
  qty: { type: Number, default: 0 }
})

const emit = defineEmits(['click'])
</script>

<template>
  <div v-if="qty > 0" class="cart-float-btn" @click="emit('click')">
    <i class="fas fa-shopping-cart"></i>
    <span class="cart-badge">{{ qty }}</span>
  </div>
</template>