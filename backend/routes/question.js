import express from 'express'
import { authenticate, optionalAuth } from '../middleware/auth.js'
import { guestQuestionLimit } from '../middleware/rateLimit.js'
import { checkGuestAccess } from '../utils/guestAccess.js'
import pool from '../config/database.js'

const router = express.Router()

// 获取题型列表
router.get('/types', optionalAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name 
       FROM question_types 
       ORDER BY id`
    )
    res.json({
      success: true,
      question_types: result.rows
    })
  } catch (error) {
    next(error)
  }
})

// 获取难度列表
router.get('/difficulties', optionalAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, level_value 
       FROM difficulty_levels 
       ORDER BY level_value`
    )
    res.json({
      success: true,
      difficulty_levels: result.rows
    })
  } catch (error) {
    next(error)
  }
})

// 查询试题
router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const { grade_id, subject_id, knowledge_point_id, page = 1, page_size = 100 } = req.query
    
    if (!grade_id || !subject_id || !knowledge_point_id) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的查询条件'
      })
    }
    
    // 转换为整数，确保类型匹配
    const gradeId = parseInt(grade_id)
    const subjectId = parseInt(subject_id)
    const knowledgePointId = parseInt(knowledge_point_id)
    
    // 调试日志（生产环境可移除）
    console.log('查询试题参数:', {
      grade_id: gradeId,
      subject_id: subjectId,
      knowledge_point_id: knowledgePointId,
      原始参数: { grade_id, subject_id, knowledge_point_id }
    })
    
    // 构建基础WHERE条件
    const baseWhere = `
      WHERE q.grade_id = $1 
        AND q.subject_id = $2 
        AND q.knowledge_point_id = $3
        AND q.status = '已发布'
    `
    
    const baseParams = [gradeId, subjectId, knowledgePointId]
    
    // VIP用户：排除已下载的题目（如果是一键生成）
    let excludeCondition = ''
    if (req.user && req.query.exclude_downloaded === 'true') {
      excludeCondition = ` AND q.id NOT IN (
        SELECT question_id FROM user_downloaded_questions 
        WHERE user_id = $${baseParams.length + 1} AND knowledge_point_id = $${baseParams.length + 2}
      )`
      baseParams.push(req.user.id, knowledgePointId)
    }
    
    // 先获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM questions q
      ${baseWhere}${excludeCondition}
    `
    
    const countResult = await pool.query(countQuery, baseParams)
    const total = parseInt(countResult.rows[0]?.total || '0', 10)
    
    // 构建主查询（获取题目详情）
    let query = `
      SELECT q.*, 
             s.name as subject_name,
             g.name as grade_name,
             kp.name as knowledge_point_name,
             qt.name as question_type_name,
             dl.name as difficulty_name,
             dl.level_value as difficulty_level
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN grades g ON q.grade_id = g.id
      LEFT JOIN knowledge_points kp ON q.knowledge_point_id = kp.id
      LEFT JOIN question_types qt ON q.question_type_id = qt.id
      LEFT JOIN difficulty_levels dl ON q.difficulty_id = dl.id
      ${baseWhere}${excludeCondition}
    `
    
    const params = [...baseParams] // 复制参数数组
    
    // 处理排序参数
    const sortBy = req.query.sort_by || 'created_at_desc'
    let orderBy = 'q.created_at DESC' // 默认按最新上传时间排序
    
    switch (sortBy) {
      case 'created_at_desc':
        orderBy = 'q.created_at DESC'
        break
      case 'created_at_asc':
        orderBy = 'q.created_at ASC'
        break
      case 'download_count_desc':
        // 按下载量降序（需要统计下载量）
        orderBy = `(
          SELECT COUNT(*) FROM user_downloaded_questions 
          WHERE question_id = q.id
        ) DESC, q.created_at DESC`
        break
      case 'download_count_asc':
        // 按下载量升序
        orderBy = `(
          SELECT COUNT(*) FROM user_downloaded_questions 
          WHERE question_id = q.id
        ) ASC, q.created_at DESC`
        break
      default:
        orderBy = 'q.created_at DESC'
    }
    
    // 继续构建查询语句（添加ORDER BY和分页）
    query += ` ORDER BY ${orderBy}`
    
    // 获取分页数据
    const offset = (parseInt(page) - 1) * parseInt(page_size)
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(page_size), offset)
    
    const result = await pool.query(query, params)
    
    // 调试日志
    console.log('查询结果:', {
      total: total,
      total_type: typeof total,
      questions_count: result.rows.length,
      count_result: countResult.rows[0],
      params: params
    })
    
    // 如果查询结果为0，尝试不限制status查询（仅用于调试）
    if (total === 0) {
      console.log('未找到已发布题目，尝试查询所有状态的题目...')
      const debugQuery = `
        SELECT q.*, q.status,
               s.name as subject_name,
               g.name as grade_name,
               kp.name as knowledge_point_name
        FROM questions q
        LEFT JOIN subjects s ON q.subject_id = s.id
        LEFT JOIN grades g ON q.grade_id = g.id
        LEFT JOIN knowledge_points kp ON q.knowledge_point_id = kp.id
        WHERE q.grade_id = $1 
          AND q.subject_id = $2 
          AND q.knowledge_point_id = $3
        LIMIT 5
      `
      const debugResult = await pool.query(debugQuery, params)
      if (debugResult.rows.length > 0) {
        console.log('找到题目但状态不是"已发布":', debugResult.rows.map(r => ({
          id: r.id,
          status: r.status,
          grade_id: r.grade_id,
          subject_id: r.subject_id,
          knowledge_point_id: r.knowledge_point_id
        })))
        console.log('提示：需要将题目状态改为"已发布"才能查询到')
      } else {
        console.log('未找到任何匹配的题目')
        // 检查是否有其他状态的题目
        const statusQuery = `
          SELECT status, COUNT(*) as count
          FROM questions
          WHERE grade_id = $1 AND subject_id = $2 AND knowledge_point_id = $3
          GROUP BY status
        `
        const statusResult = await pool.query(statusQuery, params)
        if (statusResult.rows.length > 0) {
          console.log('各状态题目数量:', statusResult.rows)
        } else {
          console.log('该条件下确实没有题目数据')
        }
      }
    }
    
    res.json({
      success: true,
      questions: result.rows,
      total,
      page: parseInt(page),
      page_size: parseInt(page_size)
    })
  } catch (error) {
    console.error('查询试题错误:', error)
    next(error)
  }
})

// 获取试题详情
router.get('/:id', optionalAuth, guestQuestionLimit, async (req, res, next) => {
  try {
    const questionId = req.params.id
    const ip = req.ip || req.connection.remoteAddress
    
    // 未登录用户检查访问限制
    if (!req.user) {
      const accessCheck = await checkGuestAccess(ip, parseInt(questionId))
      if (!accessCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: accessCheck.reason
        })
      }
    }
    
    const result = await pool.query(
      `SELECT q.*, 
              s.name as subject_name, s.code as subject_code,
              g.name as grade_name, g.code as grade_code,
              kp.name as knowledge_point_name,
              qt.name as question_type_name,
              dl.name as difficulty_name,
              dl.level_value as difficulty_level
       FROM questions q
       LEFT JOIN subjects s ON q.subject_id = s.id
       LEFT JOIN grades g ON q.grade_id = g.id
       LEFT JOIN knowledge_points kp ON q.knowledge_point_id = kp.id
       LEFT JOIN question_types qt ON q.question_type_id = qt.id
       LEFT JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.id = $1 AND q.status = '已发布'`,
      [questionId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '试题不存在'
      })
    }
    
    res.json({
      success: true,
      question: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// 查看答案
router.post('/:id/view-answer', authenticate, async (req, res, next) => {
  try {
    const questionId = req.params.id
    const userId = req.user.id
    
    // 检查是否是VIP用户
    const vipResult = await pool.query(
      `SELECT vm.* FROM vip_memberships vm
       INNER JOIN questions q ON q.grade_id = ANY(vm.grade_ids)
       WHERE vm.user_id = $1 AND vm.status = 'active' 
         AND vm.end_date >= CURRENT_DATE
         AND q.id = $2`,
      [userId, questionId]
    )
    
    if (vipResult.rows.length > 0) {
      // VIP用户直接返回答案
      const questionResult = await pool.query(
        'SELECT answer_image_url FROM questions WHERE id = $1',
        [questionId]
      )
      
      return res.json({
        success: true,
        need_payment: false,
        answer_url: questionResult.rows[0]?.answer_image_url
      })
    }
    
    // 非VIP用户，检查是否已查看过答案
    const paidQuestionResult = await pool.query(
      `SELECT id FROM orders
       WHERE user_id = $1 AND question_id = $2 AND type = 'view_answer' AND status = 'paid'
       ORDER BY paid_at DESC LIMIT 1`,
      [userId, questionId]
    )
    
    if (paidQuestionResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO user_answer_views (user_id, question_id, viewed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, question_id) DO UPDATE
           SET viewed_at = NOW()`,
        [userId, questionId]
      )
      
      const questionResult = await pool.query(
        'SELECT answer_image_url FROM questions WHERE id = $1',
        [questionId]
      )
      
      return res.json({
        success: true,
        need_payment: false,
        answer_url: questionResult.rows[0]?.answer_image_url
      })
    }
    
    const paidHistoryResult = await pool.query(
      `SELECT 1 FROM orders 
       WHERE user_id = $1 AND type = 'view_answer' AND status = 'paid'
       LIMIT 1`,
      [userId]
    )
    const isFirstPurchase = paidHistoryResult.rows.length === 0
    
    // 需要创建支付订单
    // 从数据库获取价格
    const { getAnswerPrice } = await import('../utils/pricing.js')
    const amount = await getAnswerPrice(isFirstPurchase)
    const orderNo = `ANSWER_${Date.now()}_${userId}_${questionId}`
    
    await pool.query(
      `INSERT INTO orders (user_id, order_no, type, amount, question_id, status)
       VALUES ($1, $2, 'view_answer', $3, $4, 'pending')`,
      [userId, orderNo, amount, questionId]
    )
    
    res.json({
      success: true,
      need_payment: true,
      order_no: orderNo,
      amount
    })
  } catch (error) {
    next(error)
  }
})

