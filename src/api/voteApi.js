import { createApi } from './factory.js'

const voteApi = createApi({
  create: {
    method: 'post',
    url: '/api/telegram/vote/create',
    body: (data) => data,
  },
  result: {
    method: 'get',
    url: (voteId) => `/api/telegram/vote/result?vote_id=${voteId}`,
  },
})

export default voteApi
