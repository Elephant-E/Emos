<script setup>
defineProps({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  coverUrl: { type: String, default: '' }
})

const emit = defineEmits(['action'])
</script>

<template>
  <div class="seller-info-card bento-card">
    <div class="seller-avatar-large">
      <div v-if="!coverUrl" class="seller-avatar-placeholder-large"><i class="fas fa-store"></i></div>
      <img v-else :src="coverUrl" :alt="name" loading="lazy">
    </div>
    <div class="seller-info-section">
      <h2 class="seller-name-large">{{ name }}</h2>
      <p v-if="description" class="seller-description">{{ description }}</p>
    </div>
    <slot name="action" />
  </div>
</template>