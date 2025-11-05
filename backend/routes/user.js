import express from 'express'
import { authenticate } from '../middleware/auth.js'
import pool from '../config/database.js'

const router = express.Router()

// 获取用户信息
router.get('/info', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id
    
    // 获取用户基本信息
    const userResult = await pool.query(
      'SELECT id, phone, nickname, avatar_url, created_at FROM users WHERE id = $1',
      [userId]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    const user = userResult.rows[0]
    
    // 获取VIP信息
    const vipResult = await pool.query(
      `SELECT vm.*, 
              CASE 
                WHEN vm.end_date >= CURRENT_DATE AND vm.status = 'active' THEN TRUE
                ELSE FALSE
              END as is_vip_active
       FROM vip_memberships vm
       WHERE vm.user_id = $1 AND vm.status = 'active'
       ORDER BY vm.end_date DESC
       LIMIT 1`,
      [userId]
    )
    
    let vipInfo = null
    if (vipResult.rows.length > 0) {
      vipInfo = vipResult.rows[0]
    }
    
    res.json({
      success: true,
      user,
      vip_info: vipInfo
    })
  } catch (error) {
    next(error)
  }
})

// 更新用户信息
router.put('/info', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id
    const { nickname, avatar_url } = req.body
    
    const updates = []
    const values = []
    let paramCount = 1
    
    if (nickname !== undefined) {
      updates.push(`nickname = $${paramCount++}`)
      values.push(nickname)
    }
    
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`)
      values.push(avatar_url)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      })
    }
    
    values.push(userId)
    
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount} 
       RETURNING id, phone, nickname, avatar_url`,
      values
    )
    
    res.json({
      success: true,
      user: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

export default router

