<template>
  <header class="page-header">
    <h1 class="page-title">订单中心</h1>

  </header>

  <div class="filter-bar">
    <SegmentedControl :tabs="filterTabs" v-model="currentFilter" @overflow="onOverflow" />
    <div class="search-sort-group">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input
          type="text"
          class="search-input"
          v-model="searchQuery"
          placeholder="搜索订单号/商品..."
        >
      </div>
      <div v-if="isOverflow" class="cloud-buttons">
        <button class="cloud-btn" ref="overflowBtnRef" @click="toggleFilterMenu" title="更多筛选">
          <svg viewBox="0 0 28 28" width="28" height="28"><path fill="var(--system-primary)" d="M7 13a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/></svg>
        </button>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showFilterMenu" class="dropdown-overlay" @click="showFilterMenu = false">
        <div class="dropdown-menu" :style="filterMenuStyle" @click.stop>
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            :class="['dropdown-menu__item', { active: currentFilter === tab.value }]"
            @click="currentFilter = tab.value; showFilterMenu = false"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <div v-if="isLoading" class="order-grid">
    <div v-for="i in 6" :key="i" class="bento-card order-card skeleton-order-card">
      <div class="skeleton-order-header">
        <div class="skeleton-text skeleton-w60 skeleton-h20"></div>
        <div class="skeleton-text skeleton-w50px skeleton-h20 skeleton-r40"></div>
      </div>
      <div class="skeleton-order-body">
        <div class="skeleton-text skeleton-w75 skeleton-h14"></div>
        <div class="skeleton-text skeleton-w65 skeleton-h14"></div>
        <div class="skeleton-text skeleton-w55 skeleton-h14"></div>
      </div>
      <div class="skeleton-text skeleton-w35 skeleton-h24"></div>
      <div class="skeleton-order-actions">
        <div class="skeleton-button skeleton-btn70"></div>
        <div class="skeleton-button skeleton-btn70"></div>
      </div>
    </div>
  </div>

  <div v-else-if="filteredOrders.length === 0" class="empty-state">
    <i class="fas fa-receipt"></i>
    <h4>暂无订单</h4>
  </div>

  <div v-else class="order-grid">
    <div
      v-for="order in filteredOrders"
      :key="order.order_no"
      class="bento-card order-card"
      @click="openOrderDetail(order)"
    >
      <div class="order-header">
        <div class="order-title">{{ order.order_title }}</div>
        <span :class="['order-status', getOrderStatusClass(order)]">
          <i class="fas fa-circle order-status-dot"></i>
          {{ getOrderStatusText(order) }}
        </span>
      </div>
      <div class="order-meta">
        <span><i class="fas fa-hashtag"></i> {{ order.order_no }}</span>
        <span><i class="fas fa-store"></i> {{ order.seller?.name || '未知店铺' }}</span>
        <span><i class="far fa-clock"></i> {{ formatDate(order.created_at) }}</span>
      </div>
      <div class="order-price">
        <i class="fas fa-carrot"></i> {{ order.price_order }}
      </div>
      <div class="order-actions" @click.stop>
        <button
          v-if="getOrderStatus(order) === 'unpaid'"
          class="order-action-btn primary"
          @click="handleOrderAction('pay', order)"
          :disabled="processingKey === `${order.order_no}_pay`"
        >
          <i v-if="processingKey === `${order.order_no}_pay`" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-credit-card"></i>
        </button>
        <button
          v-if="getOrderStatus(order) === 'unpaid'"
          class="order-action-btn"
          @click="handleOrderAction('close', order)"
          :disabled="processingKey === `${order.order_no}_close`"
        >
          <i v-if="processingKey === `${order.order_no}_close`" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-times"></i>
        </button>
        <button
          v-if="getOrderStatus(order) === 'paid'"
          class="order-action-btn"
          @click="handleOrderAction('urge', order)"
          :disabled="processingKey === `${order.order_no}_urge`"
        >
          <i v-if="processingKey === `${order.order_no}_urge`" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-bell"></i>
        </button>
        <button
          v-if="getOrderStatus(order) === 'cancel' || getOrderStatus(order) === 'close' || getOrderStatus(order) === 'delivered'"
          class="order-action-btn"
          @click="handleOrderAction('delete', order)"
          :disabled="processingKey === `${order.order_no}_delete`"
        >
          <i v-if="processingKey === `${order.order_no}_delete`" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  </div>

  <BaseModal :visible="showDetailModal" title="订单详情" @close="closeDetailModal">
    <template v-if="selectedOrder">
      <div class="detail-product">
        <div class="detail-cover">
          <img v-if="selectedOrder.order_cover_url"
            :src="selectedOrder.order_cover_url"
            :alt="selectedOrder.order_title"
            loading="lazy">
          <i v-else class="fas fa-image"></i>
        </div>
        <div class="detail-info">
          <div class="detail-title">{{ selectedOrder.order_title }}</div>
          <div class="detail-desc">{{ selectedOrder.product?.description || '暂无描述' }}</div>
        </div>
      </div>

      <div class="list-group">
        <div class="list-row">
          <span class="list-row__label">订单号</span>
          <span class="list-row__value list-row__value--mono">{{ selectedOrder.order_no }}</span>
        </div>
        <div class="list-row">
          <span class="list-row__label">商户</span>
          <span class="list-row__value">{{ selectedOrder.seller?.name || '未知店铺' }}</span>
        </div>
        <div class="list-row">
          <span class="list-row__label">购买数量</span>
          <span class="list-row__value">{{ selectedOrder.buy_number }} 件</span>
        </div>
        <div class="list-row">
          <span class="list-row__label">下单时间</span>
          <span class="list-row__value">{{ formatDate(selectedOrder.created_at) }}</span>
        </div>
        <div v-if="selectedOrder.time_pay" class="list-row">
          <span class="list-row__label">支付时间</span>
          <span class="list-row__value">{{ formatDate(selectedOrder.time_pay) }}</span>
        </div>
        <div v-if="selectedOrder.time_delivery" class="list-row">
          <span class="list-row__label">发货时间</span>
          <span class="list-row__value">{{ formatDate(selectedOrder.time_delivery) }}</span>
        </div>
      </div>

      <div v-if="selectedOrder.product?.exchange_way" class="detail-section">
        <div class="detail-section-title">兑换方式</div>
        <div class="detail-section-content">{{ selectedOrder.product.exchange_way }}</div>
      </div>

      <div v-if="selectedOrder.remark_user || selectedOrder.remark_shop" class="detail-section">
        <div class="detail-section-title">备注信息</div>
        <div v-if="selectedOrder.remark_user" class="detail-remark">
          <span class="detail-remark-label">买家备注：</span>
          <span>{{ selectedOrder.remark_user }}</span>
        </div>
        <div v-if="selectedOrder.remark_shop" class="detail-remark">
          <span class="detail-remark-label">卖家备注：</span>
          <span>{{ selectedOrder.remark_shop }}</span>
        </div>
      </div>

      <div :class="['detail-status-card', getOrderStatusClass(selectedOrder)]">
        <div class="detail-status-row">
          <i :class="getOrderStatusIcon(getOrderStatus(selectedOrder))"></i>
          <div>
            <div class="detail-status-text">{{ getOrderStatusText(selectedOrder) }}</div>
            <div class="detail-status-desc">{{ getOrderStatusDesc(selectedOrder) }}</div>
          </div>
        </div>
        <div class="detail-divider"></div>
        <div class="detail-price-row">
          <span class="detail-price-label">{{ selectedOrder.status_pay === 'paid' ? '已付金额' : '应付金额' }}</span>
          <span class="detail-price-value">
            <i class="fas fa-carrot"></i> {{ selectedOrder.price_order }}
          </span>
        </div>
      </div>
    </template>
    <template #footer>

      <button
        v-if="selectedOrder && getOrderStatus(selectedOrder) === 'unpaid'"
        class="modal-btn primary"
        @click="handleOrderAction('pay', selectedOrder)"
      >
        立即支付
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import orderApi from '@/api/orderApi.js'
import { formatDate } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import {
  ORDER_FILTER_CHIPS,
  getOrderStatus,
  getOrderStatusClass,
  getOrderStatusText,
  getOrderStatusDesc,
  getOrderStatusIcon,
  filterOrders
} from '@/utils/order.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const appStore = useAppStore()

