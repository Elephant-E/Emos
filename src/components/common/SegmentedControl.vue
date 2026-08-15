<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, required: true },
  full: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'overflow'])

const wrapperRef = ref(null)
const groupRef = ref(null)
const isOverflow = ref(false)

const checkOverflow = () => {
  if (props.full) return
  if (!wrapperRef.value || !groupRef.value) return
  const parent = wrapperRef.value.parentElement
  if (!parent) return
  const available = parent.clientWidth
  const needed = groupRef.value.scrollWidth
  const overflow = needed > available - 40
  if (overflow !== isOverflow.value) {
    isOverflow.value = overflow
    emit('overflow', overflow)
  }
}

let resizeObserver = null

onMounted(() => {
  nextTick(checkOverflow)
  window.addEventListener('resize', checkOverflow)
  if (wrapperRef.value?.parentElement) {
    resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(wrapperRef.value.parentElement)
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', checkOverflow)
})
</script>

<template>
  <div :class="['segmented-control', { 'segmented-control--overflow': isOverflow, 'segmented-control--full': full }]" ref="wrapperRef">
    <div :class="['segmented-control__group', { 'segmented-control__group--hidden': isOverflow }]" ref="groupRef">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['segmented-control__tab', { active: modelValue === tab.value }]"
        @click="emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.segmented-control {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 1;
  background: transparent;
  min-width: 0;
  flex-shrink: 1;
}

.segmented-control--full {
  width: 100%;
  margin: 0.8rem 0;
}

.filter-bar .segmented-control--full {
  margin: 0;
}

.segmented-control__group {
  display: inline-flex;
  background: var(--page-bg);
  border: 1px solid var(--search-bar-border-color);
  border-radius: 1000px;
  padding: 4px;
  gap: 4px;
  position: relative;
  height: 36px;
  align-items: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  min-width: max-content;
}

.segmented-control--full .segmented-control__group {
  display: flex;
  width: 100%;
  min-width: 0;
}

@media (min-width: 769px) {
  .segmented-control--full {
    width: auto;
  }
  .segmented-control--full .segmented-control__group {
    width: auto;
    min-width: max-content;
  }
  .segmented-control--full .segmented-control__tab {
    flex: 0;
  }
}

[data-theme="light"] .segmented-control__group {
  border-color: rgba(0, 0, 0, 0.05);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.segmented-control__group--hidden {
  visibility: hidden;
  position: absolute;
  pointer-events: none;
}

.segmented-control--overflow {
  width: 0;
  min-width: 0;
  overflow: hidden;
  flex-shrink: 0;
}

.segmented-control__tab {
  padding: 0 10px;
  border: none;
  font: var(--body);
  cursor: pointer;
  border-radius: 1000px;
  transition: background-color 0.15s ease, color 0.15s ease;
  background: transparent;
  color: var(--system-secondary);
  position: relative;
  z-index: 1;
  white-space: nowrap;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.segmented-control--full .segmented-control__tab {
  flex: 1;
}

.segmented-control__tab.active {
  background: var(--system-quaternary);
  color: var(--system-primary);
  box-shadow: none;
  font: var(--body-emphasized);
}


.segmented-control__tab:not(.active):active {
  background: var(--system-quinary);
}
</style>
