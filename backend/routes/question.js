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
    const { grade_id, subject_id, knowledge_point_id, page = 1, page_size = 100, filter_s_grade } = req.query
    
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
      filter_s_grade: filter_s_grade,
      原始参数: { grade_id, subject_id, knowledge_point_id, filter_s_grade }
    })
    
    // 构建基础WHERE条件
    let baseWhere = `
      WHERE q.grade_id = $1 
        AND q.subject_id = $2 
        AND q.knowledge_point_id = $3
        AND q.status = '已发布'
    `
    
    const baseParams = [gradeId, subjectId, knowledgePointId]
    
    // 如果启用了S级典型题型筛选，添加remarks条件
    if (filter_s_grade === 'true') {
      // 筛选remarks字段包含"s"或"S"（忽略大小写和空格）
      // ILIKE是不区分大小写的LIKE，TRIM去除前后空格
      baseWhere += ` AND TRIM(q.remarks) ILIKE '%s%'`
    }
    
    // VIP用户：排除已下载的题目（如果是一键生成）
    let excludeCondition = ''
    let countParams = [...baseParams] // 用于countQuery的参数数组
    if (req.user && req.query.exclude_downloaded === 'true') {
      const paramIndex1 = countParams.length + 1
      const paramIndex2 = countParams.length + 2
      excludeCondition = ` AND q.id NOT IN (
        SELECT question_id FROM user_downloaded_questions 
        WHERE user_id = $${paramIndex1} AND knowledge_point_id = $${paramIndex2}
      )`
      countParams.push(req.user.id, knowledgePointId)
    }
    
    // 先获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM questions q
      ${baseWhere}${excludeCondition}
    `
    
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0]?.total || '0', 10)
    
    // 构建主查询的参数数组（需要重新构建excludeCondition的参数索引）
    const params = [...baseParams] // 复制基础参数数组
    let mainExcludeCondition = ''
    if (req.user && req.query.exclude_downloaded === 'true') {
      const paramIndex1 = params.length + 1
      const paramIndex2 = params.length + 2
      mainExcludeCondition = ` AND q.id NOT IN (
        SELECT question_id FROM user_downloaded_questions 
        WHERE user_id = $${paramIndex1} AND knowledge_point_id = $${paramIndex2}
      )`
      params.push(req.user.id, knowledgePointId)
    }
    
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
      ${baseWhere}${mainExcludeCondition}
    `
    
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
    
    // 检查VIP权限：只检查当前筛选条件中的年级是否有VIP权限
    const vipResult = await pool.query(
      `SELECT grade_ids FROM vip_memberships 
       WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
         AND $2 = ANY(grade_ids)`,
      [userId, parseInt(grade_id)]
    )
    
    // 获取已下载的题目（VIP用户，只针对当前知识点）
    let downloadedQuestions = []
    if (vipResult.rows.length > 0) {
      // 用户有当前年级的VIP权限，获取该知识点下已下载的题目
      const downloadedResult = await pool.query(
        `SELECT question_id FROM user_downloaded_questions 
         WHERE user_id = $1 AND knowledge_point_id = $2`,
        [userId, knowledge_point_id]
      )
      downloadedQuestions = downloadedResult.rows.map(r => r.question_id)
    }
    
    // 查询题目，排除已下载的（使用参数化查询）
    const excludeClause = downloadedQuestions.length > 0 
      ? `AND NOT (q.id = ANY($4::int[]))`
      : ''
    const queryParams = [grade_id, subject_id, knowledge_point_id]
    if (downloadedQuestions.length > 0) {
      queryParams.push(downloadedQuestions)
    }
    
    // 按难度分组查询
    const easyResult = await pool.query(
      `SELECT q.id FROM questions q
       INNER JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.grade_id = $1 AND q.subject_id = $2 AND q.knowledge_point_id = $3
         AND q.status = '已发布' AND dl.level_value = 1 ${excludeClause}
       ORDER BY RANDOM() LIMIT 8`,
      queryParams
    )
    
    const mediumResult = await pool.query(
      `SELECT q.id FROM questions q
       INNER JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.grade_id = $1 AND q.subject_id = $2 AND q.knowledge_point_id = $3
         AND q.status = '已发布' AND dl.level_value = 2 ${excludeClause}
       ORDER BY RANDOM() LIMIT 5`,
      queryParams
    )
    
    const hardResult = await pool.query(
      `SELECT q.id FROM questions q
       INNER JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.grade_id = $1 AND q.subject_id = $2 AND q.knowledge_point_id = $3
         AND q.status = '已发布' AND dl.level_value = 3 ${excludeClause}
       ORDER BY RANDOM() LIMIT 2`,
      queryParams
    )
    
    const expertResult = await pool.query(
      `SELECT q.id FROM questions q
       INNER JOIN difficulty_levels dl ON q.difficulty_id = dl.id
       WHERE q.grade_id = $1 AND q.subject_id = $2 AND q.knowledge_point_id = $3
         AND q.status = '已发布' AND dl.level_value = 4 ${excludeClause}
       ORDER BY RANDOM() LIMIT 1`,
      queryParams
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
    
    // 如果还是不足15道，检查是否可以从已下载的题目中补充
    const remainingCount = 15 - questionIds.length
    const hasDownloadedQuestions = downloadedQuestions.length > 0
    
    if (remainingCount > 0 && hasDownloadedQuestions) {
      // 返回当前找到的题目，并标记需要用户选择或补充
      return res.json({
        success: true,
        question_ids: questionIds,
        remaining_count: remainingCount,
        downloaded_count: downloadedQuestions.length,
        total_available: questionIds.length,
        message: `已排除${downloadedQuestions.length}道已下载题目，剩余可用题目${questionIds.length}道，不足15道`,
        can_supplement: true // 标记可以补充
      })
    }
    
    // 如果少于15道且是VIP用户，说明可能已全部下载
    if (questionIds.length === 0 && downloadedQuestions.length > 0) {
      return res.json({
        success: true,
        question_ids: [],
        message: '该知识点下所有题目都已下载'
      })
    }
    
    res.json({
      success: true,
      question_ids: questionIds
    })
  } catch (error) {
    next(error)
  }
})

