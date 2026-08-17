<template>
  <div v-show="visible" class="tab-content active">
    <div class="toolbar">
      <SegmentedControl
        :tabs="categoryTabs"
        v-model="productCategoryId"
      />
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input
          type="text"
          class="search-input"
          v-model="productSearchQuery"
          placeholder="搜索商品名称..."
        >
      </div>
      <div class="cloud-buttons">
        <button
          class="cloud-btn"
          @click="productViewMode = productViewMode === 'grid' ? 'list' : 'grid'"
          :title="productViewMode === 'grid' ? '列表视图' : '网格视图'"
        >
          <i :class="productViewMode === 'grid' ? 'fas fa-list' : 'fas fa-th-large'"></i>
        </button>
        <button class="cloud-btn" @click="openProductModal()" title="添加商品">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="product-grid" :class="{ 'product-grid--list': productViewMode === 'list' }">
      <template v-if="isProductsLoading">
        <template v-if="productViewMode === 'grid'">
          <div
            v-for="i in 4"
            :key="`skeleton-${i}`"
            class="product-card skeleton-card"
          >
            <div class="product-cover">
              <div class="image-placeholder"></div>
            </div>
            <div class="product-info">
              <div class="skeleton-text skeleton-w80 skeleton-h16" style="margin-bottom: 8px;"></div>
              <div class="skeleton-text-sm skeleton-w60" style="margin-bottom: 12px;"></div>
              <div class="skeleton-text-sm skeleton-w40 skeleton-h20"></div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="list-group">
            <div
              v-for="i in 5"
              :key="`list-skeleton-${i}`"
              class="list-row"
            >
              <i class="fas fa-grip-vertical drag-handle"></i>
              <div class="product-thumb-skeleton">
                <div class="skeleton-text" style="width: 100%; height: 100%; border-radius: 12px;"></div>
              </div>
              <div class="list-row__content">
                <div class="skeleton-text skeleton-w40 skeleton-h16" style="margin-bottom: 8px;"></div>
                <div class="skeleton-text-sm skeleton-w60" style="margin-bottom: 8px;"></div>
                <div class="skeleton-text-sm skeleton-w80"></div>
              </div>
              <div class="list-row__actions">
                <div class="skeleton-text-sm skeleton-w32 skeleton-h32 skeleton-r8"></div>
                <div class="skeleton-text-sm skeleton-w32 skeleton-h32 skeleton-r8"></div>
                <div class="skeleton-text-sm skeleton-w32 skeleton-h32 skeleton-r8"></div>
              </div>
            </div>
          </div>
        </template>
      </template>

      <template v-else-if="filteredProducts.length === 0">
        <div class="list-empty" style="grid-column: 1 / -1;">
          <i class="fas fa-box-open"></i>
          <p>暂无商品</p>
        </div>
      </template>

      <template v-else>
        <template v-if="productViewMode === 'grid'">
          <div
            v-for="product in filteredProducts"
            :key="product.product_id"
            class="product-card product-manage-card"
          >
            <div class="product-cover">
              <span :class="['product-badge', product.is_up ? 'badge-up' : 'badge-down']">
                {{ product.is_up ? '已上架' : '已下架' }}
              </span>
              <div v-if="!product.cover_url" class="image-placeholder">
                <i class="fas fa-image"></i>
              </div>
              <img v-else :src="product.cover_url" :alt="product.name" loading="lazy">
            </div>
            <div class="product-info">
              <div class="product-name">{{ product.name }}</div>
              <div v-if="product.description" class="product-desc">{{ product.description }}</div>
              <div v-if="product.category_name" class="product-desc">{{ product.category_name }}</div>

              <div class="price-row product-price-row">
                <span class="price-current">
                  <i class="fas fa-carrot"></i>{{ product.price || product.price_origin }}
                </span>
                <span v-if="product.price_origin && product.price" class="price-origin">
                  <i class="fas fa-carrot"></i>{{ product.price_origin }}
                </span>
                <div class="product-meta-inline">
                  <span class="stock-badge">库存 {{ product.stock }}</span>
                  <span class="stock-badge sales-badge">已售 {{ product.sales }}</span>
                </div>
              </div>

              <div class="product-actions">
                <button
                  class="action-btn-manage"
                  :title="product.is_up ? '下架' : '上架'"
                  @click="toggleProductStatus(product)"
                >
                  <i :class="product.is_up ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                </button>

                <button
                  class="action-btn-manage"
                  title="编辑"
                  @click="openProductModal(product)"
                >
                  <i class="fas fa-pen"></i>
                </button>

                <button
                  class="action-btn-manage danger"
                  title="删除"
                  @click="deleteProduct(product)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="list-group" ref="productListRef">
            <div
              v-for="product in filteredProducts"
              :key="product.product_id"
              class="list-row"
            >
              <i class="fas fa-grip-vertical drag-handle"></i>
              <div class="product-thumb">
                <div v-if="!product.cover_url" class="product-thumb-placeholder">
                  <i class="fas fa-image"></i>
                </div>
                <img v-else :src="product.cover_url" :alt="product.name" loading="lazy">
              </div>

              <div class="list-row__content">
                <div class="list-row__title">
                  {{ product.name }}
                  <span class="product-status-tag">{{ product.is_up ? '已上架' : '已下架' }}</span>
                </div>
                <div class="list-row__subtitle">
                  <span v-if="product.description">{{ product.description }}</span>
                  <span v-if="product.category_name" class="product-category-tag">{{ product.category_name }}</span>
                </div>
                <div class="product-meta-row">
                  <span class="meta-item">售价 {{ product.price || product.price_origin }}</span>
                  <span v-if="product.price_origin && product.price" class="meta-item">原价 {{ product.price_origin }}</span>
                  <span class="meta-item">库存 {{ product.stock }}</span>
                  <span class="meta-item">已售 {{ product.sales }}</span>
                </div>
              </div>
              <div class="list-row__actions" @click.stop>
                <button
                  class="action-btn-manage"
                  :title="product.is_up ? '下架' : '上架'"
                  @click="toggleProductStatus(product)"
                >
                  <i :class="product.is_up ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                </button>

                <button
                  class="action-btn-manage"
                  title="编辑"
                  @click="openProductModal(product)"
                >
                  <i class="fas fa-pen"></i>
                </button>

                <button
                  class="action-btn-manage danger"
                  title="删除"
                  @click="deleteProduct(product)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>

  <BaseModal
    :visible="showProductModal"
    :title="productForm.product_id ? '编辑商品' : '新增商品'"
    size="lg"
    @close="closeProductModal"
  >
    <div class="form-group">
      <label class="form-label">商品名称</label>
      <input
        v-model="productForm.name"
        type="text"
        class="modal-input"
        placeholder="请输入商品名称（50字内）"
        maxlength="50"
      >
    </div>

    <div class="form-group">
      <label class="form-label">商品分类</label>
      <select v-model="productForm.category_id" class="modal-input modal-select">
        <option :value="null">请选择分类</option>
        <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
          {{ cat.name }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">商品封面</label>
      <ImageUploader
        :model-value="productForm.cover_url"
        @change="(data) => { productForm.cover_url = data.url || '' }"
        :max-size="5 * 1024 * 1024"
        placeholder-text="点击选择图片"
        hint-text="支持 JPG、PNG，≤5MB"
      />
    </div>

    <div class="form-group">
      <label class="form-label">商品简介</label>
      <textarea
        v-model="productForm.description"
        class="modal-textarea"
        placeholder="请简单介绍您的商品（200字内）"
        maxlength="200"
        rows="3"
      ></textarea>
      <div class="form-hint">{{ productForm.description?.length || 0 }}/200</div>
    </div>

    <div class="form-group">
      <label class="form-label">兑换方式</label>
      <textarea
        v-model="productForm.exchange_way"
        class="modal-textarea"
        placeholder="例如：购买后自提、快递发货等（1000字内）"
        maxlength="1000"
        rows="3"
      ></textarea>
      <div class="form-hint">{{ productForm.exchange_way?.length || 0 }}/1000</div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">价格</label>
        <input
          v-model.number="productForm.price"
          type="number"
          class="modal-input"
          placeholder="1 - 50000"
          min="1"
          max="50000"
        >
      </div>

      <div class="form-group">
        <label class="form-label">原价</label>
        <input
          v-model.number="productForm.price_origin"
          type="number"
          class="modal-input"
          placeholder="1 - 50000"
          min="1"
          max="50000"
        >
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">库存</label>
        <input
          v-model.number="productForm.stock"
          type="number"
          class="modal-input"
          placeholder="1 - 5000"
          min="1"
          max="5000"
        >
      </div>

      <div class="form-group">
        <label class="form-label">排序</label>
        <input
          v-model.number="productForm.sort"
          type="number"
          class="modal-input"
          placeholder="1 - 5000"
          min="1"
          max="5000"
        >
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">开售时间</label>
        <input
          v-model="productForm.time_start"
          type="datetime-local"
          class="modal-input"
        >
      </div>

      <div class="form-group">
        <label class="form-label">停售时间</label>
        <input
          v-model="productForm.time_end"
          type="datetime-local"
          class="modal-input"
        >
      </div>
    </div>

    <div class="form-group">
      <label class="form-label form-label-switch">
        <span>是否上架</span>
        <label class="switch">
          <input type="checkbox" v-model="productForm.is_up">
          <span class="slider"></span>
        </label>
      </label>
    </div>

    <template #footer>
      <button class="modal-btn secondary" @click="closeProductModal">取消</button>
      <button class="modal-btn primary" @click="saveProduct" :disabled="isProductSaving">
        <i v-if="isProductSaving" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>保存</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import shopApi from '@/api/shopApi.js'
import ImageUploader from '@/components/ImageUploader.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  sellerInfo: {
    type: Object,
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['updateStats', 'reloadCategories'])

