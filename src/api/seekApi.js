import { createApi } from './factory.js'

const seekApi = createApi({
  create: {
    method: 'post',
    url: '/api/seek',
    body: (data) => data,
  },
  apply: {
    method: 'put',
    url: (itemType, itemId) => `/api/seek/apply?item_type=${itemType}&item_id=${itemId}`,
  },
  claim: {
    method: 'put',
    url: '/api/seek/claim',
    body: (seekId, type = 'confirm') => ({ seek_id: seekId, type }),
  },
  urge: {
    method: 'put',
    url: '/api/seek/urge',
    body: (seekId, carrot) => ({ seek_id: seekId, carrot }),
  },
})

export default seekApi
