<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import lineApi from '@/api/lineApi.js'
import { formatDate, copyToClipboard } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'

const appStore = useAppStore()

// ================= 状态 =================
const currentFilter = ref('all')
const lines = ref([])
const isLoading = ref(false)

// 模态框状态
const isModalVisible = ref(false)
const formData = ref({
  name: '',
  url: '',
  tagline: ''
})

const isAdding = ref(false)

// ================= 计算属性 =================
const filteredLines = computed(() => {
  if (currentFilter.value === 'mine') {
    return lines.value.filter(line => line.is_self)
  }
  return lines.value
})

// ================= 方法 =================

// 加载线路列表
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

// 切换筛选器
const setFilter = (filter) => {
  currentFilter.value = filter
}

// 打开添加模态框
const openAddModal = () => {
  // 清空表单
  formData.value = {
    name: '',
    url: '',
    tagline: ''
  }
  
  isModalVisible.value = true
}

// 关闭添加模态框
const closeAddModal = () => {
  isModalVisible.value = false
}

// 提交添加线路
const submitAddLine = async () => {
  if (isAdding.value) return
  
  const { name, url, tagline } = formData.value
  
  // 验证
  if (!name || !url) {
    showToast('请填写线路名称和地址', 'error')
    return
  }
  
  if (!url.startsWith('https://')) {
    showToast('线路地址必须以 https:// 开头', 'error')
    return
  }
  
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

// 删除线路
const deleteLine = async (id, isSelf) => {
  // 检查权限：非管理员只能删除自己的线路
  const userInfo = appStore.userInfo
  const isAdmin = userInfo?.roles?.includes('admin')
  
  if (!isAdmin && !isSelf) {
    showToast('您没有权限删除该线路', 'error')
    return
  }
  
  if (!confirm('确定要删除该线路吗？')) return
  
  try {
    await lineApi.delete(id)
    showToast('删除成功', 'success')
    await loadLines()
  } catch (error) {
    showToast('删除失败: ' + error.message, 'error')
  }
}

// 复制线路地址
const copyLineUrl = async (url) => {
  const success = await copyToClipboard(url)
  if (success) {
    showToast('已复制线路地址', 'success')
  } else {
    showToast('复制失败', 'error')
  }
}

// ================= 生命周期 =================
onMounted(() => {
  loadLines()
})
</script>

<template>
  <!-- MainLayout 已提供 main-wrapper -->
  <header class="page-header">
    <h1 class="page-title">线路管理</h1>
    <p class="page-subtitle">浏览与管理代理线路</p>
  </header>
    
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-group">
        <button 
          class="filter-chip" 
          :class="{ active: currentFilter === 'all' }"
          @click="setFilter('all')"
        >
          <i class="fas fa-globe"></i> 全部线路
        </button>
        <button 
          class="filter-chip" 
          :class="{ active: currentFilter === 'mine' }"
          @click="setFilter('mine')"
        >
          <i class="fas fa-user"></i> 我的线路
        </button>
      </div>
      <button class="action-btn-primary" @click="openAddModal" title="添加线路">
        <i class="fas fa-plus"></i>
      </button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <i class="fas fa-circle-notch"></i>
      <p>加载中...</p>
    </div>
    
    <!-- 空状态 -->
    <div v-else-if="filteredLines.length === 0" class="empty-state">
      暂无线路数据
    </div>
    
    <!-- 线路网格 -->
    <div v-else class="line-grid">
      <div 
        v-for="line in filteredLines" 
        :key="line.id"
        class="line-card"
        @click="copyLineUrl(line.url)"
      >
        <div class="line-card-header">
          <span class="line-name">{{ line.name }}</span>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span v-if="line.is_self" class="self-badge">
              <i class="fas fa-check"></i> 我的
            </span>
            <button 
              v-if="appStore.userInfo?.roles?.includes('admin') || line.is_self"
              class="delete-icon"
              @click.stop="deleteLine(line.id, line.is_self)"
              title="删除"
            >
              <i class="fas fa-trash"></i>
            </button>
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
            <i class="fas fa-hashtag"></i> ID: {{ line.id }}
          </div>
          <div class="meta-item">
            <i class="far fa-clock"></i> {{ formatDate(line.created_at) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 添加线路模态框 -->
    <div 
      class="modal-overlay" 
      id="addLineModal"
      :class="{ show: isModalVisible }"
      @click.self="closeAddModal"
    >
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">添加线路</span>
          <button class="modal-close" @click="closeAddModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">线路名称</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="formData.name"
              placeholder="建议使用自己的 ID 或备注名"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">线路地址</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="formData.url"
              placeholder="https:// 开头，无需尾部斜杠"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">一句话简介</label>
            <input 
              type="text" 
              class="modal-input" 
              v-model="formData.tagline"
              placeholder="例如：电信优选、低延迟节点等"
            >
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="closeAddModal">取消</button>
          <button 
            class="modal-btn primary" 
            @click="submitAddLine"
            :disabled="isAdding"
          >
            <span v-if="!isAdding">提交</span>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
          </button>
        </div>
      </div>
    </div>
</template>

<style scoped>
/* 样式在全局CSS中定义 */
</style>
