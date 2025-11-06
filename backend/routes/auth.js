import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

const router = express.Router()

// 注册
router.post('/register', async (req, res, next) => {
  try {
    const { phone, password } = req.body
    
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      })
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入正确的手机号'
      })
    }
    
    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      })
    }
    
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
      return res.status(404).json({
        success: false,
        message: '该手机号未注册，请先注册账号',
        code: 'USER_NOT_FOUND'
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
        message: '密码错误，请重新输入'
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

// 检查手机号是否存在（找回密码）
router.post('/check-phone', async (req, res, next) => {
  try {
    const { phone } = req.body
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '请输入手机号'
      })
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入正确的手机号'
      })
    }
    
    // 检查手机号是否已注册
    const result = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '该手机号未注册'
      })
    }
    
    res.json({
      success: true,
      message: '手机号验证成功'
    })
  } catch (error) {
    next(error)
  }
})

// 发送重置密码验证码
router.post('/send-reset-code', async (req, res, next) => {
  try {
    const { phone } = req.body
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '请输入手机号'
      })
    }
    
    // 验证手机号是否存在
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '该手机号未注册'
      })
    }
    
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 验证码有效期5分钟
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    
    // 删除该手机号的旧验证码
    await pool.query(
      'DELETE FROM reset_password_codes WHERE phone = $1',
      [phone]
    )
    
    // 存储验证码到数据库
    await pool.query(
      'INSERT INTO reset_password_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
      [phone, code, expiresAt]
    )
    
    // TODO: 调用短信服务发送验证码
    // 实际项目中应该调用短信API发送验证码
    // await sendSMS(phone, `您的验证码是：${code}，5分钟内有效`)
    
    // 开发环境：将验证码记录到日志（生产环境应移除）
    if (process.env.NODE_ENV === 'development') {
      console.log(`重置密码验证码 [${phone}]: ${code} (有效期5分钟)`)
    }
    
    res.json({
      success: true,
      message: '验证码已发送',
      // 开发环境返回验证码（生产环境应移除）
      code: process.env.NODE_ENV === 'development' ? code : undefined
    })
  } catch (error) {
    next(error)
  }
})

// 验证重置密码验证码
router.post('/verify-reset-code', async (req, res, next) => {
  try {
    const { phone, code } = req.body
    
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: '请输入手机号和验证码'
      })
    }
    
    // 从数据库验证验证码
    const result = await pool.query(
      `SELECT * FROM reset_password_codes 
       WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code]
    )
    
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '验证码错误或已过期'
      })
    }
    
    res.json({
      success: true,
      message: '验证码正确'
    })
  } catch (error) {
    next(error)
  }
})

// 重置密码
router.post('/reset-password', async (req, res, next) => {
  try {
    const { phone, code, new_password } = req.body
    
    if (!phone || !code || !new_password) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      })
    }
    
    // 验证密码长度
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      })
    }
    
    // 再次验证验证码（确保验证码未被使用）
    const codeResult = await pool.query(
      `SELECT * FROM reset_password_codes 
       WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code]
    )
    
    if (codeResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '验证码错误或已过期'
      })
    }
    
    // 查找用户
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 加密新密码
    const passwordHash = await bcrypt.hash(new_password, 10)
    
    // 更新密码
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE phone = $2',
      [passwordHash, phone]
    )
    
    // 标记验证码为已使用
    await pool.query(
      'UPDATE reset_password_codes SET used = TRUE WHERE phone = $1 AND code = $2',
      [phone, code]
    )
    
    res.json({
      success: true,
      message: '密码重置成功'
    })
  } catch (error) {
    next(error)
  }
})

export default router
