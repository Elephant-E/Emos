<script setup>
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  visible: Boolean,
  remark: { type: String, default: '' },
  submitting: Boolean
})

const emit = defineEmits(['close', 'confirm', 'update:remark'])
</script>

<template>
  <BaseModal :visible="visible" title="订单备注" @close="emit('close')">
    <div class="form-group">
      <label class="form-label">备注信息（选填）</label>
      <textarea
        :value="remark"
        @input="emit('update:remark', $event.target.value)"
        class="form-textarea"
        placeholder="请输入备注信息，最多100字..."
        maxlength="100"
        rows="4"
      ></textarea>
      <div class="form-hint">{{ remark.length }}/100</div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="emit('close')">取消</button>
      <button class="modal-btn primary" @click="emit('confirm')" :disabled="submitting">
        <i v-if="submitting" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>确认下单</span>
      </button>
    </template>
  </BaseModal>
</template>