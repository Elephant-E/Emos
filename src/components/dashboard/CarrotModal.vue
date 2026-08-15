<script setup>
import { reactive, watch } from 'vue'
import carrotApi from '@/api/carrotApi.js'
import { formatDateTime, formatDate, normalizeList } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import RankList from '@/components/common/RankList.vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])

const state = reactive({
  activeTab: 'history',
  historyList: [],
  historyPage: 1,
  historyTotal: 0,
  historyPageSize: 15,
  historyLoading: false,
  historyHasMore: true,
  rankList: [],
  rankLoading: false
})

watch(() => props.visible, (v) => {
  if (!v) {
    state.activeTab = 'history'
    state.historyList = []
    state.historyPage = 1
    state.historyTotal = 0
    state.historyLoading = false
    state.historyHasMore = true
    state.rankList = []
    state.rankLoading = false
  }
})

const tabs = [
  { value: 'history', label: '变化记录' },
  { value: 'rank', label: '排行榜' }
]

const switchCarrotTab = (tab) => {
  state.activeTab = tab
  if (tab === 'rank' && state.rankList.length === 0) loadCarrotRank()
}

const loadCarrotHistory = async (isLoadMore = false) => {
  if (state.historyLoading) return
  if (!isLoadMore && !state.historyHasMore && state.historyPage > 1) return
  state.historyLoading = true
  try {
    const data = await carrotApi.history({ page: state.historyPage, page_size: state.historyPageSize })
    const items = normalizeList(data)
    if (isLoadMore) {
      state.historyList = [...state.historyList, ...items]
    } else {
      state.historyList = items
    }
    state.historyTotal = data.total || state.historyList.length
    state.historyHasMore = state.historyPage * state.historyPageSize < state.historyTotal
  } catch (error) {
    if (!isLoadMore) state.historyList = []
  } finally {
    state.historyLoading = false
  }
}

const loadMoreCarrotHistory = () => {
  if (state.historyHasMore && !state.historyLoading) {
    state.historyPage++
    loadCarrotHistory(true)
  }
}

const loadCarrotRank = async () => {
  state.rankLoading = true
  try {
    const data = await carrotApi.rank()
    state.rankList = normalizeList(data)
  } catch (error) {
    state.rankList = []
  } finally {
    state.rankLoading = false
  }
}

const handleCarrotHistoryScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  if (scrollHeight - scrollTop - clientHeight < 50) loadMoreCarrotHistory()
}

watch(() => props.visible, (v) => {
  if (v) {
    state.activeTab = 'history'
    state.historyPage = 1
    state.historyList = []
    state.historyHasMore = true
    state.rankList = []
    loadCarrotHistory()
  }
})
</script>

<template>
  <BaseModal :visible="visible" title="萝卜中心" size="xxl" @close="emit('close')">
    <SegmentedControl :tabs="tabs" :model-value="state.activeTab" @update:model-value="switchCarrotTab" />
    <div v-show="state.activeTab === 'history'" class="carrot-history" @scroll="handleCarrotHistoryScroll">
      <div v-if="state.historyList.length === 0 && state.historyLoading">
        <div v-for="i in 5" :key="i" class="list-row">
          <div class="list-row__icon skeleton-block" style="background:var(--system-quaternary);"></div>
          <div class="list-row__content">
            <div class="skeleton-block skeleton-w60"></div>
            <div class="skeleton-block skeleton-w40"></div>
          </div>
          <div class="skeleton-block" style="width:50px;height:18px;"></div>
        </div>
      </div>
      <div v-else-if="state.historyList.length === 0 && !state.historyLoading" class="list-empty">
        暂无变化记录
      </div>
      <template v-else>
        <div
          v-for="(item, index) in state.historyList"
          :key="item.id || index"
          class="list-row"
        >
          <div class="list-row__icon" :class="item.type === 'earn' ? 'carrot-history__icon--earn' : 'carrot-history__icon--spend'">
            <i :class="item.type === 'earn' ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
          </div>
          <div class="list-row__content">
            <div class="list-row__title">{{ item.trigger_type_string || '未知类型' }}</div>
            <div class="list-row__subtitle">{{ formatDateTime(item.created_at) }}</div>
          </div>
          <div class="list-row__value" :class="item.type === 'earn' ? 'list-row__value--positive' : 'list-row__value--negative'">
            {{ item.type === 'earn' ? '+' : '-' }}{{ item.point }}
          </div>
        </div>
        <div v-if="state.historyLoading && state.historyList.length > 0" class="loading-state loading-state--sm">
          <i class="fas fa-circle-notch fa-spin"></i></div>
      </template>
    </div>
    <div v-show="state.activeTab === 'rank'">
      <RankList
        :items="state.rankList"
        :loading="state.rankLoading"
        empty-text="暂无排行数据"
        rank-field="carrot"
      />
    </div>
  </BaseModal>
</template>

<style scoped>
.carrot-history { overflow-y: auto; }

.carrot-history__icon--earn { background: rgba(48, 209, 88, 0.12); }
.carrot-history__icon--earn i { color: var(--success); }
.carrot-history__icon--spend { background: rgba(255, 69, 58, 0.12); }
.carrot-history__icon--spend i { color: var(--danger); }
</style>
