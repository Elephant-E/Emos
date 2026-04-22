import api from './index.js';

export const userApi = {
  // 获取用户信息
  getInfo() {
    return api.get('/api/user');
  },

  // 签到
  sign(content) {
    const url = content ? `/api/user/sign?content=${encodeURIComponent(content)}` : '/api/user/sign';
    return api.put(url);
  },

  // 检查签到状态
  checkSign() {
    return api.get('/api/sign/check');
  },

  // 更新笔名
  updatePseudonym(name) {
    return api.put('/api/user/pseudonym', { name });
  },

  // 同意上传协议
  agreeUploadAgreement() {
    return api.put('/api/user/agreeUploadAgreement');
  },

  // 更改是否显示空媒体库
  setShowEmpty(showEmpty) {
    return api.put('/api/user/showEmpty', { show_empty: showEmpty });
  },

  // 邀请用户
  invite(inviteUserId) {
    return api.post('/api/invite', { invite_user_id: inviteUserId });
  },

  // 获取邀请信息
  getInviteInfo() {
    return api.get('/api/invite/info');
  },

  // 获取邀请历史
  getInviteHistory() {
    return api.get('/api/invite/history');
  },

  // 撤销邀请
  revokeInvite(inviteId) {
    return api.delete(`/api/invite/${inviteId}`);
  },

  // 转赠萝卜
  transferCarrot(userId, carrot) {
    return api.put('/api/carrot/transfer', { user_id: userId, carrot });
  },

  // 发红包
  createRedPacket(data) {
    return api.post('/api/redPacket/create', data);
  },

  // 获取红包领取记录
  getRedPacketRecords(redPacketId, page = 1, pageSize = 15) {
    return api.get('/api/redPacket/receive', {
      red_packet_id: redPacketId,
      page,
      page_size: pageSize
    });
  },

  // 获取登录密码（用于must_otp为true时获取动态密码）
  getLoginPassword() {
    return api.get('/api/emya/getLoginPassword');
  },

  // 重置密码
  resetPassword(password) {
    return api.put('/api/emya/resetPassword', { password });
  },

  // 重置 Token
  resetToken() {
    return api.put('/api/user/resetToken');
  },

  // 解绑 Telegram
  unbindTelegram() {
    return api.delete('/api/user/telegram');
  },

  // 设置高清海报
  setOriginalImage(isOriginalImage) {
    return api.put('/api/user/originalImage', { is_original_image: isOriginalImage });
  },

  // 同意下载协议
  agreeDownAgreement() {
    return api.put('/api/user/agreeDownAgreement');
  },

  // 兑换片单额度
  exchangeWatchSlot() {
    return api.post('/api/watch/slot');
  },

  // ==================== 封禁管理 ====================

  /**
   * 获取封禁列表（仅管理员）
   */
  getBanList() {
    return api.get('/api/ban/list');
  },

  /**
   * 更新封禁状态（仅管理员）
   * @param {string} type - 类型：disable(封禁) 或 unblock(解禁)
   * @param {string} userId - 用户ID
   * @param {string} reason - 原因
   */
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
