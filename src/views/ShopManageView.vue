<template>
  <!-- 未开通、审核中或已禁用状态 -->
  <div v-if="!sellerInfo || sellerInfo.status === 'default' || sellerInfo.status === 'examine' || sellerInfo.status === 'disable'" class="empty-seller-container">
    <div class="bento-card empty-state-card">
      <!-- 介绍视图 -->
      <transition name="fade-slide" mode="out-in">
        <!-- 加载中 - 先显示骨架屏或loading -->
        <div v-if="isLoading" key="loading" class="loading-view">
          <div class="loading-state">
            <i class="fas fa-circle-notch fa-spin"></i>
            </div>
        </div>
        
        <!-- 介绍视图 -->
        <div v-else-if="!showApplyForm && sellerInfo?.status !== 'examine' && sellerInfo?.status !== 'disable'" key="intro" class="intro-view">
          <div class="empty-icon-wrapper">
            <div class="empty-icon">
              <i class="fas fa-store"></i>
            </div>
          </div>
          
          <h2 class="empty-title">开启您的店铺之旅</h2>
          <p class="empty-subtitle">成为认证商家，享受专属权益</p>
          
          <div class="features-grid">
            <div class="feature-item">
              <div class="feature-icon">
                <i class="fas fa-palette"></i>
              </div>
              <div class="feature-content">
                <h4>个性化店铺</h4>
                <p>自定义名称、描述和封面</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <i class="fas fa-box-open"></i>
              </div>
              <div class="feature-content">
                <h4>商品管理</h4>
                <p>灵活上架和管理商品</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <i class="fas fa-receipt"></i>
              </div>
              <div class="feature-content">
                <h4>订单处理</h4>
                <p>实时接收和处理订单</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <i class="fas fa-chart-line"></i>
              </div>
              <div class="feature-content">
                <h4>数据分析</h4>
                <p>查看销售数据和趋势</p>
              </div>
            </div>
          </div>
          
          <button class="btn-primary btn-apply" @click="applySeller">
            <i class="fas fa-rocket"></i>
            <span>立即开通店铺</span>
          </button>
        </div>
        
        <!-- 申请表单视图 -->
        <div v-else-if="sellerInfo?.status !== 'examine' && sellerInfo?.status !== 'disable'" key="form" class="apply-form-view">
          <div class="form-header">
            <button class="back-btn" @click="closeApplyForm">
              <i class="fas fa-arrow-left"></i>
            </button>
            <h2 class="form-title">申请开通店铺</h2>
            <div class="form-spacer"></div>
          </div>
          
          <div class="form-content">
            <div class="form-group">
              <label class="form-label">
                店铺名称
                <span class="form-hint">(最多30字)</span>
              </label>
              <input 
                v-model="applyForm.name"
                type="text"
                class="modal-input"
                placeholder="请输入店铺名称"
                maxlength="30"
                :class="{ error: formErrors.name }"
              >
              <p v-if="formErrors.name" class="error-message">{{ formErrors.name }}</p>
            </div>
            
            <div class="form-group">
              <label class="form-label">
                店铺简介
                <span class="form-hint">(最多200字)</span>
              </label>
              <textarea 
                v-model="applyForm.description"
                class="modal-textarea"
                placeholder="请简单介绍您的店铺"
                maxlength="200"
                rows="5"
                :class="{ error: formErrors.description }"
              ></textarea>
              <div class="textarea-footer">
                <p v-if="formErrors.description" class="error-message">{{ formErrors.description }}</p>
                <p class="char-count">{{ applyForm.description.length }}/200</p>
              </div>
            </div>
            
            <button class="btn-primary btn-submit" @click="submitApply">
              <i class="fas fa-paper-plane"></i>
              <span>提交申请</span>
            </button>
          </div>
        </div>
        
        <!-- 审核中视图 -->
        <div v-else-if="sellerInfo?.status === 'examine'" key="examine" class="examine-view">
          <div class="status-icon-wrapper">
            <div class="status-icon examine">
              <i class="fas fa-clock"></i>
            </div>
          </div>
          
          <h2 class="empty-title">审核中</h2>
          <p class="empty-subtitle">您的店铺申请正在审核中，请耐心等待</p>
          
          <div class="status-tips">
            <h4>温馨提示</h4>
            <ul>
              <li>审核结果将通过系统通知告知</li>
              <li>审核期间请勿重复提交申请</li>
              <li>如有疑问请联系客服</li>
            </ul>
          </div>
        </div>
        
        <!-- 已禁用视图 -->
        <div v-else-if="sellerInfo?.status === 'disable'" key="disable" class="disable-view">
          <div class="status-icon-wrapper">
            <div class="status-icon disable">
              <i class="fas fa-ban"></i>
            </div>
          </div>
          
          <h2 class="empty-title">店铺已禁用</h2>
          <p class="empty-subtitle">您的店铺已被禁用，无法进行管理操作</p>
          
          <div class="status-actions">
            <button class="btn-secondary btn-contact" @click="contactAdmin">
              <i class="fas fa-user-shield"></i>
              <span>联系管理</span>
            </button>
          </div>
        </div>
      </transition>
    </div>
  </div>

  <!-- 已开通店铺状态 -->
  <template v-else>
    <!-- 页面标题 -->
    <header class="page-header">
      <h1 class="page-title">商户管理</h1>

    </header>
    <div v-if="sellerInfo" class="seller-info-card-wrap">
      <SellerInfoCard :name="sellerInfo.name" :description="sellerInfo.description || ''" :cover-url="sellerInfo.cover_url || ''">
        <template #action>
          <button class="action-icon btn-edit-seller" @click="openEditModal">
            <i class="fas fa-pen"></i>
          </button>
        </template>
      </SellerInfoCard>
    </div>

    <SellerStats :stats="manageStats" :columns="4" />

    <!-- 管理功能Tab切换 -->
    <SegmentedControl :tabs="manageTabs" v-model="activeTab" full />

    <!-- 商品管理 -->
    <ProductManageTab 
      :visible="activeTab === 'products'" 
      :seller-info="sellerInfo" 
      :categories="categoryTabRef?.categories || []" 
      ref="productTabRef"
      @update-stats="onUpdateStats"
      @reload-categories="reloadCategories"
    />
    <CategoryManageTab 
      :visible="activeTab === 'categories'" 
      :seller-info="sellerInfo" 
      ref="categoryTabRef"
      @update-stats="onUpdateStats"
      @reload-products="reloadProducts"
    />
    <OrderManageTab 
      :visible="activeTab === 'orders'" 
      ref="orderTabRef"
      @update-stats="onUpdateStats"
    />
  </template>

  <!-- 编辑店铺信息模态框 -->
  <BaseModal :visible="showEditModal" title="编辑店铺信息" @close="closeEditModal">
    <div class="form-group">
      <label class="form-label">店铺头像</label>
      <ImageUploader 
        :model-value="editCoverUrl"
        @change="(data) => { editCoverUrl = data.url || ''; editForm.cover_url = data.url || '' }"
        :max-size="5 * 1024 * 1024"
        placeholder-text="点击选择图片"
        hint-text="支持 JPG、PNG，≤5MB"
      />
    </div>
    <div class="form-group">
      <label class="form-label">店铺名称</label>
      <input v-model="editForm.name" type="text" class="modal-input" placeholder="请输入店铺名称" maxlength="30">
    </div>
    <div class="form-group">
      <label class="form-label">店铺简介</label>
      <textarea v-model="editForm.description" class="modal-textarea" placeholder="请简单介绍您的店铺" maxlength="200" rows="4"></textarea>
    </div>
    <template #footer>
      <button class="modal-btn secondary" @click="closeEditModal">取消</button>
      <button class="modal-btn primary" @click="saveEdit" :disabled="isSaving">
        <i v-if="isSaving" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>保存</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { animateValue } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import shopApi from '@/api/shopApi.js'
