<template>
  <!-- 订单中心头部 -->
  <header class="page-header">
    <h1 class="page-title">订单中心</h1>
    <p class="page-subtitle">管理与跟踪您的所有订单</p>
  </header>

  <!-- 筛选和搜索控制栏 -->
  <div class="filter-bar">
    <div class="filter-group">
      <button 
        v-for="chip in filterChips" 
        :key="chip.value"
        class="filter-chip"
        :class="{ active: currentFilter === chip.value }"
        @click="setFilter(chip.value)"
      >
        {{ chip.label }}
      </button>
    </div>
    <div class="search-container">
      <i class="fas fa-search search-icon"></i>
      <input 
        type="text" 
        class="search-input"
        v-model="searchQuery"
        placeholder="搜索订单号/商品..."
      >
    </div>
  </div>

  <!-- 加载中 - 骨架屏 -->
  <div v-if="isLoading" class="order-grid">
    <div v-for="i in 6" :key="i" class="bento-card order-card skeleton-order-card">
      <!-- 订单头部：标题 + 状态 -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div class="skeleton-text" style="height: 20px; width: 60%;"></div>
        <div class="skeleton-text" style="height: 20px; width: 50px; border-radius: 40px;"></div>
      </div>
      
      <!-- 元数据：3行 -->
      <div style="margin-bottom: 12px;">
        <div class="skeleton-text" style="height: 14px; width: 75%; margin-bottom: 8px;"></div>
        <div class="skeleton-text" style="height: 14px; width: 65%; margin-bottom: 8px;"></div>
        <div class="skeleton-text" style="height: 14px; width: 55%;"></div>
      </div>
      
      <!-- 价格 -->
      <div class="skeleton-text" style="height: 24px; width: 35%; margin-bottom: 16px;"></div>
      
      <!-- 操作按钮 -->
      <div style="display: flex; gap: 8px;">
        <div class="skeleton-button" style="width: 70px; height: 32px; border-radius: 8px;"></div>
        <div class="skeleton-button" style="width: 70px; height: 32px; border-radius: 8px;"></div>
      </div>
    </div>
  </div>

  <!-- 空状态 -->
  <div v-else-if="filteredOrders.length === 0" class="empty-state">
    <i class="fas fa-receipt"></i>
    <h4>暂无订单</h4>
  </div>

  <!-- 订单列表 -->
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
          <i class="fas fa-circle" style="font-size: 0.4em;"></i>
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

  <!-- 订单详情模态框 -->
  <Teleport to="body">
    <div 
      :class="['modal-overlay', { show: showDetailModal }]"
      @click.self="closeDetailModal"
    >
      <div class="modal-content lg">
        <div class="modal-header">
          <span class="modal-title">订单详情</span>
          <button class="modal-close" @click="closeDetailModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" v-if="selectedOrder">
          <!-- 商品封面和标题 -->
          <div style="display: flex; gap: 1rem; margin-bottom: 1.2rem;">
            <div style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden; background: var(--bg-input); flex-shrink: 0;">
              <img v-if="selectedOrder.order_cover_url" 
                :src="selectedOrder.order_cover_url" 
                :alt="selectedOrder.order_title"
                style="width: 100%; height: 100%; object-fit: cover;"
               loading="lazy">
              <div v-else style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">
                <i class="fas fa-image" style="font-size: 1.5rem;"></i>
              </div>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.4rem; line-height: 1.4;">
                {{ selectedOrder.order_title }}
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                {{ selectedOrder.product?.description || '暂无描述' }}
              </div>
            </div>
          </div>

          <!-- 订单信息卡片 -->
          <div style="background: var(--bg-input); border-radius: 16px; padding: 1.2rem; margin-bottom: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.8rem;">
              订单信息
            </div>
            <div style="display: grid; gap: 0.8rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">订单号</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500; font-family: monospace;">{{ selectedOrder.order_no }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">商户</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ selectedOrder.seller?.name || '未知店铺' }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">购买数量</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ selectedOrder.buy_number }} 件</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">下单时间</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ formatDate(selectedOrder.created_at) }}</span>
              </div>
              <div v-if="selectedOrder.time_pay" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">支付时间</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ formatDate(selectedOrder.time_pay) }}</span>
              </div>
              <div v-if="selectedOrder.time_delivery" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">发货时间</span>
                <span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">{{ formatDate(selectedOrder.time_delivery) }}</span>
              </div>
            </div>
          </div>

          <!-- 兑换方式 -->
          <div v-if="selectedOrder.product?.exchange_way" style="background: var(--bg-input); border-radius: 16px; padding: 1.2rem; margin-bottom: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">
              兑换方式
            </div>
            <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">
              {{ selectedOrder.product.exchange_way }}
            </div>
          </div>

          <!-- 备注信息 -->
          <div v-if="selectedOrder.remark_user || selectedOrder.remark_shop" style="background: var(--bg-input); border-radius: 16px; padding: 1.2rem; margin-bottom: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.8rem;">
              备注信息
            </div>
            <div v-if="selectedOrder.remark_user" style="margin-bottom: 0.8rem;">
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">买家备注：</div>
              <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">{{ selectedOrder.remark_user }}</div>
            </div>
            <div v-if="selectedOrder.remark_shop">
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">卖家备注：</div>
              <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">{{ selectedOrder.remark_shop }}</div>
            </div>
          </div>

          <!-- 价格和状态信息 -->
          <div :style="{
            background: getOrderStatusBgColor(getOrderStatus(selectedOrder)),
            border: `1px solid ${getOrderStatusBorderColor(getOrderStatus(selectedOrder))}`,
            borderRadius: '16px',
            padding: '1.2rem'
          }">
            <!-- 状态行 -->
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;">
              <i :class="getOrderStatusIcon(getOrderStatus(selectedOrder))" :style="{
                fontSize: '1.2rem',
                color: getOrderStatusColor(getOrderStatus(selectedOrder))
              }"></i>
              <div>
                <div :style="{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: getOrderStatusColor(getOrderStatus(selectedOrder)),
                  marginBottom: '0.15rem'
                }">
                  {{ getOrderStatusText(selectedOrder) }}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                  {{ getOrderStatusDesc(selectedOrder) }}
                </div>
              </div>
            </div>
            
            <!-- 分隔线 -->
            <div style="height: 1px; background: var(--border); margin: 0.8rem 0;"></div>
            
            <!-- 价格行 -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">{{ selectedOrder.status_pay === 'paid' ? '已付金额' : '应付金额' }}</span>
              <span :style="{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: getOrderStatusColor(getOrderStatus(selectedOrder))
              }">
                <i class="fas fa-carrot" style="font-size: 1rem; margin-right: 4px;"></i>
                {{ selectedOrder.price_order }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="closeDetailModal">关闭</button>
          <button 
            v-if="getOrderStatus(selectedOrder) === 'unpaid'"
            class="modal-btn primary" 
            @click="handleOrderAction('pay', selectedOrder)"
          >
            <i class="fas fa-credit-card" style="margin-right: 6px;"></i>
            立即支付
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import orderApi from '@/api/orderApi.js'
import { formatDate } from '@/utils/format.js'
import { showToast } from '@/utils/toast.js'
import { 
  ORDER_FILTER_CHIPS,
  getOrderStatus,
  getOrderStatusClass,
  getOrderStatusText,
  getOrderStatusDesc,
  getOrderStatusColor,
  getOrderStatusBgColor,
  getOrderStatusBorderColor,
  getOrderStatusIcon,
  filterOrders
} from '@/utils/order.js'

const appStore = useAppStore()

// ================= 状态管理 =================
const orders = ref([])
const isLoading = ref(false)
const currentFilter = ref('all')
const searchQuery = ref('')
const showDetailModal = ref(false)
const selectedOrder = ref(null)
const processingKey = ref(null)

// 筛选项配置（使用公共常量）
const filterChips = ORDER_FILTER_CHIPS

// ================= 计算属性 =================
const filteredOrders = computed(() => {
  return filterOrders(orders.value, currentFilter.value, searchQuery.value)
})

// ================= 方法 =================
// 设置筛选条件
const setFilter = (filter) => {
  currentFilter.value = filter
}

// 加载订单列表 - 获取所有订单
const loadOrders = async () => {
  try {
    isLoading.value = true
    const allOrders = []
    let page = 1
    let hasMore = true
    
    // 循环获取所有页的数据
    while (hasMore) {
      const res = await orderApi.getUserOrderList({ page, page_size: 100 })
      
      if (res && res.items && Array.isArray(res.items)) {
        allOrders.push(...res.items)
        
        // 判断是否还有更多数据
        const total = res.total || 0
        const loadedCount = allOrders.length
        hasMore = loadedCount < total
        
        if (hasMore) {
          page++
        }
      } else {
        hasMore = false
      }
    }
    
    orders.value = allOrders
  } catch (error) {
    console.error('加载订单失败:', error)
    showToast('加载订单失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 打开订单详情
const openOrderDetail = (order) => {
  selectedOrder.value = order
  showDetailModal.value = true
}

// 关闭订单详情
const closeDetailModal = () => {
  showDetailModal.value = false
  selectedOrder.value = null
}

// 处理订单操作
const handleOrderAction = async (action, order) => {
  // 设置当前处理的操作键（订单号_操作类型）
  processingKey.value = `${order.order_no}_${action}`
  
  try {
    if (action === 'pay') {
      // 支付
      await orderApi.payOrder(order.order_no)
      showToast('支付成功', 'success')
      await loadOrders()
    } else if (action === 'close') {
      if (confirm('确定关闭此订单吗？')) {
        // 关闭订单
        await orderApi.closeOrder(order.order_no)
        showToast('订单已关闭', 'success')
        await loadOrders()
      }
    } else if (action === 'urge') {
      // 催发货
      await orderApi.urgeDelivery(order.order_no)
      showToast('已发送催发货通知', 'success')
    } else if (action === 'delete') {
      if (confirm('确定删除此订单吗？')) {
        // 删除订单 - order_no 作为查询参数
        await orderApi.deleteOrder(order.order_no)
        showToast('订单已删除', 'success')
        await loadOrders()
      }
    }
  } catch (error) {
    console.error('操作失败:', error)
    // 显示具体的错误信息
    const errorMessage = error.response?.data?.message || error.message || '操作失败'
    showToast(errorMessage, 'error')
  } finally {
    // 清除处理状态
    processingKey.value = null
  }
}

// ================= 生命周期 =================
onMounted(() => {
  loadOrders()
})

// 监听账号切换，重新加载订单列表
watch(() => appStore.userInfo, (newUserInfo) => {
  if (newUserInfo) {
    loadOrders()
  }
}, { immediate: false })
</script>

<style scoped>
/* 订单网格 */
.order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 1.5rem;
}

/* 订单卡片特有样式（背景、边框等由 bento-card 提供） */
.order-card {
  cursor: pointer;
  padding: 1.5rem;
  gap: 1rem;
  transition: all 0.3s var(--ease);
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.order-card:active {
  transform: scale(0.99) translateY(0);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.order-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  flex: 1;
}

.order-status {
  padding: 0.25rem 0.7rem;
  border-radius: 40px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.order-status.unpaid {
  background: rgba(255,159,10,0.15);
  color: var(--warning);
  border: 0.5px solid rgba(255,159,10,0.3);
}

.order-status.paid {
  background: rgba(10,132,255,0.15);
  color: var(--accent);
  border: 0.5px solid rgba(10,132,255,0.3);
}

.order-status.delivered {
  background: rgba(48,209,88,0.15);
  color: var(--success);
  border: 0.5px solid rgba(48,209,88,0.3);
}

.order-status.cancel {
  background: var(--bg-input);
  color: var(--text-tertiary);
  border: 0.5px solid var(--border);
}

.order-status.close {
  background: var(--bg-input);
  color: var(--text-tertiary);
  border: 0.5px solid var(--border);
}

.order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.order-meta i {
  opacity: 0.7;
  margin-right: 4px;
}

.order-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: left;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 0.5px solid var(--border);
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

/* 响应式 */
@media (max-width: 768px) {
  .order-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
