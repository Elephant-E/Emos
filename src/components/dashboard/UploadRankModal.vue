<script setup>
import { reactive, watch } from 'vue'
import uploadApi from '@/api/uploadApi.js'
import { formatFileSize, normalizeList } from '@/utils/format.js'
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
    const data = await uploadApi.rank()
    state.rankList = normalizeList(data)
  } catch (error) {
    state.rankList = []
  } finally {
    state.loading = false
  }
}

watch(() => props.visible, (v) => {
  if (v) loadRank()
})
</script>

<template>
  <BaseModal :visible="visible" title="上传排行榜" size="xxl" @close="emit('close')">
    <RankList
      :items="state.rankList"
      :loading="state.loading"
      empty-text="暂无排行数据"
      rank-field="size"
      :format-rank="(user) => formatFileSize(user.size || 0)"
    />
  </BaseModal>
</template>
