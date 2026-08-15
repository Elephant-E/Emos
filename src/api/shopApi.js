import api, { buildQuery } from './index.js';

const shopApi = {
  getProductList(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/shop/product/list?${qs}`);
  },
  
  getProductInfo(productId) {
    return api.get('/api/shop/product/info', { product_id: productId });
  },
  
  createOrUpdateProduct(data) {
    return api.post('/api/shop/product/createOrUpdate', data);
  },
  
  deleteProduct(productId) {
    return api.delete(`/api/shop/product/delete?product_id=${productId}`);
  },
  
  updateProductStatus(productId, isUp) {
    return api.put('/api/shop/product/up', { 
      product_id: productId, 
      is_up: isUp 
    });
  },
  
  sortProducts(productIds) {
    return api.put('/api/shop/product/sort', { product_ids: productIds });
  },
  
  getCategoryList(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/shop/category/list?${qs}`);
  },
  
  createCategory(data) {
    return api.post('/api/shop/category/create', data);
  },
  
  deleteCategory(categoryId) {
    return api.delete(`/api/shop/category/delete?category_id=${categoryId}`);
  },
  
  sortCategories(categoryIds) {
    return api.put('/api/shop/category/sort', { category_ids: categoryIds });
  },
  
  getSellerBase(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/shop/seller/base?${qs}`);
  },
  
  applySeller(data) {
    return api.post('/api/shop/seller/apply', data);
  },
  
  updateSeller(data) {
    return api.post('/api/shop/seller/update', data);
  }
};

export default shopApi;