// 一键生成试题组
router.post('/generate-group', authenticate, async (req, res, next) => {
  try {
    const { grade_id, subject_id, knowledge_point_id } = req.body
    const userId = req.user.id
    
    if (!grade_id || !subject_id || !knowledge_point_id) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的查询条件'
      })
    }
    
    // 检查VIP权限
    const vipResult = await pool.query(
      `SELECT grade_ids FROM vip_memberships 
       WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE`,
      [userId]
    )
    
    const vipGrades = vipResult.rows.length > 0 ? vipResult.rows[0].grade_ids : []
    
    // 获取已下载的题目（VIP用户）
    let downloadedQuestions = []
    if (vipGrades.includes(parseInt(grade_id))) {
      const downloadedResult = await pool.query(
        `SELECT question_id FROM user_downloaded_questions 
         WHERE user_id = $1 AND knowledge_point_id = $2`,
        [userId, knowledge_point_id]
      )
      downloadedQuestions = downloadedResult.rows.map(r => r.question_id)
    }
    
    // 查询题目，排除已下载的
    const excludeClause = downloadedQuestions.length > 0 
      ? `AND q.id NOT IN (${downloadedQuestions.join(',')})`
      : ''
    
    // 按难度分组查询
    const easyResult = await pool.query(
      `SELECT q.id FROM questions q
       INNER JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.grade_id = $1 AND q.subject_id = $2 AND q.knowledge_point_id = $3
         AND q.status = '已发布' AND dl.level_value = 1 ${excludeClause}
       ORDER BY RANDOM() LIMIT 8`,
      [grade_id, subject_id, knowledge_point_id]
    )
    
    const mediumResult = await pool.query(
      `SELECT q.id FROM questions q
       INNER JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.grade_id = $1 AND q.subject_id = $2 AND q.knowledge_point_id = $3
         AND q.status = '已发布' AND dl.level_value = 2 ${excludeClause}
       ORDER BY RANDOM() LIMIT 5`,
      [grade_id, subject_id, knowledge_point_id]
    )
    
    const hardResult = await pool.query(
      `SELECT q.id FROM questions q
       INNER JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.grade_id = $1 AND q.subject_id = $2 AND q.knowledge_point_id = $3
         AND q.status = '已发布' AND dl.level_value = 3 ${excludeClause}
       ORDER BY RANDOM() LIMIT 2`,
      [grade_id, subject_id, knowledge_point_id]
    )
    
    const expertResult = await pool.query(
      `SELECT q.id FROM questions q
       INNER JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.grade_id = $1 AND q.subject_id = $2 AND q.knowledge_point_id = $3
         AND q.status = '已发布' AND dl.level_value = 4 ${excludeClause}
       ORDER BY RANDOM() LIMIT 1`,
      [grade_id, subject_id, knowledge_point_id]
    )
    
    let questionIds = [
      ...easyResult.rows.map(r => r.id),
      ...mediumResult.rows.map(r => r.id),
      ...hardResult.rows.map(r => r.id)
    ]
    
    // 如果简单题+中等题+困难题不足15道，尝试用极难题补充
    if (questionIds.length < 15 && expertResult.rows.length > 0) {
      questionIds.push(expertResult.rows[0].id)
    }
    
    // 如果还是不足15道，只返回现有的
    if (questionIds.length < 15) {
      // 如果少于15道且是VIP用户，说明可能已全部下载
      if (questionIds.length === 0 && downloadedQuestions.length > 0) {
        return res.json({
          success: true,
          question_ids: [],
          message: '该知识点下所有题目都已下载'
        })
      }
    }
    
    res.json({
      success: true,
      question_ids: questionIds
    })
  } catch (error) {
    next(error)
  }
})

