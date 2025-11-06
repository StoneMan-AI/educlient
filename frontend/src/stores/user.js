import { defineStore } from 'pinia'
import { userApi } from '@/api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userInfo: null,
    vipInfo: null
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token,
    isVip: (state) => {
      if (!state.vipInfo) return false
      return state.vipInfo.is_vip_active && state.vipInfo.status === 'active'
    },
    vipGrades: (state) => {
      if (!state.vipInfo || !state.vipInfo.grade_ids) return []
      return state.vipInfo.grade_ids
    }
  },
  
  actions: {
    async login(phone, password) {
      try {
        const res = await userApi.login({ phone, password })
        this.token = res.token
        this.userInfo = res.user
        localStorage.setItem('token', res.token)
        return res
      } catch (error) {
        throw error
      }
    },
    
    async register(phone, password) {
      try {
        const res = await userApi.register({ phone, password })
        this.token = res.token
        this.userInfo = res.user
        localStorage.setItem('token', res.token)
        return res
      } catch (error) {
        throw error
      }
    },
    
    async fetchUserInfo() {
      try {
        const res = await userApi.getUserInfo()
        this.userInfo = res.user
        this.vipInfo = res.vip_info
        return res
      } catch (error) {
        throw error
      }
    },
    
    logout() {
      this.token = null
      this.userInfo = null
      this.vipInfo = null
      localStorage.removeItem('token')
    }
  }
})

