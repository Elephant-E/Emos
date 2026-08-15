import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const lotteryApi = createApi({
  create: {
    method: 'post',
    url: '/api/lottery/create',
    body: (data) => data,
  },
  list: {
    method: 'get',
    url: (params = {}) => `/api/lottery/list?${buildQuery(params)}`,
  },
  detail: {
    method: 'get',
    url: (lotteryId) => `/api/lottery/${lotteryId}`,
  },
  cancel: {
    method: 'delete',
    url: (lotteryId) => `/api/lottery/${lotteryId}`,
  },
  winners: {
    method: 'get',
    url: (lotteryId, params = {}) => `/api/lottery/${lotteryId}/winners?${buildQuery(params)}`,
  },
})

export default lotteryApi