// 补充题目（从已下载的题目中随机选择）
router.post('/supplement-questions', authenticate, async (req, res, next) => {
  try {
    const { knowledge_point_id, exclude_ids, count } = req.body
    const userId = req.user.id
    
    if (!knowledge_point_id || !Array.isArray(exclude_ids) || !count) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的参数'
      })
    }
    
    // 获取已下载的题目
    const downloadedResult = await pool.query(
      `SELECT question_id FROM user_downloaded_questions 
       WHERE user_id = $1 AND knowledge_point_id = $2
         AND NOT (question_id = ANY($3::int[]))`,
      [userId, knowledge_point_id, exclude_ids.length > 0 ? exclude_ids : [0]]
    )
    
    const downloadedQuestionIds = downloadedResult.rows.map(r => r.question_id)
    
    // 随机选择指定数量的题目
    const shuffled = downloadedQuestionIds.sort(() => Math.random() - 0.5)
    const selectedIds = shuffled.slice(0, Math.min(count, shuffled.length))
    
    res.json({
      success: true,
      question_ids: selectedIds,
      total_available: downloadedQuestionIds.length
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

    // 先获取所有选中题目的年级ID（去重）
    const questionGradesResult = await pool.query(
      `SELECT DISTINCT grade_id FROM questions WHERE id = ANY($1::int[])`,
      [question_ids]
    )
    const questionGradeIds = questionGradesResult.rows.map(row => row.grade_id).filter(id => id !== null)
    
    // 如果题目没有年级ID，则不需要VIP检查
    if (questionGradeIds.length === 0) {
      console.log('[Download] 题目没有年级ID，跳过VIP检查')
      // 继续后续流程，但不作为VIP处理
    }
    
    // 检查用户是否有VIP权限覆盖所有题目的年级
    let isVip = false
    if (questionGradeIds.length > 0) {
      const vipResult = await pool.query(
        `SELECT vm.* FROM vip_memberships vm
         WHERE vm.user_id = $1 AND vm.status = 'active' 
           AND vm.end_date >= CURRENT_DATE
           AND $2::int[] <@ vm.grade_ids`,
        [userId, questionGradeIds]
      )
      
      // 检查VIP权限是否覆盖了所有题目的年级
      // $2::int[] <@ vm.grade_ids 表示 questionGradeIds 是 vm.grade_ids 的子集
      isVip = vipResult.rows.length > 0
      
      console.log('[Download] VIP检查:', {
        userId,
        questionGradeIds,
        vipResultCount: vipResult.rows.length,
        isVip,
        vipGradeIds: vipResult.rows.map(r => r.grade_ids)
      })
    }
    
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
    
    // 改为异步生成：创建空记录并创建任务
    const { createEmptyDownloadRecord, mapDownloadRecordToResponse } = await import('../utils/downloadManager.js')
    const emptyRecord = await createEmptyDownloadRecord({
      userId,
      questionIds: question_ids,
      isVip
    })

    if (!isVip && order) {
      await pool.query(
        `UPDATE orders SET download_record_id = $1, updated_at = NOW() WHERE id = $2`,
        [emptyRecord.id, order.id]
      )
    }

    // 入队任务
    const detailRes = await pool.query(
      `SELECT q.grade_id, q.subject_id, q.knowledge_point_id 
       FROM questions q WHERE q.id = $1`,
      [question_ids[0]]
    )
    const meta = detailRes.rows[0] || {}
    await pool.query(
      `INSERT INTO generation_jobs (user_id, question_ids, grade_id, subject_id, knowledge_point_id, is_vip, download_record_id, status, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 2)`,
      [userId, question_ids, meta.grade_id || null, meta.subject_id || null, meta.knowledge_point_id || null, isVip, emptyRecord.id]
    )

    // VIP用户：将题目记录到"已拥有试题"中，避免在"一键生成试题组"时再次选择这些题目
    if (isVip && meta.knowledge_point_id) {
      try {
        // 批量插入已下载题目记录（使用 ON CONFLICT 避免重复）
        // 使用 unnest 函数批量插入数组
        await pool.query(
          `INSERT INTO user_downloaded_questions (user_id, question_id, knowledge_point_id)
           SELECT $1, unnest($2::int[]), $3
           ON CONFLICT (user_id, question_id) DO NOTHING`,
          [userId, question_ids, meta.knowledge_point_id]
        )
        
        console.log(`[Download] VIP用户 ${userId} 已记录 ${question_ids.length} 道题目到已拥有试题，知识点ID: ${meta.knowledge_point_id}`)
      } catch (error) {
        // 记录错误但不影响主流程
        console.error(`[Download] 记录已下载题目失败:`, error)
      }
    }

    res.json({
      success: true,
      need_payment: false,
      download: mapDownloadRecordToResponse(emptyRecord)
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

