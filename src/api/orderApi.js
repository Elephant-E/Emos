import api, { buildQuery } from './index.js';

const orderApi = {
  getUserOrderList(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/shop/order/user/list?${qs}`);
  },
  
  createOrder(data) {
    return api.post('/api/shop/order/user/create', data);
  },
  
  payOrder(orderNo) {
    return api.post('/api/shop/order/user/pay', { order_no: orderNo });
  },
  
  closeOrder(orderNo) {
    return api.post('/api/shop/order/user/close', { order_no: orderNo });
  },
  
  urgeDelivery(orderNo) {
    return api.put('/api/shop/order/user/urge', { order_no: orderNo });
  },
  
  deleteOrder(orderNo) {
    return api.delete(`/api/shop/order/user/order?order_no=${orderNo}`);
  },
  
  getShopOrderList(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/shop/order/shop/order?${qs}`);
  },
  
  addRemark(orderNo, remark) {
    return api.post('/api/shop/order/shop/remark', { 
      order_no: orderNo,
      remark 
    });
  },
  
  confirmDelivery(orderNo, isDelivery = true) {
    return api.put('/api/shop/order/shop/delivery', { 
      order_no: orderNo,
      is_delivery: isDelivery 
    });
  },
  
  deleteShopOrder(orderNo) {
    return api.delete(`/api/shop/order/shop/order?order_no=${orderNo}`);
  }
};

export default orderApi;
