import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const lotteryApi = createApi({
  create: {
    method: 'post',
    url: '/api/lottery/create',
    body: (data) => data,
  },
  cancel: {
    method: 'put',
    url: '/api/lottery/cancel',
    body: false,
    params: (lotteryId) => ({ lottery_id: lotteryId }),
  },
  stop: {
    method: 'put',
    url: '/api/lottery/stop',
    body: false,
    params: (lotteryId) => ({ lottery_id: lotteryId }),
  },
  winners: {
    method: 'get',
    url: (lotteryId, params = {}) => `/api/lottery/win?${buildQuery({ lottery_id: lotteryId, ...params })}`,
  },
})

export default lotteryApi
