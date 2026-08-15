import { createApi } from './factory.js'
import { buildQuery } from './index.js'

export const viewingApi = createApi({
  requests: {
    method: 'get',
    url: (params = {}) => `/api/video/record/request?${buildQuery(params)}`,
  },
})

export default viewingApi
