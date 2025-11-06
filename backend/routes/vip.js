import express from 'express'
import { authenticate } from '../middleware/auth.js'
import pool from '../config/database.js'
import { createNativeOrder } from '../utils/wechatPayment.js'

const router = express.Router()

// 获取VIP信息
router.get('/info', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id
    
    const result = await pool.query(
      `SELECT vm.*, 
              CASE 
                WHEN vm.end_date >= CURRENT_DATE AND vm.status = 'active' THEN TRUE
                ELSE FALSE
              END as is_vip_active
       FROM vip_memberships vm
       WHERE vm.user_id = $1 AND vm.status = 'active'
       ORDER BY vm.end_date DESC`,
      [userId]
    )
    
    // 合并所有有效的VIP记录
    let combinedVip = null
    if (result.rows.length > 0) {
      const allGradeIds = []
      let earliestStart = null
      let latestEnd = null
      
      result.rows.forEach(row => {
        allGradeIds.push(...row.grade_ids)
        if (!earliestStart || row.start_date < earliestStart) {
          earliestStart = row.start_date
        }
        if (!latestEnd || row.end_date > latestEnd) {
          latestEnd = row.end_date
        }
      })
      
      combinedVip = {
        grade_ids: [...new Set(allGradeIds)],
        start_date: earliestStart,
        end_date: latestEnd,
        status: 'active',
        is_vip_active: result.rows.some(r => r.is_vip_active)
      }
    }
    
    res.json({
      success: true,
      vip_info: combinedVip
    })
  } catch (error) {
    next(error)
  }
})

// 创建VIP订单
router.post('/order', authenticate, async (req, res, next) => {
  try {
    const { grade_ids, amount } = req.body
    const userId = req.user.id
    
    if (!grade_ids || !Array.isArray(grade_ids) || grade_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择年级'
      })
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '金额无效'
      })
    }
    
    // 验证价格
    // TODO: 根据年级ID验证价格是否正确
    
    const orderNo = `VIP_${Date.now()}_${userId}`
    
    // 创建订单
    await pool.query(
      `INSERT INTO orders (user_id, order_no, type, amount, grade_ids, status)
       VALUES ($1, $2, 'vip', $3, $4, 'pending')`,
      [userId, orderNo, amount, grade_ids]
    )
    
    res.json({
      success: true,
      order_no: orderNo,
      amount
    })
  } catch (error) {
    next(error)
  }
})

// 获取支付二维码
router.get('/payment-qrcode/:orderNo', authenticate, async (req, res, next) => {
  try {
    const { orderNo } = req.params
    const userId = req.user.id
    
    // 验证订单
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_no = $1 AND user_id = $2',
      [orderNo, userId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      })
    }
    
    const order = orderResult.rows[0]
    
    if (order.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: '订单已支付'
      })
    }
    
    // 调用微信支付Native支付API生成二维码
    try {
      // 获取客户端IP，处理IPv6映射的IPv4地址
      let clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1'
      
      // 如果是IPv6映射的IPv4地址，提取IPv4部分
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '')
      }
      // 如果是从x-forwarded-for获取的，可能包含多个IP，取第一个
      if (clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim()
      }
      // 确保是有效的IPv4地址
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clientIp)) {
        clientIp = '127.0.0.1'
      }
      
      const paymentResult = await createNativeOrder({
        out_trade_no: orderNo,
        total_fee: parseFloat(order.amount),
        body: order.type === 'vip' ? 'VIP充值' : (order.type === 'view_answer' ? '查看答案' : '下载试题组'),
        spbill_create_ip: clientIp
      })
      
      if (paymentResult.success && paymentResult.code_url) {
        res.json({
          success: true,
          qr_code_url: paymentResult.code_url
        })
      } else {
        throw new Error('生成支付二维码失败')
      }
    } catch (error) {
      console.error('生成微信支付二维码失败:', error)
      
      // 如果微信支付配置未完成，返回错误提示
      if (!process.env.WECHAT_APPID || !process.env.WECHAT_MCHID || !process.env.WECHAT_KEY) {
        return res.status(500).json({
          success: false,
          message: '微信支付未配置，请联系管理员'
        })
      }
      
      return res.status(500).json({
        success: false,
        message: '生成支付二维码失败：' + (error.message || '未知错误')
      })
    }
  } catch (error) {
    next(error)
  }
})

// 查询订单状态
router.get('/order-status/:orderNo', authenticate, async (req, res, next) => {
  try {
    const { orderNo } = req.params
    const userId = req.user.id
    
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_no = $1 AND user_id = $2',
      [orderNo, userId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      })
    }
    
    const order = orderResult.rows[0]
    
    // 如果订单已支付，更新VIP状态
    if (order.status === 'paid' && order.type === 'vip' && order.grade_ids) {
      // 检查用户是否已有该年级的VIP
      const existingVip = await pool.query(
        `SELECT * FROM vip_memberships 
         WHERE user_id = $1 AND status = 'active' 
           AND grade_ids && $2::int[]`,
        [userId, order.grade_ids]
      )
      
      if (existingVip.rows.length > 0) {
        // 延长VIP时间
        const vip = existingVip.rows[0]
        const newEndDate = new Date(vip.end_date)
        newEndDate.setMonth(newEndDate.getMonth() + 1)
        
        await pool.query(
          `UPDATE vip_memberships 
           SET end_date = $1, updated_at = NOW()
           WHERE id = $2`,
          [newEndDate, vip.id]
        )
      } else {
        // 创建新的VIP记录
        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1)
        
        await pool.query(
          `INSERT INTO vip_memberships (user_id, grade_ids, start_date, end_date, status)
           VALUES ($1, $2, $3, $4, 'active')`,
          [userId, order.grade_ids, startDate, endDate]
        )
      }
      
      // 更新订单的VIP关联
      const vipResult = await pool.query(
        `SELECT id FROM vip_memberships 
         WHERE user_id = $1 AND grade_ids && $2::int[] AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [userId, order.grade_ids]
      )
      
      if (vipResult.rows.length > 0) {
        await pool.query(
          'UPDATE orders SET vip_membership_id = $1 WHERE id = $2',
          [vipResult.rows[0].id, order.id]
        )
      }
    }
    
    // 处理查看答案和下载订单
    if (order.status === 'paid') {
      if (order.type === 'view_answer' && order.question_id) {
        // 记录查看答案
        await pool.query(
          `INSERT INTO user_answer_views (user_id, question_id, is_first_view)
           VALUES ($1, $2, FALSE)
           ON CONFLICT (user_id, question_id) DO UPDATE SET is_first_view = FALSE`,
          [userId, order.question_id]
        )
      }
    }
    
    res.json({
      success: true,
      status: order.status,
      order: order
    })
  } catch (error) {
    next(error)
  }
})

// 微信支付回调（用于更新订单状态）
router.post('/payment-callback', express.raw({ type: 'application/xml' }), async (req, res, next) => {
  try {
    // TODO: 验证微信支付回调签名
    // TODO: 解析XML数据
    // TODO: 更新订单状态为paid
    
    // 返回成功响应给微信
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
  } catch (error) {
    next(error)
  }
})

export default router

