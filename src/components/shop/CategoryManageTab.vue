<template>
  <div v-show="visible" class="tab-content active">
    <div class="category-header">
      <h3 class="category-title">商品分类</h3>
      <div class="cloud-buttons">
        <button class="cloud-btn" @click="openCategoryModal()" title="新增分类">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="list-group" ref="categoryListRef">
      <template v-if="isCategoriesLoading">
        <div
          v-for="i in 4"
          :key="`category-skeleton-${i}`"
          class="list-row"
        >
          <i class="fas fa-grip-vertical drag-handle"></i>
          <div class="list-row__content">
            <div class="skeleton-text skeleton-w30 skeleton-h16" style="margin-bottom: 8px;"></div>
            <div class="skeleton-text-sm skeleton-w20"></div>
          </div>
          <div class="list-row__actions">
            <div class="skeleton-text-sm skeleton-w32 skeleton-h32 skeleton-r8"></div>
          </div>
        </div>
      </template>

      <div v-else-if="categories.length === 0" class="list-empty">
        <i class="fas fa-layer-group"></i>
        <p>暂无分类</p>
      </div>

      <template v-else>
        <div
          v-for="category in categories"
          :key="category.category_id"
          class="list-row"
        >
          <i class="fas fa-grip-vertical drag-handle"></i>
          <div class="list-row__content">
            <div class="list-row__title">{{ category.name }}</div>
            <div class="list-row__subtitle">
              <span class="meta-item"><i class="fas fa-sort-amount-down"></i> 排序: {{ category.sort }}</span>
            </div>
          </div>
          <div class="list-row__actions">
            <button
              class="action-btn-manage danger"
              @click="deleteCategory(category)"
              title="删除"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>

  <BaseModal
    :visible="showCategoryModal"
    :title="categoryForm.category_id ? '编辑分类' : '新增分类'"
    @close="closeCategoryModal"
  >
    <div class="form-group">
      <label class="form-label">分类名称</label>
      <input
        v-model="categoryForm.name"
        type="text"
        class="modal-input"
        placeholder="请输入分类名称（20字内）"
        maxlength="20"
      >
    </div>

    <div class="form-group">
      <label class="form-label">排序</label>
      <input
        v-model.number="categoryForm.sort"
        type="number"
        class="modal-input"
        placeholder="1 - 100，越小越靠前"
        min="1"
        max="100"
      >
      <div class="form-hint">数字越小，分类越靠前</div>
    </div>

    <template #footer>
      <button class="modal-btn secondary" @click="closeCategoryModal">取消</button>
      <button class="modal-btn primary" @click="saveCategory" :disabled="isCategorySaving">
        <i v-if="isCategorySaving" class="fas fa-circle-notch fa-spin"></i>
        <span v-else>保存</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { showToast } from '@/utils/toast.js'
import { confirmDialog } from '@/utils/confirm.js'
import shopApi from '@/api/shopApi.js'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  sellerInfo: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['updateStats', 'reloadProducts'])

const categories = ref([])
const isCategoriesLoading = ref(false)
const showCategoryModal = ref(false)
const isCategorySaving = ref(false)
const categoryListRef = ref(null)
let categorySortable = null
const isSorting = ref(false)

const categoryForm = ref({
  category_id: null,
  name: '',
  sort: 1
})

const loadCategories = async () => {
  try {
    isCategoriesLoading.value = true
    const res = await shopApi.getCategoryList({ seller_id: props.sellerInfo?.seller_id })
    if (res && Array.isArray(res)) {
      categories.value = res
      emit('updateStats', { categoryCount: res.length })
    }
  } catch (error) {
    console.error('加载分类失败:', error)
  } finally {
    isCategoriesLoading.value = false
  }
}

