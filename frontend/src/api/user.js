import api from './index'

export const userApi = {
  // 注册
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
  }
}

