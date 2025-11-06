/**
 * 价格配置路由
 * 提供价格查询接口
 */

import express from 'express'
import { getAllPricing, getVipPrice, getAnswerPrice, getDownloadPrice } from '../utils/pricing.js'

const router = express.Router()

// 获取所有价格配置（前端使用）
router.get('/all', async (req, res, next) => {
  try {
    const pricing = await getAllPricing()
    
    // 转换为前端需要的格式
    const frontendPricing = {
      vip: {
        combo78: pricing.vip.combo_7_8_9 || 0,
        combo1012: pricing.vip.combo_10_11_12 || 0,
        g1: pricing.vip.grade_1 || 0,
        g2: pricing.vip.grade_2 || 0,
        g3: pricing.vip.grade_3 || 0,
        g4: pricing.vip.grade_4 || 0,
        g5: pricing.vip.grade_5 || 0,
        g6: pricing.vip.grade_6 || 0,
        g7: pricing.vip.grade_7 || 0,
        g8: pricing.vip.grade_8 || 0,
        g9: pricing.vip.grade_9 || 0,
        g10: pricing.vip.grade_10 || 0,
        g11: pricing.vip.grade_11 || 0,
        g12: pricing.vip.grade_12 || 0
      },
      answer: pricing.answer,
      download: pricing.download
    }
    
    res.json({
      success: true,
      pricing: frontendPricing
    })
  } catch (error) {
    next(error)
  }
})

// 获取VIP价格（带验证）
router.get('/vip', async (req, res, next) => {
  try {
    const { grade_ids } = req.query
    
    if (!grade_ids) {
      return res.status(400).json({
        success: false,
        message: '缺少年级ID参数'
      })
    }
    
    const gradeIdsArray = Array.isArray(grade_ids) 
      ? grade_ids.map(id => parseInt(id))
      : [parseInt(grade_ids)]
    
    const price = await getVipPrice(gradeIdsArray)
    
    res.json({
      success: true,
      price: price,
      grade_ids: gradeIdsArray
    })
  } catch (error) {
    next(error)
  }
})

export default router

