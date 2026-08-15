import { createApi } from './factory.js'

const signApi = createApi({
  getStatus: { method: 'get', url: '/api/sign/check' },
  submit: {
    method: 'put',
    url: (content) => content ? `/api/user/sign?content=${encodeURIComponent(content)}` : '/api/user/sign',
  },
  rank: { method: 'get', url: '/api/rank/sign' },
})

export default signApi
