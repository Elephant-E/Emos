<script setup>
import { ref } from 'vue'

const props = defineProps({
  sortOptions: { type: Array, default: () => [
    { value: 'default', label: '默认排序' },
    { value: 'price-asc', label: '价格: 低到高' },
    { value: 'price-desc', label: '价格: 高到低' },
    { value: 'sales-desc', label: '销量: 高到低' },
    { value: 'sales-asc', label: '销量: 低到高' }
  ]},
  searchPlaceholder: { type: String, default: '搜索商品...' }
})

const currentSort = defineModel('sort', { type: String, default: 'default' })
const searchQuery = defineModel('search', { type: String, default: '' })

const showSortMenu = ref(false)
const sortBtnRef = ref(null)
const sortMenuStyle = ref({})

const toggleSortMenu = () => {
  if (showSortMenu.value) { showSortMenu.value = false; return }
  if (sortBtnRef.value) {
    const rect = sortBtnRef.value.getBoundingClientRect()
    sortMenuStyle.value = { top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px` }
  }
  showSortMenu.value = true
}
</script>

<template>
  <div class="filter-bar" style="margin-bottom: 1.5rem; padding: 0 0.5rem;">
    <div class="search-sort-group">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input type="text" class="search-input" v-model="searchQuery" :placeholder="searchPlaceholder">
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
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>