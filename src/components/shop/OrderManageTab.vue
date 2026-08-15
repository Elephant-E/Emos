<template>
  <div v-show="visible" class="tab-content active">
    <div class="toolbar">
      <SegmentedControl
        :tabs="orderFilterTabs"
        v-model="currentOrderFilter"
      />
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input
          type="text"
          class="search-input"
          v-model="orderSearchQuery"
          placeholder="搜索订单号/商品..."
        >
      </div>
    </div>

    <div class="list-group">
      <template v-if="isOrdersLoading">
        <div
          v-for="i in 5"
          :key="`order-skeleton-${i}`"
          class="list-row"
        >
          <div class="product-thumb-skeleton">
            <div class="skeleton-text" style="width: 100%; height: 100%; border-radius: 12px;"></div>
          </div>
          <div class="list-row__content">
            <div class="skeleton-text skeleton-w40 skeleton-h16" style="margin-bottom: 8px;"></div>
            <div class="skeleton-text-sm skeleton-w60" style="margin-bottom: 8px;"></div>
            <div class="skeleton-text-sm skeleton-w30"></div>
          </div>
          <div class="list-row__actions">
            <div class="skeleton-text-sm skeleton-w32 skeleton-h32 skeleton-r8"></div>
            <div class="skeleton-text-sm skeleton-w32 skeleton-h32 skeleton-r8"></div>
            <div class="skeleton-text-sm skeleton-w32 skeleton-h32 skeleton-r8"></div>
          </div>
        </div>
      </template>

      <div v-else-if="filteredOrders.length === 0" class="list-empty">
        <i class="fas fa-clipboard-list"></i>
        <p>暂无订单</p>
      </div>

      <template v-else>
        <div
          v-for="order in filteredOrders"
          :key="order.order_no"
          class="list-row list-row--clickable"
          @click="openOrderDetail(order)"
        >
          <div class="product-thumb">
            <div v-if="!order.order_cover_url" class="product-thumb-placeholder">
              <i class="fas fa-image"></i>
            </div>
            <img v-else :src="order.order_cover_url" :alt="order.order_title" loading="lazy">
          </div>

          <div class="list-row__content">
            <div class="list-row__title">
              {{ order.order_title }}
              <span :class="['order-status', getOrderStatusClass(order)]">
                <i class="fas fa-circle order-status-dot"></i>
                {{ getOrderStatusText(order) }}
              </span>
            </div>
            <div class="list-row__subtitle order-meta-block">
              <div class="order-meta-row">
                <span class="meta-item"><span class="meta-label">订单号：</span>{{ order.order_no }}</span>
                <span class="meta-item"><span class="meta-label">购买时间：</span>{{ formatDate(order.created_at) }}</span>
              </div>
              <div class="order-user-row">
                <div class="order-user-avatar">
                  <img v-if="order.user?.avatar" :src="order.user.avatar" :alt="order.user.username" loading="lazy">
                  <div v-else class="order-user-avatar-placeholder"><i class="fas fa-user"></i></div>
                </div>
                <span class="meta-item order-username">{{ order.user?.username || '未知用户' }}</span>
                <span class="order-quantity">
                  <span class="meta-label">数量：</span>{{ order.buy_number }}件
                </span>
                <span
                  v-if="order.urge_number && order.urge_number > 0"
                  class="order-urge"
                  title="用户催发货次数"
                >
                  催发货：<i class="fas fa-bell"></i> {{ order.urge_number }}次
                </span>
              </div>
            </div>
            <div v-if="order.remark_user" class="list-row__subtitle">
              <span class="meta-item order-remark"><i class="fas fa-comment-dots"></i> {{ order.remark_user }}</span>
            </div>
          </div>

          <div class="list-row__actions" @click.stop>
            <button
              v-if="!order.time_delivery && order.status_pay === 'paid'"
              class="action-btn-manage"
              title="发货"
              @click="handleOrderAction('delivery', order)"
              :disabled="processingKey === `${order.order_no}_delivery`"
            >
              <i v-if="processingKey === `${order.order_no}_delivery`" class="fas fa-circle-notch fa-spin"></i>
              <i v-else class="fas fa-truck"></i>
            </button>

            <button
              v-if="order.status_pay !== 'paid' || order.time_delivery"
              class="action-btn-manage danger"
              title="删除"
              @click="handleOrderAction('delete', order)"
              :disabled="processingKey === `${order.order_no}_delete`"
            >
              <i v-if="processingKey === `${order.order_no}_delete`" class="fas fa-circle-notch fa-spin"></i>
              <i v-else class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>

  <BaseModal
    :visible="showOrderDetailModal"
    title="订单详情"
    size="lg"
    @close="closeOrderDetailModal"
  >
    <template v-if="selectedOrder">
      <div class="order-detail-header">
        <div class="order-detail-cover">
          <img v-if="selectedOrder.order_cover_url" :src="selectedOrder.order_cover_url" :alt="selectedOrder.order_title" loading="lazy">
          <div v-else class="order-detail-cover-placeholder"><i class="fas fa-image"></i></div>
        </div>
        <div class="order-detail-title-block">
          <div class="order-detail-name">{{ selectedOrder.order_title }}</div>
          <div class="order-detail-desc">{{ selectedOrder.product?.description || '暂无描述' }}</div>
        </div>
      </div>

      <div class="order-info-section">
        <div class="order-info-label">订单信息</div>
        <div class="order-info-grid">
          <div class="order-info-row">
            <span class="order-info-key">订单号</span>
            <span class="order-info-val value-mono">{{ selectedOrder.order_no }}</span>
          </div>
          <div class="order-info-row">
            <span class="order-info-key">买家</span>
            <span class="order-info-val">{{ selectedOrder.user?.username || '未知用户' }}</span>
          </div>
          <div class="order-info-row">
            <span class="order-info-key">购买数量</span>
            <span class="order-info-val">{{ selectedOrder.buy_number }} 件</span>
          </div>
          <div class="order-info-row">
            <span class="order-info-key">下单时间</span>
            <span class="order-info-val">{{ formatDate(selectedOrder.created_at) }}</span>
          </div>
          <div v-if="selectedOrder.time_pay" class="order-info-row">
            <span class="order-info-key">支付时间</span>
            <span class="order-info-val">{{ formatDate(selectedOrder.time_pay) }}</span>
          </div>
          <div v-if="selectedOrder.time_delivery" class="order-info-row">
            <span class="order-info-key">发货时间</span>
            <span class="order-info-val">{{ formatDate(selectedOrder.time_delivery) }}</span>
          </div>
          <div v-if="selectedOrder.urge_number && selectedOrder.urge_number > 0" class="order-info-row">
            <span class="order-info-key">催发货次数</span>
            <span class="order-urge-detail"><i class="fas fa-bell"></i> {{ selectedOrder.urge_number }} 次</span>
          </div>
          <div v-if="selectedOrder.remark_user" class="order-info-remark">
            <span class="order-info-key">买家备注</span>
            <span class="order-info-val">{{ selectedOrder.remark_user }}</span>
          </div>
        </div>
      </div>

      <div class="order-info-section">
        <div class="order-info-label">卖家备注</div>
        <div v-if="selectedOrder.remark_shop" class="order-remark-content">{{ selectedOrder.remark_shop }}</div>
        <button class="btn-subtle order-remark-btn" @click="openRemarkModal(selectedOrder)">
          <i class="fas fa-edit"></i> {{ selectedOrder.remark_shop ? '编辑备注' : '添加备注' }}
        </button>
      </div>

      <div :class="['order-status-section', getOrderStatusClass(selectedOrder)]">
        <div class="order-status-header">
          <i :class="getOrderStatusIcon(selectedOrder)" class="order-status-icon"></i>
          <div>
            <div class="order-status-text">{{ getOrderStatusText(selectedOrder) }}</div>
            <div class="order-status-desc">{{ getOrderStatusDesc(selectedOrder) }}</div>
          </div>
        </div>
        <div class="order-status-divider"></div>
        <div class="order-status-price-row">
          <span class="order-status-price-label">{{ selectedOrder.status_pay === 'paid' ? '已付金额' : '应付金额' }}</span>
          <span class="order-status-price">
            <i class="fas fa-carrot"></i> {{ selectedOrder.price_order }}
          </span>
        </div>
      </div>
    </template>

    <template #footer>
      <button class="modal-btn secondary" @click="closeOrderDetailModal">关闭</button>
      <button
        v-if="!selectedOrder?.time_delivery && selectedOrder?.status_pay === 'paid'"
        class="modal-btn primary"
        @click="handleOrderAction('delivery', selectedOrder)"
        :disabled="processingKey === `${selectedOrder.order_no}_delivery`"
      >
        <i v-if="processingKey === `${selectedOrder.order_no}_delivery`" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>确认发货</span>
      </button>
    </template>
  </BaseModal>

  <BaseModal
    :visible="showRemarkModal"
    :title="remarkForm.order_no ? '编辑备注' : '添加备注'"
    @close="closeRemarkModal"
  >
    <div class="form-group">
      <label class="form-label">订单备注（200字内）</label>
      <textarea
        v-model="remarkForm.remark"
        class="form-textarea"
        placeholder="请输入订单备注..."
        maxlength="200"
        rows="4"
      ></textarea>
      <div class="form-hint">{{ remarkForm.remark?.length || 0 }}/200</div>
    </div>

    <template #footer>
      <button class="modal-btn secondary" @click="closeRemarkModal">取消</button>
      <button class="modal-btn primary" @click="saveRemark" :disabled="isSavingRemark">
        <i v-if="isSavingRemark" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>保存</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { formatDate } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import orderApi from '@/api/orderApi.js'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import {
  ORDER_FILTER_CHIPS,
  getOrderStatus,
  getOrderStatusClass,
  getOrderStatusText,
  getOrderStatusDesc,

  getOrderStatusIcon,
  filterOrders
} from '@/utils/order.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  }
})
const emit = defineEmits(['updateStats'])

