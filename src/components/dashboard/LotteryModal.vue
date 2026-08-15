<script setup>
import { reactive, watch } from 'vue'
import lotteryApi from '@/api/lotteryApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import { formatRelativeTime, normalizeList } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])

const state = reactive({
  activeTab: 'create',
  createForm: {
    name: '',
    description: '',
    time_start: '',
    time_end: '',
    amount: 1,
    number: 0,
    rule_carrot: 0,
    rule_sign: 0
  },
  prizes: [],
  winnerQueryId: '',
  winnerList: [],
  winnerPage: 1,
  winnerTotal: 0,
  winnerPageSize: 15,
  winnerLoading: false,
  winnerHasMore: true,
  isSubmitting: false
})

watch(() => props.visible, (v) => {
  if (!v) {
    state.activeTab = 'create'
    state.createForm = { name: '', description: '', time_start: '', time_end: '', amount: 1, number: 0, rule_carrot: 0, rule_sign: 0 }
    state.prizes = []
    state.winnerQueryId = ''
    state.winnerList = []
    state.winnerPage = 1
    state.winnerTotal = 0
    state.winnerLoading = false
    state.winnerHasMore = true
    state.isSubmitting = false
  }
})

const tabs = [
  { value: 'create', label: '创建抽奖' },
  { value: 'winners', label: '中奖列表' }
]

watch(() => props.visible, (v) => {
  if (!v) return
  state.activeTab = 'create'
  state.createForm = {
    name: '', description: '', time_start: '', time_end: '',
    amount: 1, number: 0, rule_carrot: 0, rule_sign: 0
  }
  state.prizes = []
  state.winnerQueryId = ''
  state.winnerList = []
  state.winnerPage = 1
  state.winnerTotal = 0
  state.winnerLoading = false
  state.winnerHasMore = true
  state.isSubmitting = false
})

const addPrize = () => {
  state.prizes.push({ name: '', count: 1, description: '', bodys: '' })
}

const removePrize = (index) => {
  state.prizes.splice(index, 1)
}

const submitLottery = async () => {
  const form = state.createForm
  if (!form.name.trim()) { showToast('请输入抽奖名称', 'error'); return }
  if (!form.time_start || !form.time_end) { showToast('请设置开始和结束时间', 'error'); return }
  if (state.prizes.length === 0) { showToast('请至少添加一个奖品', 'error'); return }
  for (let i = 0; i < state.prizes.length; i++) {
    const p = state.prizes[i]
    if (!p.name.trim()) { showToast(`奖品 ${i + 1} 名称不能为空`, 'error'); return }
    if (!p.count || p.count < 1) { showToast(`奖品 ${i + 1} 数量需 ≥ 1`, 'error'); return }
  }
  state.isSubmitting = true
  try {
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      time_start: form.time_start,
      time_end: form.time_end,
      amount: Number(form.amount) || 1,
      number: Number(form.number) || 0,
      rule_carrot: Number(form.rule_carrot) || 0,
      rule_sign: Number(form.rule_sign) || 0,
      prizes: state.prizes.map(p => ({
        name: p.name.trim(),
        count: Number(p.count),
        description: p.description.trim(),
        bodys: p.bodys.trim()
      }))
    }
    await lotteryApi.create(data)
    showToast('抽奖创建成功！', 'success')
    emit('close')
  } catch (e) {
    showToast('创建失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    state.isSubmitting = false
  }
}

const queryLotteryWinners = () => {
  if (!state.winnerQueryId.trim()) { showToast('请输入抽奖 ID', 'error'); return }
  state.winnerList = []
  state.winnerPage = 1
  state.winnerTotal = 0
  state.winnerHasMore = true
  loadLotteryWinners()
}

const loadLotteryWinners = async (isLoadMore = false) => {
  if (state.winnerLoading) return
  if (!isLoadMore && !state.winnerQueryId.trim()) return
  state.winnerLoading = true
  try {
    const res = await lotteryApi.winners(state.winnerQueryId.trim(), {
      page: state.winnerPage, page_size: state.winnerPageSize
    })
    const data = res.data || res
    const items = normalizeList(data)
    const total = data.total || 0
    if (isLoadMore) { state.winnerList = [...state.winnerList, ...items] }
    else { state.winnerList = items }
    state.winnerTotal = total
    state.winnerHasMore = state.winnerList.length < total
  } catch (e) {
    if (!isLoadMore) { showToast('查询失败: ' + (e.message || '未知错误'), 'error') }
  } finally {
    state.winnerLoading = false
  }
}