const products = ref([])
const isProductsLoading = ref(false)
const productSearchQuery = ref('')
const productCategoryId = ref('all')
const productViewMode = ref('list')
const showProductModal = ref(false)
const isProductSaving = ref(false)
const productListRef = ref(null)
let productSortable = null
const isSorting = ref(false)

const categoryTabs = computed(() => {
  const tabs = [{ value: 'all', label: '全部' }]
  for (const cat of props.categories) {
    tabs.push({ value: String(cat.category_id), label: cat.name })
  }
  return tabs
})

const productForm = ref({
  product_id: null,
  category_id: null,
  cover_url: '',
  name: '',
  description: '',
  exchange_way: '',
  price: null,
  price_origin: null,
  stock: null,
  is_up: true,
  time_start: '',
  time_end: '',
  sort: 80
})

const filteredProducts = computed(() => {
  return products.value.filter(product => {
    if (!product) return false
    const searchMatch = !productSearchQuery.value ||
      product.name.toLowerCase().includes(productSearchQuery.value.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(productSearchQuery.value.toLowerCase()))
    const categoryMatch = productCategoryId.value === 'all' || String(product.category_id) === productCategoryId.value
    return searchMatch && categoryMatch
  })
})

const loadProducts = async () => {
  try {
    isProductsLoading.value = true
    const params = {
      seller_id: props.sellerInfo?.seller_id,
      page: 1,
      page_size: 100,
      sort_by: 'sort',
      sort_order: 'asc'
    }

    const res = await shopApi.getProductList(params)
    if (res && res.items) {
      const allProducts = [...res.items]
      let currentPage = 1
      const totalPages = Math.ceil(res.total / params.page_size)

      while (currentPage < totalPages) {
        currentPage++
        const nextPageRes = await shopApi.getProductList({ ...params, page: currentPage })
        if (nextPageRes && nextPageRes.items) {
          allProducts.push(...nextPageRes.items)
        } else {
          break
        }
      }

      products.value = allProducts
      emit('updateStats', {
        productCount: allProducts.length,
        totalSales: allProducts.reduce((sum, item) => sum + (item.sales || 0), 0)
      })
    } else {
      products.value = []
      emit('updateStats', { productCount: 0, totalSales: 0 })
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    showToast('加载商品失败', 'error')
  } finally {
    isProductsLoading.value = false
  }
}


const openProductModal = (product = null) => {
  if (product) {
    productForm.value = {
      product_id: product.product_id,
      category_id: product.category_id,
      cover_url: product.cover_url || '',
      name: product.name,
      description: product.description || '',
      exchange_way: product.exchange_way || '',
      price: product.price,
      price_origin: product.price_origin,
      stock: product.stock,
      is_up: product.is_up,
      time_start: product.time_start || '',
      time_end: product.time_end || '',
      sort: product.sort
    }
  } else {
    productForm.value = {
      product_id: null,
      category_id: props.categories.length > 0 ? props.categories[0].category_id : null,
      cover_url: '',
      name: '',
      description: '',
      exchange_way: '',
      price: null,
      price_origin: null,
      stock: null,
      is_up: true,
      time_start: '',
      time_end: '',
      sort: 80
    }
  }
  showProductModal.value = true
}

const closeProductModal = () => {
  showProductModal.value = false
  productForm.value = {
    product_id: null,
    category_id: props.categories.length > 0 ? props.categories[0].category_id : null,
    cover_url: '',
    name: '',
    description: '',
    exchange_way: '',
    price: null,
    price_origin: null,
    stock: null,
    is_up: true,
    time_start: '',
    time_end: '',
    sort: 80
  }
}

const saveProduct = async () => {
  if (!productForm.value.name.trim()) {
    showToast('请输入商品名称', 'error')
    return
  }
  if (!productForm.value.category_id) {
    showToast('请选择商品分类', 'error')
    return
  }
  if (!productForm.value.price) {
    showToast('请输入商品价格', 'error')
    return
  }
  if (!productForm.value.stock) {
    showToast('请输入商品库存', 'error')
    return
  }
  if (!productForm.value.sort) {
    showToast('请输入排序值', 'error')
    return
  }

  try {
    isProductSaving.value = true

    const res = await shopApi.createOrUpdateProduct({
      product_id: productForm.value.product_id,
      category_id: productForm.value.category_id,
      cover_url: productForm.value.cover_url,
      name: productForm.value.name.trim(),
      description: productForm.value.description.trim(),
      exchange_way: productForm.value.exchange_way.trim(),
      price: productForm.value.price,
      price_origin: productForm.value.price_origin,
      stock: productForm.value.stock,
      is_up: productForm.value.is_up,
      time_start: productForm.value.time_start || null,
      time_end: productForm.value.time_end || null,
      sort: productForm.value.sort
    })

    showToast(productForm.value.product_id ? '编辑成功' : '添加成功', 'success')
    closeProductModal()
    await loadProducts()
    emit('reloadCategories')
  } catch (error) {
    console.error('保存商品失败:', error)
    showToast(error.message || '保存失败，请重试', 'error')
  } finally {
    isProductSaving.value = false
  }
}

const deleteProduct = async (product) => {
  if (!(await confirmDialog(`确定要删除商品「${product.name}」吗？`, '确认', true))) {
    return
  }

  try {
    await shopApi.deleteProduct(product.product_id)
    showToast('删除成功', 'success')
    await loadProducts()
  } catch (error) {
    console.error('删除商品失败:', error)
    showToast(error.message || '删除失败，请重试', 'error')
  }
}

const toggleProductStatus = async (product) => {
  try {
    await shopApi.updateProductStatus(product.product_id)
    showToast(product.is_up ? '已下架' : '已上架', 'success')
    await loadProducts()
  } catch (error) {
    console.error('切换状态失败:', error)
    showToast(error.message || '操作失败，请重试', 'error')
  }
}

const initProductDraggable = () => {
  if (productListRef.value && window.Sortable) {
    productSortable = new window.Sortable(productListRef.value, {
      animation: 200,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async (evt) => {
        await handleProductSort(evt)
      }
    })
  }
}

const destroyProductDraggable = () => {
  if (productSortable) {
    productSortable.destroy()
    productSortable = null
  }
}

const handleProductSort = async (evt) => {
  if (isSorting.value) return

  const oldIndex = evt.oldIndex
  const newIndex = evt.newIndex

  if (oldIndex === newIndex) return

  try {
    isSorting.value = true

    const item = products.value.splice(oldIndex, 1)[0]
    products.value.splice(newIndex, 0, item)

    const updates = []
    products.value.forEach((product, index) => {
      const newSort = (index + 1) * 10
      if (product.sort !== newSort) {
        updates.push(
          shopApi.sortProducts(product.product_id, newSort)
        )
      }
    })

    if (updates.length > 0) {
      await Promise.all(updates)
    }

    await loadProducts()
    showToast('排序已更新', 'success')
  } catch (error) {
    console.error('排序失败:', error)
    showToast('排序失败，请重试', 'error')
    await loadProducts()
  } finally {
    isSorting.value = false
  }
}

watch(productListRef, (newRef) => {
  if (newRef) {
    nextTick(() => initProductDraggable())
  }
})

onMounted(async () => {
  await loadProducts()
  await nextTick()
  initProductDraggable()
})

onUnmounted(() => {
  destroyProductDraggable()
})

defineExpose({ loadProducts })
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

.product-grid--list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.drag-handle {
  color: var(--system-tertiary);
  font-size: 1rem;
  margin-right: 0.8rem;
  flex-shrink: 0;
  cursor: grab;
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

.product-status-tag {
  margin-left: 0.5rem;
  font: var(--callout);
  color: var(--system-tertiary);
}

.product-category-tag {
  margin-left: 0.5rem;
}

.product-meta-row {
  margin-top: 0.3rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.list-row__actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
  align-self: center;
}

.product-manage-card { cursor: default; user-select: none; }

.product-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  font: var(--callout-emphasized);
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  z-index: 2;
}

.product-badge.badge-up {
  background: color-mix(in srgb, var(--success) 85%, transparent);
  color: #fff;
}

.product-badge.badge-down {
  background: color-mix(in srgb, var(--system-tertiary) 60%, transparent);
  color: #fff;
}

.product-meta-inline { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

.product-price-row { flex-wrap: wrap; gap: 0.4rem; padding-top: 0.6rem; margin-bottom: 0; }
.product-price-row .price-current { display: inline-flex; align-items: center; gap: 4px; }
.product-price-row .price-origin { display: inline-flex; align-items: center; gap: 3px; }
.product-price-row .product-meta-inline { margin-left: auto; display: flex; align-items: center; gap: 0.4rem; }

.product-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 0.5px solid var(--label-divider);
}


.sortable-ghost { opacity: 0.4; background: var(--system-quinary); }
.sortable-drag { opacity: 0.9; box-shadow: var(--shadow-lg); cursor: grabbing !important; }

@media (max-width: 768px) {
  .drag-handle { font-size: 0.85rem !important; margin-right: 0.5rem !important; }
  .product-thumb { width: 45px; height: 45px; margin-right: 0.6rem; border-radius: 8px; }
  .product-thumb-skeleton { width: 45px; height: 45px; margin-right: 0.6rem; border-radius: 8px; }
  .list-row__title { font-size: 0.85rem; }
  .meta-item { font-size: 0.75rem; line-height: 1.4; }
  .action-btn-manage { width: 36px; height: 36px; font-size: 0.9rem; }
}
</style>
