import api from './index.js';

/**
 * 订单相关 API
 * 包含用户订单和商户订单管理
 */
const orderApi = {
  // ==================== 用户订单 ====================
  
  /**
   * 获取用户订单列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   * @param {string} params.status - 订单状态
   */
  getUserOrderList(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.status) query.append('status', params.status);
    
    return api.get(`/api/shop/order/user/list?${query.toString()}`);
  },
  
  /**
   * 创建订单
   * @param {Object} data - 订单数据
   */
  createOrder(data) {
    return api.post('/api/shop/order/user/create', data);
  },
  
  /**
   * 支付订单
   * @param {number} orderId - 订单ID
   */
  payOrder(orderId) {
    return api.post('/api/shop/order/user/pay', { order_id: orderId });
  },
  
  /**
   * 关闭订单
   * @param {number} orderId - 订单ID
   */
  closeOrder(orderId) {
    return api.post('/api/shop/order/user/close', { order_id: orderId });
  },
  
  /**
   * 催发货
   * @param {number} orderId - 订单ID
   */
  urgeDelivery(orderId) {
    return api.put('/api/shop/order/user/urge', { order_id: orderId });
  },
  
  /**
   * 删除订单
   * @param {number} orderId - 订单ID
   */
  deleteOrder(orderId) {
    return api.delete('/api/shop/order/user/order', { order_id: orderId });
  },
  
  // ==================== 商户订单 ====================
  
  /**
   * 获取商户订单列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   * @param {string} params.status - 订单状态
   */
  getShopOrderList(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.status) query.append('status', params.status);
    
    return api.get(`/api/shop/order/shop/order?${query.toString()}`);
  },
  
  /**
   * 添加订单备注
   * @param {number} orderId - 订单ID
   * @param {string} remark - 备注内容
   */
  addRemark(orderId, remark) {
    return api.post('/api/shop/order/shop/remark', { 
      order_id: orderId, 
      remark 
    });
  },
  
  /**
   * 确认发货
   * @param {number} orderId - 订单ID
   */
  confirmDelivery(orderId) {
    return api.put('/api/shop/order/shop/delivery', { order_id: orderId });
  },
  
  /**
   * 删除商户订单
   * @param {number} orderId - 订单ID
   */
  deleteShopOrder(orderId) {
    return api.delete('/api/shop/order/shop/order', { order_id: orderId });
  }
};

export default orderApi;