const handleLotteryWinnerScroll = (event) => {
  const el = event.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
    if (state.winnerLoading || !state.winnerHasMore) return
    state.winnerPage++
    loadLotteryWinners(true)
  }
}

const cancelLottery = async () => {
  if (!state.winnerQueryId.trim()) { showToast('请先输入抽奖 ID', 'error'); return }
  try {
    const confirmed = await confirmDialog('确定要取消该抽奖吗？此操作不可撤销。')
    if (!confirmed) return
    await lotteryApi.cancel(state.winnerQueryId.trim())
    showToast('抽奖已取消', 'success')
    state.winnerList = []
    state.winnerTotal = 0
    state.winnerHasMore = true
  } catch (e) {
    showToast('取消失败: ' + (e.message || '未知错误'), 'error')
  }
}
</script>

<template>
  <BaseModal :visible="visible" title="抽奖工具" size="xxl" @close="emit('close')">
    <SegmentedControl :tabs="tabs" v-model="state.activeTab" />

    <div v-show="state.activeTab === 'create'" class="lottery-form">
      <div class="form-group">
        <label class="form-label">抽奖名称</label>
        <input type="text" class="modal-input" v-model="state.createForm.name" maxlength="50" placeholder="请输入抽奖名称（50字以内）">
      </div>
      <div class="form-group">
        <label class="form-label">抽奖简介（可选）</label>
        <textarea class="modal-input modal-textarea" v-model="state.createForm.description" maxlength="200" rows="2" placeholder="请输入抽奖简介（200字以内）"></textarea>
      </div>
      <div class="form-group">
        <div class="lottery-form__time-grid">
          <div>
            <label class="form-label">开始时间</label>
            <input type="datetime-local" class="modal-input" v-model="state.createForm.time_start">
          </div>
          <div>
            <label class="form-label">结束时间</label>
            <input type="datetime-local" class="modal-input" v-model="state.createForm.time_end">
          </div>
        </div>
      </div>
      <div class="form-group">
        <div class="lottery-form__grid">
          <div>
            <label class="form-label">参与消耗萝卜</label>
            <input type="number" class="modal-input" v-model="state.createForm.amount" min="1" max="50000" placeholder="1-50000">
            <div class="form-hint">每次参与消耗的萝卜数</div>
          </div>
          <div>
            <label class="form-label">开奖人数</label>
            <input type="number" class="modal-input" v-model="state.createForm.number" min="0" max="5000" placeholder="0=时间开奖">
            <div class="form-hint">0为时间开奖，其他为人数开奖</div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <div class="lottery-form__grid">
          <div>
            <label class="form-label">最低萝卜数要求</label>
            <input type="number" class="modal-input" v-model="state.createForm.rule_carrot" min="0" max="50000" placeholder="0=无限制">
            <div class="form-hint">参与者的最低萝卜数</div>
          </div>
          <div>
            <label class="form-label">最低签到天数</label>
            <input type="number" class="modal-input" v-model="state.createForm.rule_sign" min="0" max="5000" placeholder="0=无限制">
            <div class="form-hint">参与者的最低签到天数</div>
          </div>
        </div>
      </div>
      <div class="lottery-form__prizes">
        <div class="lottery-form__prizes-header">
          <label class="lottery-form__prizes-title">奖品配置</label>
          <button type="button" class="btn-subtle" @click="addPrize">+ 新增奖品</button>
        </div>
        <div class="lottery-form__prizes-list">
          <div v-for="(prize, index) in state.prizes" :key="index" class="lottery-form__prize">
            <button class="modal-close modal-close--sm" @click="removePrize(index)" title="删除奖品">
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <div class="lottery-form__prize-header">奖品 {{ index + 1 }}</div>
            <div class="lottery-form__prize-grid">
              <div class="form-group">
                <label class="form-label">奖品名称</label>
                <input type="text" class="modal-input" v-model="prize.name" placeholder="例如 VIP 月卡" maxlength="50">
              </div>
              <div class="form-group">
                <label class="form-label">奖品数量</label>
                <input type="number" class="modal-input" v-model="prize.count" min="1" max="100">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">奖品简介</label>
              <input type="text" class="modal-input" v-model="prize.description" placeholder="可选，补充奖品说明" maxlength="200">
            </div>
            <div class="form-group">
              <label class="form-label">奖品内容</label>
              <textarea class="modal-input modal-textarea" v-model="prize.bodys" placeholder="每行一条自动发奖内容，例如兑换码、卡密或外链" rows="3"></textarea>
              <div class="form-hint">自动发奖内容存在时，条目数需与奖品数量一致。</div>
            </div>
          </div>
          <div v-if="state.prizes.length === 0" class="list-empty">点击"+ 新增奖品"添加奖品</div>
        </div>
      </div>
    </div>

    <div v-show="state.activeTab === 'winners'" class="lottery-winners">
      <div class="form-group">
        <label class="form-label">抽奖 ID</label>
        <input type="text" class="modal-input" v-model="state.winnerQueryId" placeholder="请输入抽奖 ID" maxlength="20">
      </div>
      <div class="lottery-winners__actions">
        <button class="modal-btn primary" @click="queryLotteryWinners">查询记录</button>
        <button type="button" class="btn-subtle" @click="cancelLottery">取消抽奖</button>
      </div>
      <div v-if="state.winnerList.length > 0 || state.winnerLoading" class="list-group" @scroll="handleLotteryWinnerScroll">
        <div v-for="winner in state.winnerList" :key="winner.user_id + '_' + winner.prize_name" class="list-row">
          <img v-if="winner.avatar" :src="winner.avatar" :alt="winner.username || winner.user_id" class="list-row__avatar" loading="lazy">
          <div v-else class="list-row__avatar-placeholder">{{ (winner.username || winner.user_id || '?').charAt(0).toUpperCase() }}</div>
          <div class="list-row__content">
            <div class="list-row__title">{{ winner.username || winner.user_id || '未知用户' }}</div>
            <div class="list-row__subtitle">ID: {{ winner.user_id || '-' }}</div>
          </div>
          <div class="list-row__action" style="text-align:right;">
            <div class="list-row__title">{{ winner.prize_name || '-' }}</div>
            <div class="list-row__subtitle">{{ formatRelativeTime(winner.win_at) }}</div>
          </div>
        </div>
        <div v-if="state.winnerLoading && state.winnerList.length > 0" class="loading-state loading-state--sm">
          <i class="fas fa-circle-notch fa-spin"></i></div>
      </div>
      <div v-else-if="state.winnerQueryId" class="list-empty">暂无中奖记录</div>
    </div>

    <template v-if="state.activeTab === 'create'" #footer>
      <button class="modal-btn secondary" @click="emit('close')">取消</button>
      <button class="modal-btn primary" @click="submitLottery" :disabled="state.isSubmitting">
        <i v-if="state.isSubmitting" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>创建抽奖</span>
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>

