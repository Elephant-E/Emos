import { createApi } from './factory.js'
import { buildQuery } from './index.js'

const redpacketApi = createApi({
  create: {
    method: 'post',
    url: '/api/redPacket/create',
    body: (data) => data,
  },
  receive: {
    method: 'get',
    url: (redPacketId, params = {}) =>
      `/api/redPacket/receive?${buildQuery({ red_packet_id: redPacketId, ...params })}`,
  },
})

export default redpacketApi
