import express from 'express'
import pool from '../config/database.js'

const router = express.Router()

// 获取年级列表
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, code FROM grades ORDER BY sort_order ASC'
    )
    
    res.json({
      success: true,
      grades: result.rows
    })
  } catch (error) {
    next(error)
  }
})

// 获取学科列表
router.get('/subjects', async (req, res, next) => {
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

// 获取知识点列表
router.get('/knowledge-points', async (req, res, next) => {
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

