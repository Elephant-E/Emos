<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import lineApi from '@/api/lineApi.js'
import { formatDate, copyToClipboard } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const appStore = useAppStore()

const currentFilter = ref('all')
const lines = ref([])
const isLoading = ref(false)
const isModalVisible = ref(false)
const formData = ref({ name: '', url: '', tagline: '' })
const isAdding = ref(false)

const filterTabs = [
  { value: 'all', label: '全部线路' },
  { value: 'mine', label: '我的线路' }
]

const filteredLines = computed(() => {
  if (currentFilter.value === 'mine') {
    return lines.value.filter(line => line.is_self)
  }
  return lines.value
})

const loadLines = async () => {
  isLoading.value = true
  try {
    const response = await lineApi.list()
    lines.value = response || []
  } catch (error) {
    showToast('加载线路失败: ' + error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

const openAddModal = () => {
  formData.value = { name: '', url: '', tagline: '' }
  isModalVisible.value = true
}

const closeAddModal = () => {
  isModalVisible.value = false
  formData.value = { name: '', url: '', tagline: '' }
}

const submitAddLine = async () => {
  if (isAdding.value) return
  const { name, url, tagline } = formData.value
  if (!name || !url) { showToast('请填写线路名称和地址', 'error'); return }
  if (!url.startsWith('https://')) { showToast('线路地址必须以 https:// 开头', 'error'); return }
  isAdding.value = true
  try {
    await lineApi.add({ name, url, tagline })
    showToast('添加成功', 'success')
    closeAddModal()
    await loadLines()
  } catch (error) {
    showToast('添加失败: ' + error.message, 'error')
  } finally {
    isAdding.value = false
  }
}

const deleteLine = async (id, isSelf) => {
  const userInfo = appStore.userInfo
  const isAdmin = userInfo?.roles?.includes('admin')
  if (!isAdmin && !isSelf) { showToast('您没有权限删除该线路', 'error'); return }
  if (!(await confirmDialog('确定要删除该线路吗？', '确认', true))) return
  try {
    await lineApi.delete(id)
    showToast('删除成功', 'success')
    await loadLines()
  } catch (error) {
    showToast('删除失败: ' + error.message, 'error')
  }
}

const copyLineUrl = async (url) => {
  const success = await copyToClipboard(url)
  if (success) showToast('已复制线路地址', 'success')
  else showToast('复制失败', 'error')
}

onMounted(() => { loadLines() })
</script>

<template>
  <header class="page-header">
    <h1 class="page-title">线路管理</h1>

  </header>

  <div class="filter-bar">
    <SegmentedControl :tabs="filterTabs" v-model="currentFilter" />
    <div class="cloud-buttons">
      <button class="cloud-btn" @click="openAddModal" title="添加线路">
        <svg viewBox="0 0 28 28" width="28" height="28"><path fill="var(--system-primary)" d="M14 6a1 1 0 011 1v6h6a1 1 0 010 2h-6v6a1 1 0 01-2 0v-6H7a1 1 0 010-2h6V7a1 1 0 011-1z"/></svg>
      </button>
    </div>
  </div>

  <div v-if="isLoading" class="loading-state">
    <i class="fas fa-circle-notch fa-spin"></i>
    </div>

  <div v-else-if="filteredLines.length === 0" class="empty-state">
    暂无线路数据
  </div>

  <div v-else class="line-grid">
    <div
      v-for="line in filteredLines"
      :key="line.id"
      class="line-card"
      @click="copyLineUrl(line.url)"
    >
      <div class="line-card-header">
        <span class="line-name">{{ line.name }}</span>
        <div class="line-card-header__actions">
          <span v-if="line.is_self" class="self-badge">
            <i class="fas fa-check"></i> 我的
          </span>
          <div v-if="appStore.userInfo?.roles?.includes('admin') || line.is_self" class="cloud-buttons">
            <button class="cloud-btn cloud-btn--danger" @click.stop="deleteLine(line.id, line.is_self)" title="删除">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="line-url">
        <i class="fas fa-link"></i>{{ line.url }}
      </div>

      <div v-if="line.tagline" class="line-tagline">
        <i class="fas fa-quote-right"></i> {{ line.tagline }}
      </div>

      <div class="line-meta">
        <div class="meta-item">
          ID: {{ line.id }}
        </div>
        <div class="meta-item">
          {{ formatDate(line.created_at) }}
        </div>
      </div>
    </div>
  </div>

  <BaseModal :visible="isModalVisible" title="添加线路" @close="closeAddModal">
    <div class="form-group">
      <label class="form-label">线路名称</label>
      <input type="text" class="modal-input" v-model="formData.name" placeholder="建议使用自己的 ID 或备注名">
    </div>
    <div class="form-group">
      <label class="form-label">线路地址</label>
      <input type="text" class="modal-input" v-model="formData.url" placeholder="https:// 开头，无需尾部斜杠">
    </div>
    <div class="form-group">
      <label class="form-label">一句话简介</label>
      <input type="text" class="modal-input" v-model="formData.tagline" placeholder="例如：电信优选、低延迟节点等">
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeAddModal">取消</button>
      <button class="modal-btn primary" @click="submitAddLine" :disabled="isAdding">
        <i v-if="isAdding" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>提交</span>
      </button>
    </template>
   </BaseModal>
</template>

<style scoped>
.line-card-header__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
