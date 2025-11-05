import pool from '../config/database.js'

// 检查未登录用户是否可以访问
export const checkGuestAccess = async (ip, questionId) => {
  try {
    // 查询或创建访问记录
    let result = await pool.query(
      `SELECT * FROM guest_access_logs 
       WHERE ip_address = $1 
       ORDER BY last_view_at DESC 
       LIMIT 1`,
      [ip]
    )
    
    let log = result.rows[0]
    const now = new Date()
    
    if (!log) {
      // 创建新记录
      await pool.query(
        `INSERT INTO guest_access_logs (ip_address, question_ids, view_count, last_view_at)
         VALUES ($1, ARRAY[$2], 1, $3)`,
        [ip, questionId, now]
      )
      return { allowed: true, reason: null }
    }
    
    // 检查是否被限制
    if (log.blocked_until && new Date(log.blocked_until) > now) {
      return {
        allowed: false,
        reason: '已超过3题限制，请等待3分钟后继续，或登录/注册账号'
      }
    }
    
    // 检查是否超过3题限制
    const questionIds = log.question_ids || []
    const isNewQuestion = !questionIds.includes(questionId)
    
    if (isNewQuestion && questionIds.length >= 3) {
      // 超过限制，设置阻止时间
      const blockedUntil = new Date(now.getTime() + 3 * 60 * 1000) // 3分钟后
      await pool.query(
        `UPDATE guest_access_logs 
         SET blocked_until = $1, last_view_at = $2
         WHERE ip_address = $3`,
        [blockedUntil, now, ip]
      )
      return {
        allowed: false,
        reason: '已超过3题限制，请等待3分钟后继续，或登录/注册账号'
      }
    }
    
    // 更新访问记录
    if (isNewQuestion) {
      questionIds.push(questionId)
      await pool.query(
        `UPDATE guest_access_logs 
         SET question_ids = $1, view_count = view_count + 1, last_view_at = $2
         WHERE ip_address = $3`,
        [questionIds, now, ip]
      )
    } else {
      await pool.query(
        `UPDATE guest_access_logs 
         SET last_view_at = $1
         WHERE ip_address = $2`,
        [now, ip]
      )
    }
    
    return { allowed: true, reason: null }
  } catch (error) {
    console.error('检查访客访问失败:', error)
    // 出错时允许访问，避免影响正常用户
    return { allowed: true, reason: null }
  }
}

