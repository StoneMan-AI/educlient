/**
 * 价格配置
 * 根据环境变量切换测试/正式价格
 */

// 判断是否为测试环境
const isTestMode = import.meta.env.VITE_PAYMENT_MODE === 'test' || 
                   import.meta.env.MODE === 'development'

// VIP价格配置
export const vipPricing = {
  // 正式环境价格
  production: {
    combo78: 150, // 7-8-9年级组合
    combo1012: 150, // 10-11-12年级组合
    g1: 60, g2: 60, g3: 60, g4: 60,
    g5: 80, g6: 80,
    g7: 80, g8: 80, g9: 100,
    g10: 100, g11: 100, g12: 100
  },
  // 测试环境价格（统一0.01元）
  test: {
    combo78: 0.01,
    combo1012: 0.01,
    g1: 0.01, g2: 0.01, g3: 0.01, g4: 0.01,
    g5: 0.01, g6: 0.01,
    g7: 0.01, g8: 0.01, g9: 0.01,
    g10: 0.01, g11: 0.01, g12: 0.01
  }
}

// 获取当前价格配置
export const getVipPricing = () => {
  return isTestMode ? vipPricing.test : vipPricing.production
}

// 查看答案价格配置
export const answerPricing = {
  production: {
    firstView: 0.1, // 首次查看
    normal: 0.5 // 后续查看
  },
  test: {
    firstView: 0.01, // 测试环境
    normal: 0.01
  }
}

export const getAnswerPricing = () => {
  return isTestMode ? answerPricing.test : answerPricing.production
}

// 下载价格配置
export const downloadPricing = {
  production: 1.00,
  test: 0.01
}

export const getDownloadPricing = () => {
  return isTestMode ? downloadPricing.test : downloadPricing.production
}

