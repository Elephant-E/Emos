<script setup>
import { reactive, computed, watch, ref } from 'vue'
import viewingApi from '@/api/viewingApi.js'
import { analyzeVideoRequests, getAbnormalInfo } from '@/utils/videoRequestAnalyzer.js'
import { normalizeList } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])

const state = reactive({
  list: [],
  page: 1,
  total: 0,
  pageSize: 15,
  loading: false,
  loadingMore: false,
  hasMore: true
})

watch(() => props.visible, (v) => {
  if (!v) {
    state.list = []
    state.page = 1
    state.total = 0
    state.loading = false
    state.loadingMore = false
    state.hasMore = true
  }
})

const abnormalMap = computed(() => analyzeVideoRequests(state.list))

const loadData = async (isLoadMore = false) => {
  if (isLoadMore) {
    state.loadingMore = true
  } else {
    state.loading = true
    state.page = 1
    state.list = []
    state.hasMore = true
  }
  try {
    const data = await viewingApi.requests({ page: state.page, page_size: state.pageSize })
    const items = normalizeList(data)
    if (isLoadMore) {
      state.list = [...state.list, ...items]
    } else {
      state.list = items
    }
    state.total = data.total || items.length
    state.hasMore = state.page * state.pageSize < state.total
  } catch (error) {
    if (!isLoadMore) state.list = []
  } finally {
    state.loading = false
    state.loadingMore = false
  }
}

const loadMore = () => {
  if (state.loadingMore || !state.hasMore) return
  state.page++
  loadData(true)
}

const handleScroll = (e) => {
  const el = e.target
  if (state.loadingMore || !state.hasMore) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
    loadMore()
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    state.page = 1
    loadData()
  }
})
</script>

<template>
  <BaseModal :visible="visible" title="请求记录" size="xxl" @close="emit('close')">
    <div class="viewing-list" @scroll="handleScroll">
      <div v-if="state.loading">
        <div v-for="i in 5" :key="i" class="list-row">
          <div class="list-row__content">
            <div class="skeleton-block" style="width:50%;height:16px;"></div>
            <div class="skeleton-block" style="width:30%;height:10px;"></div>
          </div>
          <div class="skeleton-block" style="width:80px;height:14px;"></div>
        </div>
      </div>
      <div v-else-if="state.list.length === 0" class="list-empty">
        <i class="fas fa-inbox"></i>
        <p>暂无请求记录</p>
      </div>
      <template v-else>
        <div v-for="item in state.list" :key="item.media_id || item.id" class="list-row viewing-list__item">
          <div class="list-row__content">
            <div class="list-row__title viewing-list__title--wrap">{{ item.video_title }}</div>
            <div class="list-row__subtitle viewing-list__meta">
              <span class="viewing-list__tag"><i class="fas fa-clock"></i> {{ item.time }}</span>
              <span class="viewing-list__tag"><i class="fas fa-globe"></i> {{ item.ip }}</span>
              <span class="viewing-list__tag"><i class="fas fa-desktop"></i> {{ item.ua }}</span>
              <span v-if="item.is_proxy" class="viewing-list__tag viewing-list__tag--proxy"><i class="fas fa-server"></i> 代理</span>
            </div>
            <div v-if="getAbnormalInfo(item, abnormalMap)" class="viewing-list__warning" :title="getAbnormalInfo(item, abnormalMap).reason">
              <i class="fas fa-exclamation-triangle"></i>
              {{ getAbnormalInfo(item, abnormalMap).reason }}
            </div>
          </div>
          <div v-if="item.range" class="list-row__value viewing-list__range">{{ item.range }}</div>
        </div>
      </template>
       <div v-if="state.loadingMore" class="loading-state loading-state--sm">
         <i class="fas fa-circle-notch fa-spin"></i>
         </div>
      <div v-else-if="!state.hasMore && state.list.length > 0" class="viewing-list__end">
        已加载全部记录
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.viewing-list { overflow-y: auto; }


.viewing-list__item {
  align-items: center;
  padding: 12px 14px;
}

.viewing-list__item .list-row__content {
  overflow: visible;
}

.viewing-list__title--wrap {
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}

.viewing-list__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
  width: 100%;
}

.viewing-list__tag {
  font: var(--callout);
  color: var(--system-tertiary);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.viewing-list__tag i {
  font-size: 0.6rem;
  opacity: 0.7;
}

.viewing-list__tag--proxy {
  color: var(--key-color);
}

.viewing-list__warning {
  font: var(--callout-emphasized);
  color: var(--warning);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.viewing-list__range {
  font-family: monospace;
  color: var(--system-tertiary);
}

.viewing-list__end { text-align: center; padding: 0.75rem; color: var(--system-tertiary); font: var(--callout); }
</style>