const orders = ref([])
const isLoading = ref(false)
const currentFilter = ref('all')
const searchQuery = ref('')
const showDetailModal = ref(false)
const selectedOrder = ref(null)
const processingKey = ref(null)
const isOverflow = ref(false)
const showFilterMenu = ref(false)
const overflowBtnRef = ref(null)
const filterMenuStyle = ref({})
let searchTimeout = null

const onOverflow = (overflow) => {
  isOverflow.value = overflow
  if (!overflow) showFilterMenu.value = false
}

const toggleFilterMenu = () => {
  if (showFilterMenu.value) {
    showFilterMenu.value = false
    return
  }
  if (overflowBtnRef.value) {
    const rect = overflowBtnRef.value.getBoundingClientRect()
    filterMenuStyle.value = {
      position: 'absolute',
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  }
  showFilterMenu.value = true
}

const filterTabs = ORDER_FILTER_CHIPS.map(chip => ({
  value: chip.value,
  label: chip.label
}))

const filteredOrders = computed(() => {
  return filterOrders(orders.value, currentFilter.value, searchQuery.value)
})

const setFilter = (filter) => {
  currentFilter.value = filter
}

const loadOrders = async () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  try {
    isLoading.value = true
    const params = {}

    if (searchQuery.value) {
      if (/^[A-Za-z0-9]+$/.test(searchQuery.value) && searchQuery.value.length > 8) {
        params.order_no = searchQuery.value
      } else {
        params.order_title = searchQuery.value
      }
    }

    const res = await orderApi.getUserOrderList(params)
    orders.value = res?.items || []
  } catch (error) {
    console.error('加载订单失败:', error)
    showToast('加载订单失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const debouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    loadOrders()
  }, 300)
}

