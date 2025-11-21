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
    
    // 直接返回新的价格格式（包含3m和6m）
    res.json({
      success: true,
      pricing: pricing
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

