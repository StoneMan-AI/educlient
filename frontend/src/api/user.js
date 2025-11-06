import api from './index'

export const userApi = {
  // 注册（不需要验证码）
  register(data) {
    return api.post('/auth/register', data)
  },
  
  // 登录
  login(data) {
    return api.post('/auth/login', data)
  },
  
  // 获取用户信息
  getUserInfo() {
    return api.get('/user/info')
  },
  
  // 更新用户信息
  updateUserInfo(data) {
    return api.put('/user/info', data)
  },
  
  // 检查手机号是否存在（找回密码）
  checkPhoneExists(phone) {
    return api.post('/auth/check-phone', { phone })
  },
  
  // 发送重置密码验证码
  sendResetPasswordCode(phone) {
    return api.post('/auth/send-reset-code', { phone })
  },
  
  // 验证重置密码验证码
  verifyResetPasswordCode(phone, code) {
    return api.post('/auth/verify-reset-code', { phone, code })
  },
  
  // 重置密码
  resetPassword(data) {
    return api.post('/auth/reset-password', data)
  }
}