const openOrderDetail = (order) => {
  selectedOrder.value = order
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedOrder.value = null
}

const handleOrderAction = async (action, order) => {
  processingKey.value = `${order.order_no}_${action}`

  try {
    if (action === 'pay') {
      await orderApi.payOrder(order.order_no)
      showToast('支付成功', 'success')
      await loadOrders()
    } else if (action === 'close') {
      if (await confirmDialog('确定关闭此订单吗？')) {
        await orderApi.closeOrder(order.order_no)
        showToast('订单已关闭', 'success')
        await loadOrders()
      }
    } else if (action === 'urge') {
      await orderApi.urgeDelivery(order.order_no)
      showToast('已发送催发货通知', 'success')
    } else if (action === 'delete') {
      if (await confirmDialog('确定删除此订单吗？', '确认', true)) {
        await orderApi.deleteOrder(order.order_no)
        showToast('订单已删除', 'success')
        await loadOrders()
      }
    }
  } catch (error) {
    console.error('操作失败:', error)
    const errorMessage = error.response?.data?.message || error.message || '操作失败'
    showToast(errorMessage, 'error')
  } finally {
    processingKey.value = null
  }
}

onMounted(() => {
  loadOrders()
})

onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})

watch(searchQuery, () => {
  debouncedSearch()
})

watch(() => appStore.userInfo, (newUserInfo) => {
  if (newUserInfo) {
    loadOrders()
  }
}, { immediate: false })
</script>

<style scoped>
.skeleton-order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.skeleton-order-body { margin-bottom: 12px; }
.skeleton-order-actions { display: flex; gap: 8px; }
.skeleton-w60 { width: 60%; }
.skeleton-w50px { width: 50px; }
.skeleton-w75 { width: 75%; margin-bottom: 8px; }
.skeleton-w65 { width: 65%; margin-bottom: 8px; }
.skeleton-w55 { width: 55%; }
.skeleton-w35 { width: 35%; margin-bottom: 16px; }
.skeleton-h20 { height: 20px; }
.skeleton-h14 { height: 14px; }
.skeleton-h24 { height: 24px; }
.skeleton-r40 { border-radius: 40px; }
.skeleton-btn70 { width: 70px; height: 32px; border-radius: 8px; }
.order-status-dot { font-size: 0.4em; }