// 下载试题组
router.post('/download-group', authenticate, async (req, res, next) => {
  try {
    const { question_ids, order_no } = req.body
    const userId = req.user.id
    
    if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供题目ID列表'
      })
    }
    
    if (question_ids.length > 15) {
      return res.status(400).json({
        success: false,
        message: '最多只能下载15道题'
      })
    }

    const vipResult = await pool.query(
      `SELECT vm.* FROM vip_memberships vm
       INNER JOIN questions q ON q.grade_id = ANY(vm.grade_ids)
       WHERE vm.user_id = $1 AND vm.status = 'active' 
         AND vm.end_date >= CURRENT_DATE
         AND q.id = ANY($2::int[])
       GROUP BY vm.id
       HAVING COUNT(DISTINCT q.grade_id) = COUNT(DISTINCT q.id)`,
      [userId, question_ids]
    )
    
    const isVip = vipResult.rows.length > 0
    
    let order = null
    if (!isVip) {
      if (order_no) {
        const orderResult = await pool.query(
          `SELECT * FROM orders WHERE order_no = $1 AND user_id = $2 AND type = 'download'`,
          [order_no, userId]
        )
        
        if (orderResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: '下载订单不存在，请重新发起支付'
          })
        }
        
        order = orderResult.rows[0]
        
        if (order.status !== 'paid') {
          return res.status(400).json({
            success: false,
            message: '订单尚未支付，请完成支付后再下载'
          })
        }
        
        if (order.download_record_id) {
          const { mapDownloadRecordToResponse, getDownloadRecordById } = await import('../utils/downloadManager.js')
          const record = await getDownloadRecordById(order.download_record_id)
          if (record) {
            return res.json({
              success: true,
              need_payment: false,
              download: mapDownloadRecordToResponse(record)
            })
          }
        }
      } else {
        // 检查用户是否已经有过已支付的下载订单（判断是否首次下载）
        const paidDownloadResult = await pool.query(
          `SELECT 1 FROM orders 
           WHERE user_id = $1 AND type = 'download' AND status = 'paid'
           LIMIT 1`,
          [userId]
        )
        const isFirstDownload = paidDownloadResult.rows.length === 0
        
        const { getDownloadPrice } = await import('../utils/pricing.js')
        const downloadAmount = await getDownloadPrice(isFirstDownload)
        
        const newOrderNo = `DOWNLOAD_${Date.now()}_${userId}`
        await pool.query(
          `INSERT INTO orders (user_id, order_no, type, amount, status)
           VALUES ($1, $2, 'download', $3, 'pending')`,
          [userId, newOrderNo, downloadAmount]
        )
        
        return res.status(200).json({
          success: true,
          need_payment: true,
          order_no: newOrderNo,
          amount: downloadAmount,
          is_first_download: isFirstDownload
        })
      }
    }
    
    const { generatePDF, generateAnswerPDF } = await import('../utils/pdfGenerator.js')
    const { createDownloadRecord, mapDownloadRecordToResponse } = await import('../utils/downloadManager.js')
    
    const questionPdfBuffer = await generatePDF(question_ids, userId, false)
    
    let answerPdfBuffer = null
    if (isVip) {
      const questionDetailResult = await pool.query(
        'SELECT id, knowledge_point_id FROM questions WHERE id = ANY($1::int[])',
        [question_ids]
      )
      
      for (const row of questionDetailResult.rows) {
        if (row.knowledge_point_id) {
          await pool.query(
            `INSERT INTO user_downloaded_questions (user_id, question_id, knowledge_point_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, question_id) DO NOTHING`,
            [userId, row.id, row.knowledge_point_id]
          )
        }
      }
      
      answerPdfBuffer = await generateAnswerPDF(question_ids)
    }
    
    const downloadRecord = await createDownloadRecord({
      userId,
      questionIds: question_ids,
      isVip,
      questionPdfBuffer,
      answerPdfBuffer
    })
    
    if (!isVip && order) {
      await pool.query(
        `UPDATE orders SET download_record_id = $1, updated_at = NOW() WHERE id = $2`,
        [downloadRecord.id, order.id]
      )
    }
    
    res.json({
      success: true,
      need_payment: false,
      download: mapDownloadRecordToResponse(downloadRecord)
    })
  } catch (error) {
    next(error)
  }
})

