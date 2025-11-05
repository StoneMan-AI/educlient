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
      `SELECT DISTINCT kp.id, kp.name, kp.description
       FROM knowledge_points kp
       INNER JOIN questions q ON q.knowledge_point_id = kp.id
       WHERE kp.grade_id = $1 AND kp.subject_id = $2 AND kp.is_active = TRUE AND q.status = '已发布'
       ORDER BY kp.name`,
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

