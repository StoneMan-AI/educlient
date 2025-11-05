import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

const router = express.Router()

// 注册
router.post('/register', async (req, res, next) => {
  try {
    const { phone, password, code } = req.body
    
    if (!phone || !password || !code) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      })
    }
    
    // TODO: 验证验证码
    // if (!validateCode(phone, code)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: '验证码错误'
    //   })
    // }
    
    // 检查手机号是否已注册
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    )
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该手机号已注册'
      })
    }
    
    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)
    
    // 创建用户
    const result = await pool.query(
      `INSERT INTO users (phone, password_hash) 
       VALUES ($1, $2) 
       RETURNING id, phone, created_at`,
      [phone, passwordHash]
    )
    
    const user = result.rows[0]
    
    // 生成token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        created_at: user.created_at
      }
    })
  } catch (error) {
    next(error)
  }
})

// 登录
router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body
    
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写手机号和密码'
      })
    }
    
    // 查找用户
    const result = await pool.query(
      'SELECT id, phone, password_hash, is_active FROM users WHERE phone = $1',
      [phone]
    )
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      })
    }
    
    const user = result.rows[0]
    
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      })
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash)
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      })
    }
    
    // 更新最后登录时间
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    )
    
    // 生成token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router