const orders = ref([])
const isOrdersLoading = ref(false)
const currentOrderFilter = ref('all')
const orderSearchQuery = ref('')
const showOrderDetailModal = ref(false)
const showRemarkModal = ref(false)
const selectedOrder = ref(null)
const processingKey = ref(null)
const remarkForm = ref({
  order_no: '',
  remark: ''
})
const isSavingRemark = ref(false)

const orderFilterTabs = ORDER_FILTER_CHIPS.map(chip => ({
  value: chip.value,
  label: chip.label
}))

const filteredOrders = computed(() => {
  return filterOrders(orders.value, currentOrderFilter.value, orderSearchQuery.value)
})


const loadOrders = async () => {
  try {
    isOrdersLoading.value = true
    const res = await orderApi.getShopOrderList()

    if (res && res.items && Array.isArray(res.items)) {
      orders.value = res.items
      emit('updateStats', { orderCount: res.total || res.items.length })
    }
  } catch (error) {
    console.error('加载订单失败:', error)
    showToast('加载订单失败', 'error')
  } finally {
    isOrdersLoading.value = false
  }
}

const openOrderDetail = (order) => {
  selectedOrder.value = order
  showOrderDetailModal.value = true
}

const closeOrderDetailModal = () => {
  showOrderDetailModal.value = false
  selectedOrder.value = null
}