const openCategoryModal = (category = null) => {
  if (category) {
    categoryForm.value = {
      category_id: category.category_id,
      name: category.name,
      sort: category.sort
    }
  } else {
    categoryForm.value = {
      category_id: null,
      name: '',
      sort: categories.value.length > 0 ? Math.max(...categories.value.map(c => c.sort)) + 1 : 1
    }
  }
  showCategoryModal.value = true
}

const closeCategoryModal = () => {
  showCategoryModal.value = false
  categoryForm.value = {
    category_id: null,
    name: '',
    sort: 1
  }
}

const saveCategory = async () => {
  if (!categoryForm.value.name.trim()) {
    showToast('请输入分类名称', 'error')
    return
  }
  if (!categoryForm.value.sort) {
    showToast('请输入排序值', 'error')
    return
  }

  try {
    isCategorySaving.value = true

    const res = await shopApi.createCategory({
      name: categoryForm.value.name.trim(),
      sort: categoryForm.value.sort
    })

    showToast('添加成功', 'success')
    closeCategoryModal()
    await loadCategories()
    emit('reloadProducts')
  } catch (error) {
    console.error('保存分类失败:', error)
    showToast(error.message || '保存失败，请重试', 'error')
  } finally {
    isCategorySaving.value = false
  }
}

const deleteCategory = async (category) => {
  if (!(await confirmDialog(`确定要删除分类「${category.name}」吗？`, '确认', true))) {
    return
  }

  try {
    await shopApi.deleteCategory(category.category_id)
    showToast('删除成功', 'success')
    await loadCategories()
    emit('reloadProducts')
  } catch (error) {
    console.error('删除分类失败:', error)
    showToast(error.message || '删除失败，请重试', 'error')
  }
}

const initCategoryDraggable = () => {
  if (categoryListRef.value && window.Sortable) {
    categorySortable = new window.Sortable(categoryListRef.value, {
      animation: 200,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async (evt) => {
        await handleCategorySort(evt)
      }
    })
  }
}

const destroyCategoryDraggable = () => {
  if (categorySortable) {
    categorySortable.destroy()
    categorySortable = null
  }
}

const handleCategorySort = async (evt) => {
  if (isSorting.value) return

  const oldIndex = evt.oldIndex
  const newIndex = evt.newIndex

  if (oldIndex === newIndex) return

  try {
    isSorting.value = true

    const item = categories.value.splice(oldIndex, 1)[0]
    categories.value.splice(newIndex, 0, item)

    const updates = []
    categories.value.forEach((category, index) => {
      const newSort = (index + 1) * 10
      if (category.sort !== newSort) {
        updates.push(
          shopApi.sortCategories(category.category_id, newSort)
        )
      }
    })

    if (updates.length > 0) {
      await Promise.all(updates)
    }

    await loadCategories()
    showToast('排序已更新', 'success')
  } catch (error) {
    console.error('排序失败:', error)
    showToast('排序失败，请重试', 'error')
    await loadCategories()
  } finally {
    isSorting.value = false
  }
}

watch(categoryListRef, (newRef) => {
  if (newRef) {
    nextTick(() => initCategoryDraggable())
  }
})

onMounted(async () => {
  await loadCategories()
  await nextTick()
  initCategoryDraggable()
})

onUnmounted(() => {
  destroyCategoryDraggable()
})

defineExpose({ loadCategories, categories })
</script>

<style scoped>
.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.category-title {
  font: var(--title-2-emphasized);
  color: var(--system-primary);
}

.drag-handle {
  color: var(--system-tertiary);
  font-size: 1rem;
  margin-right: 0.8rem;
  flex-shrink: 0;
  cursor: grab;
}

.list-row__actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
  align-self: center;
}

.sortable-ghost { opacity: 0.4; background: var(--system-quinary); }
.sortable-drag { opacity: 0.9; box-shadow: var(--shadow-lg); cursor: grabbing !important; }

@media (max-width: 768px) {
  .drag-handle { font-size: 0.85rem !important; margin-right: 0.5rem !important; }
}
</style>
