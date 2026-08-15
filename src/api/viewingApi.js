import api, { buildQuery } from './index.js';

export const viewingApi = {
  requests(params = {}) {
    const qs = buildQuery(params);
    return api.get(`/api/video/record/request?${qs}`);
  },
};

export default viewingApi;
