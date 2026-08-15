import api, { buildQuery } from './index.js';

const redpacketApi = {
  create(data) {
    return api.post('/api/redPacket/create', data);
  },

  receive(redPacketId, params = {}) {
    const qs = buildQuery({ red_packet_id: redPacketId, ...params });
    return api.get(`/api/redPacket/receive?${qs}`);
  }
};

export default redpacketApi;
