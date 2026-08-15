import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const lineApi = createApi({
  list: {
    method: 'get',
    url: (params = {}) => {
      const qs = buildQuery(params)
      return `/api/proxy/line${qs ? '?' + qs : ''}`
    },
  },
  add: {
    method: 'post',
    url: '/api/proxy/line',
    body: (data) => data,
  },
  delete: {
    method: 'delete',
    url: (id) => `/api/proxy/line?id=${encodeURIComponent(id)}`,
  },
})

export default lineApi
