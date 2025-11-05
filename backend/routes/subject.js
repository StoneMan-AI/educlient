import express from 'express'
import pool from '../config/database.js'

const router = express.Router()

// 获取学科列表
router.get('/', async (req, res, next) => {
  try {
    const { grade_id } = req.query
    
    if (!grade_id) {
      return res.status(400).json({
        success: false,
        message: '请提供年级ID'
      })
    }
    
    // 查询该年级下的所有学科（通过题目关联）
    const result = await pool.query(
      `SELECT DISTINCT s.id, s.name, s.code 
       FROM subjects s
       INNER JOIN questions q ON q.subject_id = s.id
       WHERE q.grade_id = $1 AND q.status = '已发布'
       ORDER BY s.name`,
      [grade_id]
    )
    
    res.json({
      success: true,
      subjects: result.rows
    })
  } catch (error) {
    next(error)
  }
})

export default router