const openRemarkModal = (order) => {
  remarkForm.value = {
    order_no: order.order_no,
    remark: order.remark_shop || ''
  }
  showRemarkModal.value = true
}

const closeRemarkModal = () => {
  showRemarkModal.value = false
  remarkForm.value = {
    order_no: '',
    remark: ''
  }
}

const saveRemark = async () => {
  if (!remarkForm.value.order_no) return

  try {
    isSavingRemark.value = true
    await orderApi.addRemark(
      remarkForm.value.order_no,
      remarkForm.value.remark
    )
    showToast('备注保存成功', 'success')
    closeRemarkModal()
    await loadOrders()
    if (selectedOrder.value && selectedOrder.value.order_no === remarkForm.value.order_no) {
      selectedOrder.value.remark_shop = remarkForm.value.remark
    }
  } catch (error) {
    console.error('保存备注失败:', error)
    showToast(error.message || '保存备注失败', 'error')
  } finally {
    isSavingRemark.value = false
  }
}

const handleOrderAction = async (action, order) => {
  processingKey.value = `${order.order_no}_${action}`

  try {
    if (action === 'delivery') {
      await orderApi.confirmDelivery(order.order_no, true)
      showToast('发货成功', 'success')
      await loadOrders()
      closeOrderDetailModal()
    } else if (action === 'delete') {
      if (await confirmDialog('确定删除此订单吗？', '确认', true)) {
        await orderApi.deleteShopOrder(order.order_no)
        showToast('订单已删除', 'success')
        await loadOrders()
      }
    }
  } catch (error) {
    console.error('操作失败:', error)
    const errorMessage = error.message || '操作失败'
    showToast(errorMessage, 'error')
  } finally {
    processingKey.value = null
  }
}

