<script setup>
const props = defineProps({
  stats: { type: Array, default: () => [] },
  columns: { type: Number, default: 3 }
})
</script>

<template>
  <div :class="[columns === 4 ? 'stats-grid' : 'seller-stats', 'bento-card']">
    <div v-for="stat in stats" :key="stat.label" class="stat-item">
      <div class="stat-value">{{ stat.value }}</div>
      <div class="stat-label">{{ stat.label }}</div>
    </div>
  </div>
</template>
