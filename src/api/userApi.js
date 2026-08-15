import api from './index.js';

export const userApi = {
  getInfo() {
    return api.get('/api/user');
  },

  updatePseudonym(name) {
    return api.put(`/api/user/pseudonym?name=${encodeURIComponent(name)}`);
  },

  agreeUploadAgreement() {
    return api.put('/api/user/agreeUploadAgreement');
  },

  setShowEmpty(showEmpty) {
    return api.put('/api/user/showEmpty', { show_empty: showEmpty });
  },

  getLoginPassword() {
    return api.get('/api/user/passwordTemporary');
  },

  resetPassword(password) {
    return api.put('/api/user/passwordReset', { password });
  },

  resetToken() {
    return api.put('/api/user/resetToken');
  },

  unbindTelegram() {
    return api.delete('/api/user/telegram');
  },

  setOriginalImage(isOriginalImage) {
    return api.put('/api/user/originalImage', { is_original_image: isOriginalImage });
  },

  agreeDownAgreement() {
    return api.put('/api/user/agreeDownAgreement');
  },


  getBanList() {
    return api.get('/api/ban/list');
  },

  updateBanStatus(type, userId, reason) {
    return api.put('/api/ban/change', null, {
      params: {
        type,
        user_id: userId,
        reason
      }
    });
  }
};
