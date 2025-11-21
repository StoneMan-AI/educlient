/**
 * 价格工具函数
 * 从数据库获取价格配置，支持测试/正式环境切换
 */

import pool from '../config/database.js'

// 判断是否为测试环境
const isTestMode = process.env.PAYMENT_MODE === 'test' || 
                   process.env.NODE_ENV === 'development'

/**
 * 获取VIP价格
 * @param {number|number[]} gradeIds - 年级ID或年级ID数组
 * @param {number} durationMonths - 套餐时长（3或6个月），默认为3
 * @returns {Promise<number>} 价格（元）
 */
export async function getVipPrice(gradeIds, durationMonths = 3) {
  try {
    const testMode = isTestMode
    const duration = durationMonths || 3 // 默认为3个月
    
    // 如果是组合套餐
    if (Array.isArray(gradeIds) && gradeIds.length > 1) {
      const sortedIds = [...gradeIds].sort((a, b) => a - b)
      
      // 查询组合套餐价格（按时长）
      const result = await pool.query(
        `SELECT amount FROM pricing_config 
         WHERE config_type = 'vip' 
           AND grade_ids = $1::int[]
           AND duration_months = $2
           AND is_test_mode = $3
           AND is_active = TRUE
         ORDER BY created_at DESC LIMIT 1`,
        [sortedIds, duration, testMode]
      )
      
      if (result.rows.length > 0) {
        return parseFloat(result.rows[0].amount)
      }
    }
    
    // 单年级价格
    const gradeId = Array.isArray(gradeIds) ? gradeIds[0] : gradeIds
    
    const result = await pool.query(
      `SELECT amount FROM pricing_config 
       WHERE config_type = 'vip' 
         AND grade_id = $1
         AND duration_months = $2
         AND is_test_mode = $3
         AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [gradeId, duration, testMode]
    )
    
    if (result.rows.length > 0) {
      return parseFloat(result.rows[0].amount)
    }
    
    // 如果找不到配置，返回默认值
    console.warn(`未找到年级 ${gradeId} 的VIP价格配置（${duration}个月），使用默认值`)
    return testMode ? 0.01 : (duration === 6 ? 60.00 : 30.00)
  } catch (error) {
    console.error('获取VIP价格失败:', error)
    throw error
  }
}

/**
 * 获取查看答案价格
 * @param {boolean} isFirstView - 是否首次查看
 * @returns {Promise<number>} 价格（元）
 */
export async function getAnswerPrice(isFirstView) {
  try {
    const testMode = isTestMode
    const configKey = isFirstView ? 'answer_first_view' : 'answer_normal'
    const key = testMode ? `${configKey}_test` : configKey
    
    const result = await pool.query(
      `SELECT amount FROM pricing_config 
       WHERE config_key = $1
         AND is_active = TRUE
       LIMIT 1`,
      [key]
    )
    
    if (result.rows.length > 0) {
      return parseFloat(result.rows[0].amount)
    }
    
    // 如果找不到配置，返回默认值
    console.warn(`未找到查看答案价格配置，使用默认值`)
    return testMode ? 0.01 : (isFirstView ? 0.1 : 0.5)
  } catch (error) {
    console.error('获取查看答案价格失败:', error)
    throw error
  }
}

/**
 * 获取下载价格
 * @param {boolean} isFirstDownload - 是否首次下载
 * @returns {Promise<number>} 价格（元）
 */
export async function getDownloadPrice(isFirstDownload = false) {
  try {
    const testMode = isTestMode
    const configKey = isFirstDownload ? 'download_first' : 'download_normal'
    const key = testMode ? `${configKey}_test` : configKey
    
    const result = await pool.query(
      `SELECT amount FROM pricing_config 
       WHERE config_key = $1
         AND is_active = TRUE
       LIMIT 1`,
      [key]
    )
    
    if (result.rows.length > 0) {
      return parseFloat(result.rows[0].amount)
    }
    
    // 如果找不到配置，返回默认值
    console.warn(`未找到下载价格配置，使用默认值`)
    return testMode ? 0.01 : (isFirstDownload ? 1.00 : 3.00)
  } catch (error) {
    console.error('获取下载价格失败:', error)
    throw error
  }
}

/**
 * 验证价格是否正确
 * @param {string} type - 订单类型 ('vip', 'view_answer', 'download')
 * @param {number} amount - 前端传来的价格
 * @param {object} params - 额外参数（如gradeIds, isFirstView等）
 * @returns {Promise<boolean>} 价格是否正确
 */
export async function validatePrice(type, amount, params = {}) {
  try {
    let expectedAmount = 0
    
    if (type === 'vip') {
      expectedAmount = await getVipPrice(
        params.gradeIds || params.grade_id,
        params.durationMonths || 3
      )
    } else if (type === 'view_answer') {
      expectedAmount = await getAnswerPrice(params.isFirstView || false)
    } else if (type === 'download') {
      expectedAmount = await getDownloadPrice(params.isFirstDownload || false)
    }
    
    // 允许0.01元的误差（浮点数比较）
    return Math.abs(amount - expectedAmount) < 0.01
  } catch (error) {
    console.error('验证价格失败:', error)
    return false
  }
}

/**
 * 获取所有价格配置（用于前端显示）
 * @returns {Promise<object>} 价格配置对象
 */
export async function getAllPricing() {
  try {
    const testMode = isTestMode
    
    const result = await pool.query(
      `SELECT config_key, config_type, grade_id, grade_ids, amount, duration_months, description
       FROM pricing_config 
       WHERE is_test_mode = $1 AND is_active = TRUE AND duration_months IN (3, 6)
       ORDER BY config_type, duration_months, grade_id NULLS LAST`,
      [testMode]
    )
    
    const pricing = {
      vip: {
        '3m': {}, // 3个月套餐
        '6m': {}  // 6个月套餐
      },
      answer: {},
      download: 0
    }
    
    result.rows.forEach(row => {
      if (row.config_type === 'vip') {
        const durationKey = row.duration_months === 6 ? '6m' : '3m'
        
        if (row.grade_ids) {
          // 组合套餐
          const key = row.grade_ids.sort().join('_')
          pricing.vip[durationKey][`combo_${key}`] = parseFloat(row.amount)
        } else if (row.grade_id) {
          // 单年级（包括中考G13和高考G14）
          pricing.vip[durationKey][`grade_${row.grade_id}`] = parseFloat(row.amount)
        }
      } else if (row.config_type === 'answer') {
        if (row.config_key.includes('first_view')) {
          pricing.answer.firstView = parseFloat(row.amount)
        } else {
          pricing.answer.normal = parseFloat(row.amount)
        }
      } else if (row.config_type === 'download') {
        if (row.config_key.includes('first')) {
          pricing.download = {
            first: parseFloat(row.amount),
            normal: 0
          }
        } else if (row.config_key.includes('normal')) {
          if (!pricing.download || typeof pricing.download === 'number') {
            pricing.download = {
              first: 0,
              normal: parseFloat(row.amount)
            }
          } else {
            pricing.download.normal = parseFloat(row.amount)
          }
        }
      }
    })
    
    return pricing
  } catch (error) {
    console.error('获取所有价格配置失败:', error)
    throw error
  }
}