import ImageUploader from '@/components/ImageUploader.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import ProductManageTab from '@/components/shop/ProductManageTab.vue'
import CategoryManageTab from '@/components/shop/CategoryManageTab.vue'
import OrderManageTab from '@/components/shop/OrderManageTab.vue'
import SellerInfoCard from '@/components/shop/SellerInfoCard.vue'
import SellerStats from '@/components/shop/SellerStats.vue'

const appStore = useAppStore()

const sellerInfo = ref(null)
const isLoading = ref(true)
const showApplyForm = ref(false)
const applyForm = ref({ name: '', description: '' })
const formErrors = ref({ name: '', description: '' })
const activeTab = ref('products')

const manageTabs = [
  { value: 'products', label: '商品管理' },
  { value: 'categories', label: '分类管理' },
  { value: 'orders', label: '订单管理' }
]

const showEditModal = ref(false)
const originalCover = ref('')
const isSaving = ref(false)
const editForm = ref({ name: '', description: '', cover_url: '' })
const editCoverUrl = ref('')

const stats = ref({ productCount: 0, categoryCount: 0, orderCount: 0, totalSales: 0 })
const animatedStats = ref({ productCount: 0, categoryCount: 0, orderCount: 0, totalSales: 0 })

const manageStats = computed(() => [
  { value: animatedStats.value.productCount, label: '商品' },
  { value: animatedStats.value.categoryCount, label: '分类' },
  { value: animatedStats.value.orderCount, label: '订单' },
  { value: animatedStats.value.totalSales, label: '总销量' }
])

