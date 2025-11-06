import express from 'express'
import { authenticate } from '../middleware/auth.js'
import pool from '../config/database.js'
import { createNativeOrder } from '../utils/wechatPayment.js'

const router = express.Router()

// 注意：支付回调路由必须在其他路由之前定义
// 因为使用了express.raw中间件处理XML数据，必须在express.json()之前处理

// 微信支付回调（用于更新订单状态）
// 注意：express.raw中间件已在server.js中为这个路径配置，这里不需要重复配置
router.post('/payment-callback', async (req, res, next) => {
  try {
    // 获取原始数据
    // express.raw中间件会将body解析为Buffer
    let xmlData = req.body
    
    // 验证数据是否存在
    if (!xmlData || (Buffer.isBuffer(xmlData) && xmlData.length === 0)) {
      console.error('收到空的回调数据')
      console.error('请求头:', JSON.stringify(req.headers))
      console.error('请求方法:', req.method)
      console.error('Content-Type:', req.headers['content-type'])
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[数据为空]]></return_msg></xml>')
    }
    
    // 如果是Buffer，转换为字符串
    if (Buffer.isBuffer(xmlData)) {
      xmlData = xmlData.toString('utf8')
    } else if (typeof xmlData === 'object' && Object.keys(xmlData).length === 0) {
      // 如果是空对象，说明express.json()已经处理过了，这是错误的
      console.error('收到空对象，可能是中间件配置问题')
      console.error('请求头 Content-Type:', req.headers['content-type'])
      console.error('请求体类型:', typeof req.body)
      console.error('请求体值:', req.body)
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[数据格式错误]]></return_msg></xml>')
    } else if (typeof xmlData === 'object') {
      // 如果是非空对象，记录日志
      console.error('收到非XML格式的回调数据:', JSON.stringify(xmlData))
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[数据格式错误]]></return_msg></xml>')
    } else {
      xmlData = String(xmlData)
    }
    
    // 清理数据：移除BOM、前后空白字符
    xmlData = xmlData.trim()
    // 移除BOM（如果存在）
    if (xmlData.charCodeAt(0) === 0xFEFF) {
      xmlData = xmlData.slice(1)
    }
    
    // 验证是否为有效的XML格式
    if (!xmlData.startsWith('<') || !xmlData.includes('xml')) {
      console.error('收到非XML格式的回调数据:', xmlData.substring(0, 200))
      console.error('数据长度:', xmlData.length)
      console.error('数据类型:', typeof xmlData)
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[数据格式错误]]></return_msg></xml>')
    }
    
    // 记录接收到的数据（仅记录前500字符，避免日志过长）
    console.log('收到微信支付回调')
    console.log('Content-Type:', req.headers['content-type'])
    console.log('数据长度:', xmlData.length)
    console.log('原始数据（前500字符）:', xmlData.substring(0, 500))
    
    // 解析XML数据
    const { parseCallbackXml, verifyPaymentCallback } = await import('../utils/wechatPayment.js')
    const callbackData = await parseCallbackXml(xmlData)
    
    console.log('解析后的回调数据:', callbackData)
    
    // 验证签名
    if (!verifyPaymentCallback(callbackData)) {
      console.error('微信支付回调签名验证失败')
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>')
    }
    
    // 检查返回码
    if (callbackData.return_code !== 'SUCCESS') {
      console.error('微信支付回调返回失败:', callbackData.return_msg)
      return res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
    }
    
    // 检查业务结果
    if (callbackData.result_code !== 'SUCCESS') {
      console.error('微信支付业务失败:', callbackData.err_code_des)
      return res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
    }
    
    const outTradeNo = callbackData.out_trade_no
    const transactionId = callbackData.transaction_id
    const totalFee = callbackData.total_fee
    
    // 查找订单
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_no = $1',
      [outTradeNo]
    )
    
    if (orderResult.rows.length === 0) {
      console.error('订单不存在:', outTradeNo)
      return res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
    }
    
    const order = orderResult.rows[0]
    
    // 如果订单已支付，直接返回成功
    if (order.status === 'paid') {
      console.log('订单已支付，跳过处理:', outTradeNo)
      return res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
    }
    
    // 更新订单状态
    await pool.query(
      `UPDATE orders 
       SET status = 'paid', 
           wechat_transaction_id = $1,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE order_no = $2`,
      [transactionId, outTradeNo]
    )
    
    console.log('订单支付成功，已更新状态:', outTradeNo)
    
    // 如果是VIP订单，处理VIP权限
    if (order.type === 'vip' && order.grade_ids) {
      const userId = order.user_id
      
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
          'UPDATE orders SET vip_membership_id = $1 WHERE order_no = $2',
          [vipResult.rows[0].id, outTradeNo]
        )
      }
    }
    
    // 如果是查看答案订单，记录查看记录
    if (order.type === 'view_answer' && order.question_id) {
      await pool.query(
        `INSERT INTO user_answer_views (user_id, question_id, is_first_view)
         VALUES ($1, $2, FALSE)
         ON CONFLICT (user_id, question_id) DO UPDATE SET is_first_view = FALSE`,
        [order.user_id, order.question_id]
      )
    }
    
    // 返回成功响应给微信
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
  } catch (error) {
    console.error('处理微信支付回调失败:', error)
    console.error('错误堆栈:', error.stack)
    
    // 如果是XML解析错误，返回FAIL让微信重试
    if (error.message && (error.message.includes('Non-whitespace') || error.message.includes('XML'))) {
      console.error('XML解析错误，可能是数据格式问题')
      // 记录原始请求信息
      console.error('请求头 Content-Type:', req.headers['content-type'])
      console.error('请求体类型:', typeof req.body)
      if (req.body) {
        if (Buffer.isBuffer(req.body)) {
          console.error('请求体（Buffer）长度:', req.body.length)
          console.error('请求体（Buffer）前100字节:', req.body.slice(0, 100).toString('utf8'))
        } else {
          console.error('请求体（字符串）长度:', String(req.body).length)
          console.error('请求体（字符串）前200字符:', String(req.body).substring(0, 200))
        }
      }
      
      // 返回FAIL，让微信稍后重试
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[XML解析失败]]></return_msg></xml>')
    }
    
    // 其他错误，返回SUCCESS避免重复回调
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
  }
})

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
    
    // 验证价格（从数据库获取正确价格）
    const { getVipPrice, validatePrice } = await import('../utils/pricing.js')
    const correctPrice = await getVipPrice(grade_ids)
    
    // 验证前端传来的价格是否正确（防止篡改）
    if (!await validatePrice('vip', amount, { gradeIds: grade_ids })) {
      return res.status(400).json({
        success: false,
        message: `价格不正确，正确价格为 ¥${correctPrice}`
      })
    }
    
    const orderNo = `VIP_${Date.now()}_${userId}`
    
    // 创建订单（使用数据库中的正确价格，而不是前端传来的价格）
    await pool.query(
      `INSERT INTO orders (user_id, order_no, type, amount, grade_ids, status)
       VALUES ($1, $2, 'vip', $3, $4, 'pending')`,
      [userId, orderNo, correctPrice, grade_ids]
    )
    
    res.json({
      success: true,
      order_no: orderNo,
      amount: correctPrice
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

export default router

