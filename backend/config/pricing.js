/**
 * 价格配置
 * 根据环境变量切换测试/正式价格
 */

// 判断是否为测试环境
const isTestMode = process.env.PAYMENT_MODE === 'test' || 
                   process.env.NODE_ENV === 'development'

// VIP价格配置（按年级ID映射）
// 注意：这里的ID是数据库中的年级ID，需要根据实际数据调整
export const vipPricing = {
  // 正式环境价格
  production: {
    // 1-4年级：60元/月
    1: 60, 2: 60, 3: 60, 4: 60,
    // 5-6年级：80元/月
    5: 80, 6: 80,
    // 7-8年级：80元/月
    7: 80, 8: 80,
    // 9年级：100元/月
    9: 100,
    // 10-12年级：100元/月
    10: 100, 11: 100, 12: 100,
    // 组合套餐
    combo789: 150, // 7-8-9年级组合
    combo101112: 150 // 10-11-12年级组合
  },
  // 测试环境价格（统一0.01元）
  test: {
    1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01,
    5: 0.01, 6: 0.01,
    7: 0.01, 8: 0.01, 9: 0.01,
    10: 0.01, 11: 0.01, 12: 0.01,
    combo789: 0.01,
    combo101112: 0.01
  }
}

// 获取VIP价格
export const getVipPrice = (gradeIds) => {
  const prices = isTestMode ? vipPricing.test : vipPricing.production
  
  // 如果是组合套餐
  if (Array.isArray(gradeIds) && gradeIds.length > 1) {
    const sortedIds = [...gradeIds].sort((a, b) => a - b)
    // 检查是否是7-8-9组合
    if (sortedIds.length === 3 && sortedIds[0] === 7 && sortedIds[1] === 8 && sortedIds[2] === 9) {
      return prices.combo789
    }
    // 检查是否是10-11-12组合
    if (sortedIds.length === 3 && sortedIds[0] === 10 && sortedIds[1] === 11 && sortedIds[2] === 12) {
      return prices.combo101112
    }
  }
  
  // 单年级价格（取第一个年级的价格）
  if (Array.isArray(gradeIds) && gradeIds.length > 0) {
    return prices[gradeIds[0]] || 0
  }
  
  return 0
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

export const getAnswerPrice = (isFirstView) => {
  const prices = isTestMode ? answerPricing.test : answerPricing.production
  return isFirstView ? prices.firstView : prices.normal
}

// 下载价格配置
export const downloadPricing = {
  production: 1.00,
  test: 0.01
}

export const getDownloadPrice = () => {
  return isTestMode ? downloadPricing.test : downloadPricing.production
}

// 导出当前模式
export const getPaymentMode = () => {
  return isTestMode ? 'test' : 'production'
}

