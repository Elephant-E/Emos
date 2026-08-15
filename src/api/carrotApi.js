import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const carrotApi = createApi({
  history: {
    method: 'get',
    url: (params = {}) => `/api/carrot/history?${buildQuery(params)}`,
  },
  rank: { method: 'get', url: '/api/rank/carrot' },
  transfer: {
    method: 'put',
    url: '/api/carrot/transfer',
    body: (userId, amount) => ({ user_id: userId, carrot: amount }),
  },
})

export default carrotApi
