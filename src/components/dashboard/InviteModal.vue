<script setup>
import { reactive, ref, watch } from 'vue'
import inviteApi from '@/api/inviteApi.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import { normalizeList } from '@/utils/format.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const props = defineProps({
  visible: Boolean,
  userInfo: Object
})
const emit = defineEmits(['close'])

const state = reactive({
  activeTab: 'my-info',
  myInfo: null,
  historyList: [],
  historyPage: 1,
  historyTotal: 0,
  historyPageSize: 15,
  historyLoading: false,
  historyHasMore: true
})

const showRemarkModal = ref(false)
const remarkForm = ref({ user_id: null, username: '', remark: '' })
const remarkSubmitting = ref(false)

watch(() => props.visible, (v) => {
  if (!v) {
    state.activeTab = 'my-info'
    state.myInfo = null
    state.historyList = []
    state.historyPage = 1
    state.historyTotal = 0
    state.historyLoading = false
    state.historyHasMore = true
  }
})

const tabs = [
  { value: 'my-info', label: '我的邀请' },
  { value: 'history', label: '邀请记录' }
]

const loadInviteMyInfo = async () => {
  try {
    const data = await inviteApi.info()
    state.myInfo = data
  } catch (error) {
    state.myInfo = null
  }
}

const loadInviteHistory = async (isLoadMore = false) => {
  if (state.historyLoading) return
  state.historyLoading = true
  try {
    const data = await inviteApi.history({ page: state.historyPage, page_size: state.historyPageSize })
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

const loadMoreInviteHistory = () => {
  if (state.historyHasMore && !state.historyLoading) {
    state.historyPage++
    loadInviteHistory(true)
  }
}

const revokeInvite = async (userId) => {
  if (!(await confirmDialog('确定要取消该邀请吗？', '确认', true))) return
  try {
    await inviteApi.revoke(userId)
    showToast('已取消邀请', 'success')
    state.historyPage = 1
    state.historyList = []
    state.historyHasMore = true
    await loadInviteHistory()
    await loadInviteMyInfo()
  } catch (error) {
    showToast(error.message || '取消失败', 'error')
  }
}

const openRemarkModal = (item) => {
  remarkForm.value = {
    user_id: item.user_id,
    username: item.username || '未知用户',
    remark: item.invite_remark || ''
  }
  showRemarkModal.value = true
}

const closeRemarkModal = () => {
  showRemarkModal.value = false
  remarkForm.value = { user_id: null, username: '', remark: '' }
}

const submitRemark = async () => {
  remarkSubmitting.value = true
  try {
    await inviteApi.updateRemark(remarkForm.value.user_id, remarkForm.value.remark.trim() || null)
    showToast('备注已更新', 'success')
    closeRemarkModal()
    state.historyPage = 1
    state.historyList = []
    await loadInviteHistory()
  } catch (error) {
    showToast(error.message || '更新失败', 'error')
  } finally {
    remarkSubmitting.value = false
  }
}

const handleInviteHistoryScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  if (scrollHeight - scrollTop - clientHeight < 50) loadMoreInviteHistory()
}

watch(() => props.visible, (v) => {
  if (v) {
    state.activeTab = 'my-info'
    state.myInfo = null
    state.historyPage = 1
    state.historyList = []
    state.historyHasMore = true
    loadInviteMyInfo()
  }
})

watch(() => state.activeTab, (tab) => {
  if (tab === 'history' && state.historyList.length === 0) loadInviteHistory()
})
</script>

<template>
  <BaseModal :visible="visible" title="邀请名额" size="xxl" @close="emit('close')">
    <SegmentedControl :tabs="tabs" v-model="state.activeTab" />
    <div v-show="state.activeTab === 'my-info'" class="invite-info">
      <div v-if="!state.myInfo" class="invite-info__skeleton">
        <div class="invite-info__skeleton-stats"></div>
        <div class="invite-info__skeleton-card"></div>
      </div>
      <div v-else class="invite-info__content">
        <div class="invite-info__stats">
          <div class="invite-info__stat">
            <div class="invite-info__stat-value">{{ state.myInfo.invite_count || 0 }}</div>
            <div class="invite-info__stat-label">累计邀请</div>
          </div>
          <div class="invite-info__stat">
            <div class="invite-info__stat-value">{{ userInfo?.roles?.includes('admin') ? '∞' : (state.myInfo.invite_remaining || 0) }}</div>
            <div class="invite-info__stat-label">剩余名额</div>
          </div>
        </div>
        <div v-if="state.myInfo.parent && state.myInfo.parent.pseudonym" class="invite-info__inviter">
          <i class="fas fa-user-friends invite-info__inviter-icon"></i>
          <div>
            <div class="invite-info__inviter-label">我的邀请人</div>
            <div class="invite-info__inviter-name">{{ state.myInfo.parent.pseudonym }} · {{ state.myInfo.invite_at || '-' }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-show="state.activeTab === 'history'" class="invite-history" @scroll="handleInviteHistoryScroll">
      <div v-if="state.historyList.length === 0 && state.historyLoading">
        <div v-for="i in 5" :key="i" class="list-row">
          <div class="skeleton-block" style="width:40px;height:40px;border-radius:50%;"></div>
          <div class="list-row__content">
            <div class="skeleton-block skeleton-w60"></div>
            <div class="skeleton-block skeleton-w40"></div>
          </div>
          <div class="skeleton-block" style="width:60px;height:28px;border-radius:8px;"></div>
        </div>
      </div>
      <div v-else-if="state.historyList.length === 0 && !state.historyLoading" class="list-empty">
        暂无邀请记录
      </div>
      <template v-else>
        <div v-for="(item, index) in state.historyList" :key="item.id || index" class="list-row">
          <div class="list-row__avatar-placeholder">{{ (item.username || '?').charAt(0).toUpperCase() }}</div>
          <div class="list-row__content">
            <div class="list-row__title">{{ item.username || '未知用户' }}</div>
            <div class="list-row__subtitle">
              {{ item.invite_at || '-' }}
              <template v-if="item.invite_remark"> · {{ item.invite_remark }}</template>
            </div>
          </div>
          <div class="cloud-buttons list-row__action">
            <button class="cloud-btn" @click="openRemarkModal(item)" title="修改备注"><i class="fas fa-pen"></i></button>
            <button class="cloud-btn cloud-btn--danger" @click="revokeInvite(item.user_id)" title="取消邀请"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div v-if="state.historyLoading && state.historyList.length > 0" class="loading-state loading-state--sm">
          <i class="fas fa-circle-notch fa-spin"></i></div>
      </template>
    </div>
  </BaseModal>
  
  <BaseModal :visible="showRemarkModal" title="修改邀请备注" @close="closeRemarkModal">
    <div class="form-group">
      <label class="form-label">用户</label>
      <div style="font: var(--body); color: var(--system-primary);">{{ remarkForm.username }}</div>
    </div>
    <div class="form-group">
      <label class="form-label">备注</label>
      <input v-model="remarkForm.remark" class="modal-input" type="text" placeholder="输入备注（可选）" maxlength="50" />
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeRemarkModal">取消</button>
      <button class="modal-btn primary" @click="submitRemark" :disabled="remarkSubmitting">
        <i v-if="remarkSubmitting" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>保存</span>
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.invite-info__skeleton { display: flex; flex-direction: column; gap: 16px; }
.invite-info__skeleton-stats { height: 80px; background: var(--system-quaternary); border-radius: 20px; }
.invite-info__skeleton-card { height: 60px; background: var(--system-quaternary); border-radius: 20px; }
.invite-info__stats {
  background: var(--grouped-bg); border-radius: 20px;
  padding: 24px; margin-bottom: 16px; display: flex; justify-content: space-around; text-align: center;
}
.invite-info__stat-value { color: var(--key-color); font: var(--title-1-emphasized); margin-bottom: 4px; }
.invite-info__stat-label { color: var(--system-tertiary); font: var(--callout); }
.invite-info__inviter {
  background: var(--grouped-bg); border-radius: 20px;
  padding: 16px 24px; display: flex; align-items: center; gap: 12px;
}
.invite-info__inviter-icon { color: var(--key-color); font-size: 1.2rem; }
.invite-info__inviter-label { color: var(--system-tertiary); font: var(--callout); margin-bottom: 2px; }
.invite-info__inviter-name { color: var(--system-primary); font: var(--body-emphasized); }
.invite-history { overflow-y: auto; }

</style>
