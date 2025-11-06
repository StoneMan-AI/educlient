import api from './index'

export const pricingApi = {
  // 获取所有价格配置
  getAllPricing() {
    return api.get('/pricing/all')
  },
  
  // 获取VIP价格
  getVipPrice(gradeIds) {
    const params = Array.isArray(gradeIds) 
      ? { grade_ids: gradeIds }
      : { grade_ids: [gradeIds] }
    return api.get('/pricing/vip', { params })
  }
}

