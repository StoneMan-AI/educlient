import express from 'express'
import pool from '../config/database.js'

const router = express.Router()

// 获取知识点列表
router.get('/', async (req, res, next) => {
  try {
    const { grade_id, subject_id } = req.query
    
    if (!grade_id || !subject_id) {
      return res.status(400).json({
        success: false,
        message: '请提供年级ID和学科ID'
      })
    }
    
    const result = await pool.query(
      `SELECT kp.id, kp.name, kp.description, kp.weight
       FROM knowledge_points kp
       WHERE kp.id IN (
         SELECT DISTINCT kp2.id
         FROM knowledge_points kp2
         INNER JOIN questions q ON q.knowledge_point_id = kp2.id
         WHERE kp2.grade_id = $1 AND kp2.subject_id = $2 AND kp2.is_active = TRUE AND q.status = '已发布'
       )
       ORDER BY kp.weight DESC NULLS LAST, kp.name ASC`,
      [grade_id, subject_id]
    )
    
    res.json({
      success: true,
      knowledge_points: result.rows
    })
  } catch (error) {
    next(error)
  }
})

export default router


// 随机按学段获取知识点
router.get('/random-by-stage', async (req, res, next) => {
  try {
    const { stage, limit = 10 } = req.query
    const n = Math.min(Math.max(parseInt(limit || '10', 10), 1), 50)
    
    let gradeCondition = ''
    if (stage === 'primary') {
      gradeCondition = 'kp.grade_id BETWEEN 1 AND 6'
    } else if (stage === 'junior') {
      gradeCondition = 'kp.grade_id BETWEEN 7 AND 9'
    } else if (stage === 'senior') {
      gradeCondition = 'kp.grade_id BETWEEN 10 AND 12'
    } else if (stage === 'zhongkao') {
      gradeCondition = 'kp.grade_id = 9'
    } else if (stage === 'gaokao') {
      gradeCondition = 'kp.grade_id = 12'
    } else {
      return res.status(400).json({
        success: false,
        message: '无效的学段参数'
      })
    }
    
    // 使用子查询先随机抽取ID，再回表取字段，避免 DISTINCT 与 ORDER BY 的冲突
    const result = await pool.query(
      `SELECT kp.id, kp.name, kp.grade_id, kp.subject_id
       FROM knowledge_points kp
       INNER JOIN (
         SELECT kp.id
         FROM knowledge_points kp
         INNER JOIN questions q ON q.knowledge_point_id = kp.id
         WHERE ${gradeCondition}
           AND kp.is_active = TRUE
           AND q.status = '已发布'
         GROUP BY kp.id
         ORDER BY RANDOM()
         LIMIT $1
       ) r ON r.id = kp.id`,
       [n]
    )
    
    res.json({
      success: true,
      knowledge_points: result.rows
    })
  } catch (error) {
    next(error)
  }
})