onMounted(async () => {
  await loadOrders()
})

defineExpose({ loadOrders })
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.toolbar .search-container {
  flex: 1;
  min-width: 160px;
}

@media (max-width: 483px) {
  .toolbar {
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .toolbar .search-container {
    width: 100%;
    min-width: 0;
    order: 1;
  }
}

.product-thumb {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 1rem;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-thumb-placeholder {
  width: 100%;
  height: 100%;
  background: var(--opaque-shelf-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--system-tertiary);
}

.product-thumb-skeleton {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  flex-shrink: 0;
  margin-right: 1rem;
}

.list-row__actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
  align-self: center;
}


.order-status-dot {
  font-size: 0.5em;
}

.list-row__title .order-status {
  margin-left: 0.5rem;
}

.order-meta-block {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.order-meta-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.meta-label {
  color: var(--system-tertiary);
}

.order-user-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.order-user-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--opaque-shelf-bg);
  border: 1.5px solid var(--label-divider);
}

.order-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-user-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--system-tertiary);
  font-size: 0.55rem;
}

.order-username {
  font-weight: 500;
}

.order-quantity {
  color: var(--key-color);
  font-weight: 600;
  background: color-mix(in srgb, var(--key-color) 10%, transparent);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font: var(--callout);
}

.order-urge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--danger);
  font: var(--callout-emphasized);
}

.order-remark {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-detail-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.order-detail-cover {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--system-quaternary);
  flex-shrink: 0;
}

.order-detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-detail-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--system-tertiary);
}

.order-detail-cover-placeholder i {
  font-size: 1.5rem;
}

.order-detail-title-block {
  flex: 1;
  min-width: 0;
}

.order-detail-name {
  font: var(--title-3-emphasized);
  color: var(--system-primary);
  margin-bottom: 0.4rem;
  line-height: 1.4;
}

.order-detail-desc {
  font: var(--callout);
  color: var(--system-secondary);
  line-height: 1.6;
}

.order-info-section {
  background: var(--grouped-bg);
  border-radius: 20px;
  padding: 1.2rem;
  margin-bottom: 1rem;
}

.order-info-label {
  font: var(--callout-emphasized);
  color: var(--system-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.8rem;
}

.order-info-grid {
  display: grid;
  gap: 0.8rem;
}

.order-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-info-key {
  color: var(--system-secondary);
  font: var(--callout);
}

.order-info-val {
  color: var(--system-primary);
  font: var(--body-emphasized);
}

.order-urge-detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--danger);
  font: var(--body-emphasized);
}

.order-urge-detail i {
  font-size: 0.7rem;
}

