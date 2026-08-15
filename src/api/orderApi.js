import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const orderApi = createApi({
  getUserOrderList: {
    method: 'get',
    url: (params = {}) => `/api/shop/order/user/list?${buildQuery(params)}`,
  },
  createOrder: {
    method: 'post',
    url: '/api/shop/order/user/create',
    body: (data) => data,
  },
  payOrder: {
    method: 'post',
    url: '/api/shop/order/user/pay',
    body: (orderNo) => ({ order_no: orderNo }),
  },
  closeOrder: {
    method: 'post',
    url: '/api/shop/order/user/close',
    body: (orderNo) => ({ order_no: orderNo }),
  },
  urgeDelivery: {
    method: 'put',
    url: '/api/shop/order/user/urge',
    body: (orderNo) => ({ order_no: orderNo }),
  },
  deleteOrder: {
    method: 'delete',
    url: (orderNo) => `/api/shop/order/user/order?order_no=${orderNo}`,
  },
  getShopOrderList: {
    method: 'get',
    url: (params = {}) => `/api/shop/order/shop/order?${buildQuery(params)}`,
  },
  addRemark: {
    method: 'post',
    url: '/api/shop/order/shop/remark',
    body: (orderNo, remark) => ({ order_no: orderNo, remark }),
  },
  confirmDelivery: {
    method: 'put',
    url: '/api/shop/order/shop/delivery',
    body: (orderNo, isDelivery = true) => ({ order_no: orderNo, is_delivery: isDelivery }),
  },
  deleteShopOrder: {
    method: 'delete',
    url: (orderNo) => `/api/shop/order/shop/order?order_no=${orderNo}`,
  },
})

export default orderApi
