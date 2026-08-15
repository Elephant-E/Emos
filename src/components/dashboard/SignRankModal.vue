<script setup>
import { reactive, watch } from 'vue'
import signApi from '@/api/signApi.js'
import { normalizeList } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'
import RankList from '@/components/common/RankList.vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])

const state = reactive({
  rankList: [],
  loading: false
})

watch(() => props.visible, (v) => {
  if (!v) {
    state.rankList = []
    state.loading = false
  }
})

const loadRank = async () => {
  state.loading = true
  try {
    const data = await signApi.rank()
    state.rankList = normalizeList(data)
  } catch (error) {
    state.rankList = []
  } finally {
    state.loading = false
  }
}

const formatSignRank = (user) => {
  const point = user.earn_point >= 0 ? `+${user.earn_point || 0}` : user.earn_point
  return `${point}🥕`
}

const formatSignDesc = (user) => {
  const parts = []
  if (user.continuous_days) parts.push(`连续 ${user.continuous_days} 天`)
  if (user.sign_content) parts.push(`"${user.sign_content}"`)
  return parts.join(' · ')
}

watch(() => props.visible, (v) => {
  if (v) loadRank()
})
</script>

<template>
  <BaseModal :visible="visible" title="签到排行榜" size="xxl" @close="emit('close')">
    <RankList
      :items="state.rankList"
      :loading="state.loading"
      empty-text="暂无排行数据"
      :desc-field="''"
      :format-rank="formatSignRank"
      :format-desc="formatSignDesc"
      wrap-desc
    />
  </BaseModal>
</template>
