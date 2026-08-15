<script setup>
import { ref, watch } from 'vue'

const visible = ref(false)
const title = ref('')
const message = ref('')
let resolvePromise = null

const show = (options) => {
  title.value = options.title || '确认'
  message.value = options.message || '确定执行此操作？'
  visible.value = true
  
  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

const confirm = () => {
  visible.value = false
  if (resolvePromise) {
    resolvePromise(true)
    resolvePromise = null
  }
}

const cancel = () => {
  visible.value = false
  if (resolvePromise) {
    resolvePromise(false)
    resolvePromise = null
  }
}

watch(visible, (v) => {
  if (!v) {
    title.value = ''
    message.value = ''
  }
})

defineExpose({ show })
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="confirm-overlay" @click.self="cancel">
        <div class="confirm-dialog">
          <div class="confirm-title">{{ title }}</div>
          <div class="confirm-message">{{ message }}</div>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="cancel">取消</button>
            <button class="confirm-btn confirm" @click="confirm">确定</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10020;
}

.confirm-dialog {
  background: var(--opaque-shelf-bg);
  border-radius: 20px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.confirm-title {
  font: var(--title-3-emphasized);
  color: var(--system-primary);
  margin-bottom: 0.5rem;
}

.confirm-message {
  font: var(--body);
  color: var(--system-secondary);
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font: var(--callout-emphasized);
  cursor: pointer;
}

.confirm-btn.cancel {
  background: var(--grouped-bg);
  border: none;
  color: var(--system-secondary);
}

.confirm-btn.cancel:active {
  opacity: 0.7;
}

.confirm-btn.confirm {
  background: var(--key-color);
  border: none;
  color: #fff;
}

.confirm-btn.confirm:active {
  opacity: 0.8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
