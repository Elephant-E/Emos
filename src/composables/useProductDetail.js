import { ref } from 'vue'
import shopApi from '@/api/shopApi.js'
import { showToast } from '@/utils/toast.js'

export function useProductDetail() {
  const showDetailModal = ref(false)
  const currentProductId = ref(null)
  const currentProduct = ref(null)
  const detailLoading = ref(false)

  const openDetail = async (id) => {
    currentProductId.value = id
    detailLoading.value = true
    showDetailModal.value = true
    try {
      const res = await shopApi.getProductInfo(id)
      if (res) {
        currentProduct.value = { ...res, cover_url: res.cover_url || null }
      }
    } catch (error) {
      showToast('加载商品详情失败', 'error')
    } finally {
      detailLoading.value = false
    }
  }

  const closeDetail = () => {
    showDetailModal.value = false
    currentProductId.value = null
    currentProduct.value = null
    detailLoading.value = false
  }

  return {
    showDetailModal, currentProductId, currentProduct, detailLoading,
    openDetail, closeDetail
  }
}