.order-info-remark {
  padding-top: 0.8rem;
  border-top: 0.5px solid var(--label-divider);
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.order-info-remark .order-info-val {
  line-height: 1.6;
}

.order-remark-content {
  color: var(--system-primary);
  font: var(--body);
  line-height: 1.6;
  margin-bottom: 0.8rem;
}

.order-remark-btn {
  width: 100%;
  justify-content: center;
}

.order-status-section {
  background: var(--grouped-bg);
  border-radius: 20px;
  padding: 1.2rem;
}

.order-status-section.status-paid {
  background: color-mix(in srgb, var(--key-color) 8%, var(--grouped-bg));
  border: 1px solid color-mix(in srgb, var(--key-color) 20%, transparent);
}

.order-status-section.status-unpaid {
  background: color-mix(in srgb, var(--system-tertiary) 8%, var(--grouped-bg));
  border: 1px solid color-mix(in srgb, var(--system-tertiary) 20%, transparent);
}

.order-status-section.status-delivered {
  background: color-mix(in srgb, var(--success) 8%, var(--grouped-bg));
  border: 1px solid color-mix(in srgb, var(--success) 20%, transparent);
}

.order-status-section.cancel,
.order-status-section.close {
  background: color-mix(in srgb, var(--system-tertiary) 8%, var(--grouped-bg));
  border: 1px solid color-mix(in srgb, var(--system-tertiary) 20%, transparent);
}

.order-status-section.refund {
  background: color-mix(in srgb, var(--danger) 8%, var(--grouped-bg));
  border: 1px solid color-mix(in srgb, var(--danger) 20%, transparent);
}

.order-status-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.order-status-icon {
  font-size: 1.2rem;
}

.order-status-section.status-paid .order-status-icon { color: var(--key-color); }
.order-status-section.status-unpaid .order-status-icon { color: var(--system-tertiary); }
.order-status-section.status-delivered .order-status-icon { color: var(--success); }

.order-status-section.cancel .order-status-icon,
.order-status-section.close .order-status-icon { color: var(--system-tertiary); }

.order-status-section.refund .order-status-icon { color: var(--danger); }

.order-status-text {
  font: var(--body-emphasized);
  margin-bottom: 0.15rem;
}

.order-status-section.status-paid .order-status-text { color: var(--key-color); }
.order-status-section.status-unpaid .order-status-text { color: var(--system-tertiary); }
.order-status-section.status-delivered .order-status-text { color: var(--success); }

.order-status-section.cancel .order-status-text,
.order-status-section.close .order-status-text { color: var(--system-tertiary); }

.order-status-section.refund .order-status-text { color: var(--danger); }

.order-status-desc {
  font: var(--callout);
  color: var(--system-secondary);
}

.order-status-divider {
  height: 0.5px;
  background: var(--label-divider);
  margin: 0.8rem 0;
}

.order-status-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-status-price-label {
  color: var(--system-secondary);
  font: var(--body-emphasized);
}

.order-status-price {
  font: var(--header-emphasized);
}

.order-status-section.status-paid .order-status-price { color: var(--key-color); }
.order-status-section.status-unpaid .order-status-price { color: var(--system-tertiary); }
.order-status-section.status-delivered .order-status-price { color: var(--success); }

.order-status-section.cancel .order-status-price,
.order-status-section.close .order-status-price { color: var(--system-tertiary); }

.order-status-section.refund .order-status-price { color: var(--danger); }

.order-status-price i {
  font-size: 1rem;
  margin-right: 4px;
}

@media (max-width: 768px) {
  .product-thumb { width: 45px; height: 45px; margin-right: 0.6rem; border-radius: 8px; }
  .product-thumb-skeleton { width: 45px; height: 45px; margin-right: 0.6rem; border-radius: 8px; }
  .list-row__title { font-size: 0.85rem; }
  .order-status { margin-left: 0; padding: 0.2rem 0.5rem; }
  .meta-item { font-size: 0.75rem; line-height: 1.4; }
  .order-meta-row { flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.2rem; }
  .order-user-row { margin-top: 0.3rem; flex-wrap: wrap; gap: 0.3rem; }
  .order-remark { max-width: 200px; }
  .action-btn-manage { width: 36px; height: 36px; font-size: 0.9rem; }
}
</style>
