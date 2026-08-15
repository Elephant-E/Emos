import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const shopApi = createApi({
  getProductList: {
    method: 'get',
    url: (params = {}) => `/api/shop/product/list?${buildQuery(params)}`,
  },
  getProductInfo: {
    method: 'get',
    url: '/api/shop/product/info',
    params: (productId) => ({ product_id: productId }),
  },
  createOrUpdateProduct: {
    method: 'post',
    url: '/api/shop/product/createOrUpdate',
    body: (data) => data,
  },
  deleteProduct: {
    method: 'delete',
    url: (productId) => `/api/shop/product/delete?product_id=${productId}`,
  },
  updateProductStatus: {
    method: 'put',
    url: '/api/shop/product/up',
    body: (productId, isUp) => ({ product_id: productId, is_up: isUp }),
  },
  sortProducts: {
    method: 'put',
    url: '/api/shop/product/sort',
    body: (productIds) => ({ product_ids: productIds }),
  },
  getCategoryList: {
    method: 'get',
    url: (params = {}) => `/api/shop/category/list?${buildQuery(params)}`,
  },
  createCategory: {
    method: 'post',
    url: '/api/shop/category/create',
    body: (data) => data,
  },
  deleteCategory: {
    method: 'delete',
    url: (categoryId) => `/api/shop/category/delete?category_id=${categoryId}`,
  },
  sortCategories: {
    method: 'put',
    url: '/api/shop/category/sort',
    body: (categoryIds) => ({ category_ids: categoryIds }),
  },
  getSellerBase: {
    method: 'get',
    url: (params = {}) => `/api/shop/seller/base?${buildQuery(params)}`,
  },
  applySeller: {
    method: 'post',
    url: '/api/shop/seller/apply',
    body: (data) => data,
  },
  updateSeller: {
    method: 'post',
    url: '/api/shop/seller/update',
    body: (data) => data,
  },
})

export default shopApi
