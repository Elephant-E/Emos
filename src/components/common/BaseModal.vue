<script>
import { reactive, computed } from 'vue'
const state = reactive({ stack: [], counter: 0 })
</script>

<script setup>
import { watch, onUnmounted } from 'vue'

const props = defineProps({
  visible: Boolean,
  title: String,
  size: { type: String, default: '' }
})
const emit = defineEmits(['close', 'closed'])

let _uid = null

const zIndex = computed(() => {
  if (!props.visible || _uid === null) return -1
  const idx = state.stack.indexOf(_uid)
  return idx >= 0 ? 10001 + idx : -1
})

const isTopModal = () => {
  if (!props.visible || _uid === null) return false
  return state.stack.length > 0 && state.stack[state.stack.length - 1] === _uid
}

watch(() => props.visible, (v) => {
  const el = document.getElementById('scrollable-page')
  if (v) {
    state.counter++
    _uid = state.counter
    state.stack.push(_uid)
    if (el) el.style.overflow = 'hidden'
  } else {
    if (_uid !== null) {
      const idx = state.stack.indexOf(_uid)
      if (idx !== -1) state.stack.splice(idx, 1)
      _uid = null
    }
    if (state.stack.length === 0) {
      if (el) el.style.overflow = ''
    }
    emit('closed')
  }
})

onUnmounted(() => {
  if (_uid !== null) {
    const idx = state.stack.indexOf(_uid)
    if (idx !== -1) state.stack.splice(idx, 1)
    _uid = null
    if (state.stack.length === 0) {
      const el = document.getElementById('scrollable-page')
      if (el) el.style.overflow = ''
    }
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-show="visible"
      :class="['modal-overlay', { show: visible }]"
      :style="{ zIndex }"
      @click.self="isTopModal() && emit('close')"
    >
      <div :class="['modal-content', 'modal-fullscreen', size]">
        <div class="modal-header">
          <div class="modal-header__spacer"></div>
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close" @click="emit('close')">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
