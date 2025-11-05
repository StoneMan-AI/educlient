import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // 验证用户是否存在且活跃
    const result = await pool.query(
      'SELECT id, phone, is_active FROM users WHERE id = $1',
      [decoded.userId]
    )
    
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      })
    }
    
    req.user = result.rows[0]
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      })
    }
    next(error)
  }
}

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const result = await pool.query(
        'SELECT id, phone, is_active FROM users WHERE id = $1',
        [decoded.userId]
      )
      
      if (result.rows.length > 0 && result.rows[0].is_active) {
        req.user = result.rows[0]
      }
    }
    
    next()
  } catch (error) {
    // 对于可选认证，错误时继续执行
    next()
  }
}