.order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 1.5rem;
}

.order-card {
  cursor: pointer;
  padding: 1.5rem;
  gap: 1rem;
}

.order-card:active {
  opacity: 0.8;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.order-title {
  font: var(--title-3-emphasized);
  color: var(--system-primary);
  line-height: 1.3;
  flex: 1;
}


.order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  font: var(--callout);
  color: var(--system-secondary);
}

.order-meta i {
  opacity: 0.7;
  margin-right: 4px;
}

.order-price {
  font: var(--title-2-emphasized);
  color: var(--system-primary);
  text-align: left;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 0.5px solid var(--system-quaternary);
}

.order-price i {
  margin-right: 4px;
  color: var(--warning);
}

.order-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}


.detail-product {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.detail-cover {
  width: 80px;
  height: 80px;
  border-radius: 14px;
  overflow: hidden;
  background: var(--grouped-bg);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--system-tertiary);

}

.detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-title {
  font: var(--title-3-emphasized);
  color: var(--system-primary);
  margin-bottom: 0.4rem;
  line-height: 1.4;
}

.detail-desc {
  font: var(--callout);
  color: var(--system-secondary);
  line-height: 1.6;
}

.detail-section {
  background: var(--grouped-bg);
  border-radius: 14px;
  padding: 1rem 1.2rem;
  margin-bottom: 1rem;
}

.detail-section-title {
  font: var(--callout-emphasized);
  color: var(--system-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.6rem;
}

.detail-section-content {
  color: var(--system-primary);
  font: var(--callout);
  line-height: 1.6;
}

.detail-remark {
  margin-bottom: 0.6rem;
  font: var(--callout);
  line-height: 1.6;
  color: var(--system-primary);
}

.detail-remark:last-child {
  margin-bottom: 0;
}

.detail-remark-label {
  font: var(--callout);
  color: var(--system-secondary);
}

.detail-status-card {
  background: var(--grouped-bg);
  border-radius: 14px;
  padding: 1.2rem;
}

.detail-status-card.unpaid { background: rgba(255, 159, 10, 0.08); }
.detail-status-card.paid { background: rgba(10, 132, 255, 0.08); }
.detail-status-card.delivered { background: rgba(48, 209, 88, 0.08); }

.detail-status-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.detail-status-row > i {
  font-size: 1.2rem;
}

.detail-status-card.unpaid .detail-status-row > i,
.detail-status-card.unpaid .detail-status-text { color: var(--warning); }

.detail-status-card.paid .detail-status-row > i,
.detail-status-card.paid .detail-status-text { color: var(--key-color); }

.detail-status-card.delivered .detail-status-row > i,
.detail-status-card.delivered .detail-status-text { color: var(--success); }

.detail-status-card.cancel .detail-status-row > i,
.detail-status-card.cancel .detail-status-text,
.detail-status-card.close .detail-status-row > i,
.detail-status-card.close .detail-status-text { color: var(--system-tertiary); }

.detail-status-text {
  font: var(--callout-emphasized);
  margin-bottom: 0.15rem;
}

.detail-status-desc {
  font: var(--callout);
  color: var(--system-secondary);
}

.detail-divider {
  height: 1px;
  background: var(--system-quaternary);
  margin: 0.8rem 0;
}

.detail-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-price-label {
  color: var(--system-secondary);
  font: var(--callout);
}

.detail-price-value {
  font: var(--title-1-emphasized);
}

.detail-price-value i {
  font-size: 1rem;
  margin-right: 4px;
}

.detail-status-card.unpaid .detail-price-value { color: var(--warning); }
.detail-status-card.paid .detail-price-value { color: var(--key-color); }
.detail-status-card.delivered .detail-price-value { color: var(--success); }
.detail-status-card.cancel .detail-price-value,
.detail-status-card.close .detail-price-value { color: var(--system-tertiary); }

@media (max-width: 483px) {
  .order-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}


.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