const productTabRef = ref(null)
const categoryTabRef = ref(null)
const orderTabRef = ref(null)

const animateStats = () => {
  animateValue(0, stats.value.productCount, 800, (v) => { animatedStats.value.productCount = v })
  animateValue(0, stats.value.categoryCount, 600, (v) => { animatedStats.value.categoryCount = v })
  animateValue(0, stats.value.orderCount, 800, (v) => { animatedStats.value.orderCount = v })
  animateValue(0, stats.value.totalSales, 1200, (v) => { animatedStats.value.totalSales = v })
}

const onUpdateStats = (newStats) => {
  if (newStats) {
    Object.assign(stats.value, newStats)
    animateStats()
  }
}

const reloadCategories = async () => {
  if (categoryTabRef.value) {
    await categoryTabRef.value.loadCategories()
  }
}

const reloadProducts = async () => {
  if (productTabRef.value) {
    await productTabRef.value.loadProducts()
  }
}

const loadSellerInfo = async () => {
  try {
    isLoading.value = true
    const res = await shopApi.getSellerBase()
    if (res) sellerInfo.value = res
  } catch (error) {
    showToast('获取商户信息失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const loadStats = async () => {
  stats.value = { productCount: 0, categoryCount: 0, orderCount: 0, totalSales: 0 }
}

const applySeller = () => {
  showApplyForm.value = true
  applyForm.value = { name: '', description: '' }
  formErrors.value = { name: '', description: '' }
}

const closeApplyForm = () => {
  showApplyForm.value = false
}

const validateForm = () => {
  let isValid = true
  formErrors.value = { name: '', description: '' }
  if (!applyForm.value.name.trim()) {
    formErrors.value.name = '请输入店铺名称'
    isValid = false
  } else if (applyForm.value.name.length > 30) {
    formErrors.value.name = '店铺名称不能超过30字'
    isValid = false
  }
  if (!applyForm.value.description.trim()) {
    formErrors.value.description = '请输入店铺简介'
    isValid = false
  } else if (applyForm.value.description.length > 200) {
    formErrors.value.description = '店铺简介不能超过200字'
    isValid = false
  }
  return isValid
}

const submitApply = async () => {
  if (!validateForm()) return
  try {
    showToast('正在提交申请...', 'info')
    await shopApi.applySeller({
      name: applyForm.value.name.trim(),
      description: applyForm.value.description.trim()
    })
    showToast('申请成功，请等待审核', 'success')
    await loadSellerInfo()
  } catch (error) {
    showToast(error.message || '申请失败，请重试', 'error')
  }
}

const contactAdmin = () => {
  showToast('请联系系统管理员', 'info')
}

const openEditModal = () => {
  editForm.value = {
    name: sellerInfo.value.name || '',
    description: sellerInfo.value.description || '',
    cover_url: sellerInfo.value.cover_url || ''
  }
  editCoverUrl.value = sellerInfo.value.cover_url || ''
  originalCover.value = sellerInfo.value.cover_url || ''
  formErrors.value = { name: '', description: '', cover_url: '' }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = { name: '', description: '', cover_url: '' }
  editCoverUrl.value = ''
  originalCover.value = ''
  formErrors.value = { name: '', description: '', cover_url: '' }
}

const validateEditForm = () => {
  let isValid = true
  formErrors.value = { name: '', description: '', cover_url: '' }
  if (!originalCover.value && !editForm.value.cover_url) {
    showToast('请上传店铺头像', 'error')
    isValid = false
  }
  if (!editForm.value.name.trim()) {
    showToast('请输入店铺名称', 'error')
    isValid = false
  } else if (editForm.value.name.length > 30) {
    showToast('店铺名称不能超过30字', 'error')
    isValid = false
  }
  if (editForm.value.description.length > 200) {
    showToast('店铺简介不能超过200字', 'error')
    isValid = false
  }
  return isValid
}

const saveEdit = async () => {
  if (!validateEditForm()) return
  try {
    isSaving.value = true
    await shopApi.updateSeller({
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim(),
      cover_url: editForm.value.cover_url
    })
    showToast('保存成功', 'success')
    await loadSellerInfo()
    closeEditModal()
  } catch (error) {
    showToast(error.message || '保存失败，请重试', 'error')
  } finally {
    isSaving.value = false
  }
}

const handleShopCoverChange = (data) => {
  editForm.value.cover_url = data.url || ''
  editCoverUrl.value = data.url || ''
}

const loadAllData = async () => {
  await loadSellerInfo()
  await loadStats()
  if (sellerInfo.value && sellerInfo.value.status === 'pass') {
    await Promise.all([
      categoryTabRef.value?.loadCategories(),
      productTabRef.value?.loadProducts(),
      orderTabRef.value?.loadOrders()
    ])
  }
}

watch(() => appStore.userInfo, async (newUserInfo) => {
  if (newUserInfo) {
    sellerInfo.value = null
    await loadAllData()
  }
}, { immediate: false })

onMounted(async () => {
  await loadAllData()
})
</script>

<style scoped>
.empty-seller-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 140px);
  padding: 2rem 1.5rem;
}

