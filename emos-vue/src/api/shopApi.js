import api from './index.js';

/**
 * 商店相关 API
 * 包含商品、分类、商户管理
 */
const shopApi = {
  // ==================== 商品管理 ====================
  
  /**
   * 获取商品列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   * @param {number} params.category_id - 分类ID
   * @param {number} params.seller_id - 商户ID
   * @param {string} params.name - 商品名（搜索）
   * @param {string} params.sort_by - 排序字段
   * @param {string} params.sort_order - 排序方向
   * @param {number} params.is_up - 是否上架
   */
  getProductList(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.seller_id) query.append('seller_id', params.seller_id);
    if (params.name !== undefined && params.name !== null) query.append('name', params.name);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);
    if (params.is_up !== undefined && params.is_up !== null) query.append('is_up', params.is_up);
    
    return api.get(`/api/shop/product/list?${query.toString()}`);
  },
  
  /**
   * 获取商品详情
   * @param {number} productId - 商品ID
   */
  getProductInfo(productId) {
    return api.get('/api/shop/product/info', { product_id: productId });
  },
  
  /**
   * 创建或更新商品
   * @param {Object} data - 商品数据
   */
  createOrUpdateProduct(data) {
    return api.post('/api/shop/product/createOrUpdate', data);
  },
  
  /**
   * 删除商品
   * @param {number} productId - 商品ID
   */
  deleteProduct(productId) {
    return api.delete('/api/shop/product/delete', { product_id: productId });
  },
  
  /**
   * 上架/下架商品
   * @param {number} productId - 商品ID
   * @param {boolean} isUp - 是否上架
   */
  updateProductStatus(productId, isUp) {
    return api.put('/api/shop/product/up', { 
      product_id: productId, 
      is_up: isUp 
    });
  },
  
  /**
   * 商品排序
   * @param {Array} productIds - 商品ID数组（按新顺序排列）
   */
  sortProducts(productIds) {
    return api.put('/api/shop/product/sort', { product_ids: productIds });
  },
  
  // ==================== 分类管理 ====================
  
  /**
   * 获取分类列表
   * @param {Object} params - 查询参数
   * @param {number} params.seller_id - 商户ID
   */
  getCategoryList(params = {}) {
    const query = new URLSearchParams();
    if (params.seller_id) query.append('seller_id', params.seller_id);
    
    return api.get(`/api/shop/category/list?${query.toString()}`);
  },
  
  /**
   * 创建分类
   * @param {Object} data - 分类数据
   */
  createCategory(data) {
    return api.post('/api/shop/category/create', data);
  },
  
  /**
   * 删除分类
   * @param {number} categoryId - 分类ID
   */
  deleteCategory(categoryId) {
    return api.delete('/api/shop/category/delete', { category_id: categoryId });
  },
  
  /**
   * 分类排序
   * @param {Array} categoryIds - 分类ID数组（按新顺序排列）
   */
  sortCategories(categoryIds) {
    return api.put('/api/shop/category/sort', { category_ids: categoryIds });
  },
  
  // ==================== 商户管理 ====================
  
  /**
   * 获取商户基本信息
   * @param {Object} params - 查询参数
   * @param {number} params.seller_id - 商户ID（可选，不传则获取当前用户的店铺）
   */
  getSellerBase(params = {}) {
    const query = new URLSearchParams();
    if (params.seller_id) query.append('seller_id', params.seller_id);
    
    return api.get(`/api/shop/seller/base?${query.toString()}`);
  },
  
  /**
   * 申请成为商户
   * @param {Object} data - 申请数据
   */
  applySeller(data) {
    return api.post('/api/shop/seller/apply', data);
  },
  
  /**
   * 更新商户信息
   * @param {Object} data - 商户数据
   */
  updateSeller(data) {
    return api.post('/api/shop/seller/update', data);
  }
};

export default shopApi;