.lottery-form__time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lottery-form__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lottery-form__prizes {
  margin-top: 20px; padding-top: 20px;
  border-top: 0.5px solid var(--system-quaternary);
}
.lottery-form__prizes-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.lottery-form__prizes-title { font: var(--title-3-emphasized); color: var(--system-primary); }

.lottery-form__prizes-list { display: flex; flex-direction: column; gap: 16px; }
.lottery-form__prize {
  padding: 16px; background: var(--grouped-bg);
  border-radius: 20px; position: relative;
  display: flex; flex-direction: column; gap: 12px;
}
.lottery-form__prize .modal-input {
  background: var(--opaque-shelf-bg);
}
.lottery-form__prize .form-group {
  margin-bottom: 0;
}
.modal-close--sm {
  position: absolute; top: 12px; right: 12px; width: 28px; height: 28px;
}
.modal-close--sm svg { width: 10px; height: 10px; }
.lottery-form__prize-header {
  font: var(--title-3-emphasized);
  margin-bottom: 0; padding-right: 36px;
}
.lottery-form__prize-grid { display: grid; grid-template-columns: 1fr 120px; gap: 12px; }

.lottery-form__prizes-empty { padding: 20px; text-align: center; color: var(--system-tertiary); font: var(--body); }
.lottery-winners__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }

</style>