// 获取已下载的题目
router.get('/downloaded', authenticate, async (req, res, next) => {
  try {
    const { knowledge_point_id } = req.query
    const userId = req.user.id
    
    if (!knowledge_point_id) {
      return res.status(400).json({
        success: false,
        message: '请提供知识点ID'
      })
    }
    
    const result = await pool.query(
      `SELECT question_id FROM user_downloaded_questions 
       WHERE user_id = $1 AND knowledge_point_id = $2`,
      [userId, knowledge_point_id]
    )
    
    res.json({
      success: true,
      question_ids: result.rows.map(r => r.question_id)
    })
  } catch (error) {
    next(error)
  }
})

// 重置已下载题目标记
router.post('/reset-downloaded', authenticate, async (req, res, next) => {
  try {
    const { knowledge_point_id } = req.body
    const userId = req.user.id
    
    if (!knowledge_point_id) {
      return res.status(400).json({
        success: false,
        message: '请提供知识点ID'
      })
    }
    
    await pool.query(
      `DELETE FROM user_downloaded_questions 
       WHERE user_id = $1 AND knowledge_point_id = $2`,
      [userId, knowledge_point_id]
    )
    
    res.json({
      success: true,
      message: '已重置'
    })
  } catch (error) {
    next(error)
  }
})

export default router

