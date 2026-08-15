<script setup>
import { reactive, watch } from 'vue'
import voteApi from '@/api/voteApi.js'
import { showToast } from '@/utils/toast.js'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close', 'success'])

const state = reactive({
  question: '',
  seconds: 3600,
  options: ['', ''],
  isSubmitting: false
})

watch(() => props.visible, (v) => {
  if (!v) {
    state.question = ''
    state.seconds = 3600
    state.options = ['', '']
    state.isSubmitting = false
  }
})

const addVoteOption = () => {
  if (state.options.length >= 12) {
    showToast('最多只能添加 12 个选项', 'error')
    return
  }
  state.options.push('')
}

const removeVoteOption = (index) => {
  state.options.splice(index, 1)
}

const submitVote = async () => {
  if (state.isSubmitting) return
  const question = state.question.trim()
  const seconds = parseInt(state.seconds)
  const options = state.options.filter(opt => opt.trim())
  if (!question) { showToast('请输入投票问题', 'error'); return }
  if (options.length < 2) { showToast('至少需要 2 个选项', 'error'); return }
  if (!seconds || seconds < 60) { showToast('过期时间最少 60 秒', 'error'); return }
  state.isSubmitting = true
  try {
    await voteApi.create({ question, options: options.map(opt => opt.trim()), seconds })
    showToast('投票创建成功！', 'success')
    emit('close')
    emit('success')
    state.question = ''
    state.seconds = 3600
    state.options = ['', '']
  } catch (error) {
    showToast(error.message || '创建失败', 'error')
  } finally {
    state.isSubmitting = false
  }
}
</script>

<template>
  <BaseModal :visible="visible" title="创建投票" size="xl" @close="emit('close')">
    <div class="vote-form">
      <div class="form-group">
        <label class="form-label">投票问题</label>
        <input type="text" class="modal-input" v-model="state.question" maxlength="100" placeholder="请输入投票问题（100字以内）">
      </div>
      <div class="form-group">
        <label class="form-label">过期时间（秒）</label>
        <input type="number" class="modal-input" v-model="state.seconds" min="60" placeholder="最低 60 秒">
        <div class="form-hint">最低 60 秒</div>
      </div>
      <div class="vote-form__options">
        <div class="vote-form__options-header">
          <label class="vote-form__options-title">投票选项</label>
          <button type="button" class="btn-subtle" @click="addVoteOption">+ 新增选项</button>
        </div>
        <div class="vote-form__options-list">
          <div v-for="(option, index) in state.options" :key="index" class="vote-form__option-row">
            <div class="vote-form__option-input">
              <input type="text" class="modal-input" v-model="state.options[index]" :placeholder="`选项 ${index + 1}`" maxlength="50">
            </div>
            <button v-if="index >= 2" class="modal-close modal-close--sm" @click="removeVoteOption(index)">
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div v-if="state.options.length === 0" class="list-empty">点击"+ 新增选项"添加选项</div>
        </div>
        <div class="form-hint">至少需要 2 个选项，最多 12 个选项。</div>
      </div>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="emit('close')">取消</button>
      <button class="modal-btn primary" @click="submitVote" :disabled="state.isSubmitting">
        <i v-if="state.isSubmitting" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>创建投票</span>
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.vote-form__options {
  border-top: 0.5px solid var(--system-quaternary);
  padding-top: 20px; margin-top: 8px;
}
.vote-form__options-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.vote-form__options-title { font: var(--title-3-emphasized); color: var(--system-primary); }
.vote-form__options-list { display: flex; flex-direction: column; gap: 12px; }
.vote-form__option-row { display: flex; gap: 8px; align-items: center; }
.vote-form__option-input { flex: 1; }

</style>
