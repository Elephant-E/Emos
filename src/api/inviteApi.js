import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const inviteApi = createApi({
  info: { method: 'get', url: '/api/invite/info' },
  history: {
    method: 'get',
    url: (params = {}) => `/api/invite/history?${buildQuery(params)}`,
  },
  send: {
    method: 'post',
    url: '/api/invite',
    body: (userId) => ({ invite_user_id: userId }),
  },
  revoke: {
    method: 'post',
    url: '/api/invite/revoke',
    body: (userId) => ({ user_id: userId }),
  },
  updateRemark: {
    method: 'put',
    url: '/api/invite/remark',
    body: (userId, remark) => ({ user_id: userId, remark }),
  },
})

export default inviteApi