.empty-state-card {
  max-width: 680px;
  width: 100%;
  padding: 3rem 2.5rem;
  text-align: center;
  user-select: none;
}

.empty-icon-wrapper { margin-bottom: 2rem; }

.empty-icon {
  width: 100px;
  height: 100px;
  border-radius: 28px;
  background: var(--key-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
  color: #fff;
}

.empty-title {
  font: var(--header-emphasized);
  color: var(--system-primary);
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font: var(--body);
  color: var(--system-secondary);
  margin-bottom: 2.5rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  padding: 1rem;
  background: var(--grouped-bg);
  border-radius: 20px;
  text-align: left;
  user-select: none;
  pointer-events: none;
}

.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--key-color) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--key-color);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.feature-content h4 {
  font: var(--body-emphasized);
  color: var(--system-primary);
  margin-bottom: 0.2rem;
}

.feature-content p {
  font: var(--callout);
  color: var(--system-tertiary);
  line-height: 1.4;
}

.btn-apply {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 2rem;
  font: var(--body-emphasized);
  border-radius: 1000px;
  background: var(--key-color);
  color: var(--text-on-accent);
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-apply:active { opacity: 0.8; }
.btn-apply i { font-size: 1.1rem; }

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s var(--spring);
}

.fade-slide-enter-from { opacity: 0; transform: translateY(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-20px); }

.intro-view,
.apply-form-view,
.examine-view,
.disable-view,
.loading-view { width: 100%; }

.loading-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1.5rem;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--grouped-bg);
  border: none;
  color: var(--system-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-spacer { width: 36px; }

.form-title {
  font: var(--title-1-emphasized);
  color: var(--system-primary);
  text-align: center;
  flex: 1;
}

.form-content { text-align: left; }


.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.error-message {
  font: var(--callout);
  color: var(--danger);
  margin-top: 0.3rem;
}

.char-count {
  font: var(--callout);
  color: var(--system-tertiary);
  text-align: right;
}

.btn-submit { margin-top: 1rem; }

.status-icon-wrapper { margin-bottom: 2rem; }

.status-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
  color: #fff;
}

.status-icon.examine { background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%); }
.status-icon.disable { background: linear-gradient(135deg, #FF3B30 0%, #D70015 100%); }

.status-tips {
  background: var(--grouped-bg);
  border-radius: 20px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  text-align: left;
}

.status-tips h4 {
  font: var(--body-emphasized);
  color: var(--system-primary);
  margin-bottom: 1rem;
}

.status-tips ul { list-style: none; padding: 0; margin: 0; }

.status-tips li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.8rem;
  color: var(--system-secondary);
  font: var(--callout);
  line-height: 1.6;
}

.status-tips li:last-child { margin-bottom: 0; }

.status-tips li::before {
  content: '•';
  position: absolute;
  left: 0.5rem;
  color: var(--key-color);
  font-weight: bold;
}

.status-actions { margin-top: 2rem; }

.btn-contact {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.5rem;
  background: var(--grouped-bg);
  border: none;
  border-radius: 1000px;
  color: var(--system-primary);
  font: var(--body-emphasized);
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-contact:active { opacity: 0.7; }

.btn-edit-seller {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.seller-info-card-wrap {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .empty-seller-container { padding: 1.5rem 1rem; min-height: calc(100vh - 120px); }
  .empty-state-card { padding: 2rem 1.5rem; }
  .empty-icon { width: 80px; height: 80px; font-size: 2.2rem; }
  .features-grid { grid-template-columns: 1fr; gap: 0.8rem; }
  .btn-apply { width: 100%; justify-content: center; }
  .seller-info-card-wrap :deep(.seller-info-card) { flex-direction: column; text-align: center; padding: 1.2rem; }
}
</style>
