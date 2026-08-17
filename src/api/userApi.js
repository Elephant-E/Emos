import { createApi } from './factory.js'

export const userApi = createApi({
  getInfo: { method: 'get', url: '/api/user' },
  updatePseudonym: {
    method: 'put',
    url: (name) => `/api/user/pseudonym?name=${encodeURIComponent(name)}`,
  },
  agreeUploadAgreement: { method: 'put', url: '/api/user/agreeUploadAgreement' },
  setShowEmpty: {
    method: 'put',
    url: '/api/user/showEmpty',
    body: (showEmpty) => ({ is_show_empty: showEmpty }),
  },
  getLoginPassword: { method: 'get', url: '/api/user/passwordTemporary' },
  resetPassword: {
    method: 'put',
    url: '/api/user/passwordReset',
    body: (password) => ({ password }),
  },
  resetToken: { method: 'put', url: '/api/user/resetToken' },
  unbindTelegram: { method: 'delete', url: '/api/user/telegram' },
  setOriginalImage: {
    method: 'put',
    url: '/api/user/originalImage',
    body: (isOriginalImage) => ({ is_original_image: isOriginalImage }),
  },
  agreeDownAgreement: { method: 'put', url: '/api/user/agreeDownAgreement' },
  getBanList: { method: 'get', url: '/api/ban/list' },
  updateBanStatus: {
    method: 'put',
    url: '/api/ban/change',
    body: false,
    params: (type, userId, reason) => ({ type, user_id: userId, reason }),
  },
})

export default userApi
